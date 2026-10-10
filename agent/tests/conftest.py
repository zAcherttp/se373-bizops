from __future__ import annotations

from typing import Any

import pytest
from langchain_core.language_models import GenericFakeChatModel
from langchain_core.messages import AIMessage


class ScriptedModel(GenericFakeChatModel):
    """Model giả trả lần lượt các AIMessage viết sẵn; bỏ qua tool được bind."""

    def bind_tools(self, tools: Any, **kwargs: Any) -> ScriptedModel:
        return self


def call(tool_name: str, i: int, **args: Any) -> AIMessage:
    return AIMessage(content="", tool_calls=[{"name": tool_name, "args": args, "id": f"c{i}", "type": "tool_call"}])


@pytest.fixture
def scripted():
    def make(*messages: AIMessage) -> ScriptedModel:
        return ScriptedModel(messages=iter(messages))

    return make
