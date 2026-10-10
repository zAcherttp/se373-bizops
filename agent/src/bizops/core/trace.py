"""Trace từng bước ra JSONL: mỗi lần chạy một file, mỗi dòng một sự kiện.

Sự kiện: run_start, model (đầu ra, tool_calls, token, độ trễ), tool (tên, tham số, kết quả, độ trễ),
run_end. Eval và trình xem trace đọc lại đúng file này.
"""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from langchain.agents.middleware import AgentMiddleware

DEFAULT_TRACE_DIR = Path(__file__).resolve().parents[3] / "traces"


class TraceMiddleware(AgentMiddleware):
    def __init__(self, trace_dir: Path = DEFAULT_TRACE_DIR, run_id: str | None = None, meta: dict | None = None):
        super().__init__()
        self.run_id = run_id or f"{datetime.now():%Y%m%d-%H%M%S}_{uuid.uuid4().hex[:8]}"
        trace_dir.mkdir(parents=True, exist_ok=True)
        self.path = trace_dir / f"{self.run_id}.jsonl"
        self.meta = meta or {}
        self._step = 0

    def emit(self, event: str, **data: Any) -> None:
        row = {"ts": round(time.time(), 3), "run_id": self.run_id, "step": self._step, "event": event, **data}
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")

    def before_agent(self, state, runtime) -> None:
        first = state["messages"][-1] if state.get("messages") else None
        self.emit("run_start", input=getattr(first, "content", None), **self.meta)

    def wrap_model_call(self, request, handler):
        self._step += 1
        t0 = time.time()
        response = handler(request)
        msgs = response if isinstance(response, list) else getattr(response, "result", None) or [response]
        ai = msgs[-1] if msgs else None
        self.emit(
            "model",
            seconds=round(time.time() - t0, 3),
            content=getattr(ai, "content", None),
            tool_calls=[{"name": c["name"], "args": c["args"]} for c in (getattr(ai, "tool_calls", None) or [])],
            usage=getattr(ai, "usage_metadata", None),
        )
        return response

    def wrap_tool_call(self, request, handler):
        call = request.tool_call
        t0 = time.time()
        result = handler(request)
        self.emit(
            "tool",
            seconds=round(time.time() - t0, 3),
            name=call["name"],
            args=call["args"],
            result=str(getattr(result, "content", result))[:2000],
        )
        return result

    def after_agent(self, state, runtime) -> None:
        last = state["messages"][-1] if state.get("messages") else None
        self.emit("run_end", output=getattr(last, "content", None))


def read_trace(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
