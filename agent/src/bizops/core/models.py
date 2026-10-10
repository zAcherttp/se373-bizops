"""Model factory: đọc profile từ models.yaml, dựng chat model và middleware harness tương ứng."""

from __future__ import annotations

import os
import socket
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import yaml
from langchain.agents.middleware import ModelCallLimitMiddleware, ToolCallLimitMiddleware
from langchain_core.language_models import BaseChatModel

from bizops.core.json_tools import JsonToolChat

MODELS_FILE = Path(__file__).resolve().parents[3] / "models.yaml"
UIT_HOST = "llm.uit.edu.vn"


@dataclass(frozen=True)
class ModelProfile:
    name: str
    provider: Literal["anthropic", "deepseek", "openai", "uit"]
    model: str
    harness: Literal["strong", "weak"]
    endpoint: str | None = None
    extra_body: dict = field(default_factory=dict)


def load_config(path: Path = MODELS_FILE) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def get_profile(name: str | None = None, path: Path = MODELS_FILE) -> ModelProfile:
    cfg = load_config(path)
    name = name or os.getenv("BIZOPS_PROFILE") or cfg["default"]
    if name not in cfg["profiles"]:
        raise KeyError(f"không có profile '{name}'; có: {', '.join(cfg['profiles'])}")
    return ModelProfile(name=name, **cfg["profiles"][name])


def _pin_uit_dns() -> None:
    """Máy dùng DNS công cộng thì host của trường phân giải ra IP public, mà IP public trả 302.
    Đặt UIT_RESOLVE_IP (IP nội bộ từ DNS của trường) để riêng tiến trình này phân giải khác,
    không đụng DNS hệ thống."""
    ip = os.getenv("UIT_RESOLVE_IP")
    if not ip or getattr(socket, "_bizops_pinned", False):
        return
    original = socket.getaddrinfo

    def getaddrinfo(host: str, *args: Any, **kwargs: Any):
        return original(ip if host == UIT_HOST else host, *args, **kwargs)

    socket.getaddrinfo = getaddrinfo
    socket._bizops_pinned = True  # type: ignore[attr-defined]


def build_chat_model(profile: ModelProfile) -> BaseChatModel:
    if profile.provider == "uit":
        from langchain_openai import ChatOpenAI

        _pin_uit_dns()
        inner = ChatOpenAI(
            base_url=f"https://{UIT_HOST}/{profile.endpoint}/v1",
            api_key=os.environ["UIT_LLM_API_KEY"],
            model=profile.model,
            temperature=0,
            max_tokens=800,
            timeout=120,
            max_retries=2,
            extra_body=profile.extra_body or None,
        )
        return JsonToolChat(inner=inner)

    from langchain.chat_models import init_chat_model

    return init_chat_model(f"{profile.provider}:{profile.model}", timeout=120, max_retries=2)


def harness_middleware(profile: ModelProfile, path: Path = MODELS_FILE) -> list:
    """Middleware giới hạn theo kiểu harness của profile."""
    limits = load_config(path)["harness"][profile.harness]
    return [
        ModelCallLimitMiddleware(run_limit=limits["model_call_limit"], exit_behavior="end"),
        ToolCallLimitMiddleware(run_limit=limits["tool_call_limit"]),
    ]
