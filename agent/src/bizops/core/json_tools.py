"""Giao thức gọi tool bằng JSON cho model không có tool calling native.

Endpoint LLM của trường (vLLM) không bật tool-call parser: mọi `tool_choice` đều bị từ chối, nhưng
structured output (`json_schema`) thì chạy. Harness tự cài giao thức gọi tool:

    model sinh đúng một JSON  {"thought": ..., "action": <tool call | final_answer>}
    `action` là anyOf, mỗi tool một nhánh với schema tham số riêng  → server ép ngữ pháp khi sinh
    JsonToolChat đổi JSON đó thành AIMessage.tool_calls              → create_agent chạy như thường

Chuyển từ BTVN-03 (zAcherttp/se373-flight-booking, `mo_hinh.py`).
"""

from __future__ import annotations

import json
import time
from typing import Any

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.utils.function_calling import convert_to_openai_tool
from openai import LengthFinishReasonError
from pydantic import ConfigDict

PROTOCOL = """
## Cách trả lời
Mỗi lượt trả về đúng một JSON:
{"thought": "<một câu: đang ở đâu, định làm gì>", "action": <một trong hai>}
- gọi tool:  {"tool": "<tên>", "args": {...}}
- kết thúc:  {"final_answer": "<câu trả lời cho người dùng>"}
Mỗi lượt chỉ gọi một tool. Kết quả tool sẽ được gửi lại ở lượt sau.

## Tool
"""

# JSON hợp lệ của model không bao giờ có dòng trống. Sinh có ràng buộc ngữ pháp đôi khi kẹt vào
# vòng khoảng trắng tới hết max_tokens, nên dừng sớm khi gặp dòng trống. Server nhận tối đa 4 chuỗi;
# Qwen thụt lề 4 dấu cách, nên chuỗi dấu cách phải đủ dài để không cắt nhầm JSON hợp lệ.
WHITESPACE_STOPS = ["\n  \n", "\n\n\n", " " * 40, "\t\t\t"]


class ModelProtocolError(RuntimeError):
    """Model không tuân được giao thức JSON sau mọi lần thử. Harness ghi thành một kiểu dừng."""


def step_schema(tools: list[dict]) -> dict:
    branches = [
        {
            "type": "object",
            "properties": {
                "tool": {"const": t["function"]["name"]},
                "args": t["function"]["parameters"],
            },
            "required": ["tool", "args"],
            "additionalProperties": False,
        }
        for t in tools
    ]
    branches.append(
        {
            "type": "object",
            "properties": {"final_answer": {"type": "string"}},
            "required": ["final_answer"],
            "additionalProperties": False,
        }
    )
    return {
        "type": "object",
        "properties": {"thought": {"type": "string"}, "action": {"anyOf": branches}},
        "required": ["thought", "action"],
        "additionalProperties": False,
    }


def _describe_tools(tools: list[dict]) -> str:
    lines = []
    for t in tools:
        f = t["function"]
        params = ", ".join(
            f"{k}: {v.get('type', 'any')}" for k, v in f["parameters"].get("properties", {}).items()
        )
        lines.append(f"- {f['name']}({params}): {f['description']}")
    return "\n".join(lines)


def call_json(llm: Any, schema: dict, name: str, messages: list, retries: tuple = (None, 0.3, 0.6)) -> tuple[Any, dict]:
    """Một lời gọi structured output, có thử lại khi JSON hỏng. Trả (response, dữ liệu đã parse)."""
    response_format = {"type": "json_schema", "json_schema": {"name": name, "schema": schema, "strict": True}}
    last_error: Exception | None = None
    for temperature in retries:
        kwargs: dict[str, Any] = {"response_format": response_format, "stop": WHITESPACE_STOPS}
        if temperature is not None:
            kwargs["temperature"] = temperature
        try:
            res = llm.bind(**kwargs).invoke(messages)
            return res, json.loads(res.content)
        except (json.JSONDecodeError, LengthFinishReasonError) as e:
            last_error = e
    raise ModelProtocolError(f"không sinh được JSON hợp lệ sau {len(retries)} lần: {str(last_error)[:160]}")


class JsonToolChat(BaseChatModel):
    """Bọc một chat model chỉ có structured output thành model 'biết gọi tool'."""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    inner: Any
    tools_oa: list = []

    @property
    def _llm_type(self) -> str:
        return "json-tool-protocol"

    def bind_tools(self, tools: Any, **kwargs: Any) -> JsonToolChat:
        return JsonToolChat(inner=self.inner, tools_oa=[convert_to_openai_tool(t) for t in tools])

    def rewrite(self, messages: list[BaseMessage]) -> list[dict]:
        """Chat template của server chặt: vai trò phải xen kẽ, không có vai "tool".
        Lịch sử được viết lại thành system + user/assistant xen kẽ."""
        system, turns = [], []

        def add(role: str, content: str) -> None:
            if turns and turns[-1]["role"] == role:
                turns[-1]["content"] += "\n\n" + content
            else:
                turns.append({"role": role, "content": content})

        for m in messages:
            if isinstance(m, SystemMessage):
                system.append(str(m.content))
            elif isinstance(m, HumanMessage):
                add("user", str(m.content))
            elif isinstance(m, AIMessage):
                step = m.additional_kwargs.get("json_step") or {
                    "thought": "",
                    "action": {"final_answer": str(m.content)},
                }
                add("assistant", json.dumps(step, ensure_ascii=False))
            elif isinstance(m, ToolMessage):
                add("user", f"KẾT QUẢ TOOL {m.name} ({m.tool_call_id}):\n{m.content}")
        if self.tools_oa:
            system.append(PROTOCOL + _describe_tools(self.tools_oa))
        return [{"role": "system", "content": "\n\n".join(system)}] + turns

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        t0 = time.time()
        res, step = call_json(self.inner, step_schema(self.tools_oa), "step", self.rewrite(messages))
        action = step["action"]
        meta = {"json_step": step, "seconds": round(time.time() - t0, 2)}
        if "final_answer" in action:
            ai = AIMessage(content=action["final_answer"], additional_kwargs=meta)
        else:
            n = sum(1 for m in messages if isinstance(m, AIMessage)) + 1
            ai = AIMessage(
                content=step["thought"],
                additional_kwargs=meta,
                tool_calls=[{"name": action["tool"], "args": action["args"], "id": f"call_{n}", "type": "tool_call"}],
            )
        ai.usage_metadata = getattr(res, "usage_metadata", None)
        return ChatResult(generations=[ChatGeneration(message=ai)])
