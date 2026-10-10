import json
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

from bizops.core.json_tools import JsonToolChat, step_schema


class StubInner:
    """Thay cho ChatOpenAI: trả JSON viết sẵn, ghi lại messages đã nhận."""

    def __init__(self, replies: list[dict]):
        self.replies, self.seen = list(replies), []

    def bind(self, **kwargs: Any) -> "StubInner":
        return self

    def invoke(self, messages: list) -> AIMessage:
        self.seen.append(messages)
        return AIMessage(content=json.dumps(self.replies.pop(0)))


@tool
def lookup(code: str) -> str:
    """Tra cứu mã."""
    return code


def test_json_step_becomes_tool_call_then_final_answer():
    inner = StubInner([
        {"thought": "tra mã", "action": {"tool": "lookup", "args": {"code": "A1"}}},
        {"thought": "xong", "action": {"final_answer": "A1 hợp lệ"}},
    ])
    model = JsonToolChat(inner=inner).bind_tools([lookup])
    first = model.invoke([SystemMessage("sys"), HumanMessage("tra A1")])
    assert first.tool_calls[0]["name"] == "lookup" and first.tool_calls[0]["args"] == {"code": "A1"}

    second = model.invoke([SystemMessage("sys"), HumanMessage("tra A1"), first,
                           ToolMessage("A1", tool_call_id=first.tool_calls[0]["id"], name="lookup")])
    assert second.content == "A1 hợp lệ" and not second.tool_calls

    roles = [m["role"] for m in inner.seen[1]]
    assert roles == ["system", "user", "assistant", "user"]  # không có vai "tool", xen kẽ đúng


def test_schema_has_one_branch_per_tool_plus_final_answer():
    from langchain_core.utils.function_calling import convert_to_openai_tool

    schema = step_schema([convert_to_openai_tool(lookup)])
    branches = schema["properties"]["action"]["anyOf"]
    assert [b["properties"].get("tool", {}).get("const") for b in branches] == ["lookup", None]
