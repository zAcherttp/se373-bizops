import pytest

from bizops.core.json_tools import JsonToolChat
from bizops.core.models import build_chat_model, get_profile, harness_middleware, load_config


def test_every_profile_loads():
    cfg = load_config()
    for name in cfg["profiles"]:
        p = get_profile(name)
        assert p.harness in cfg["harness"]


def test_uit_profile_wraps_json_tool_protocol(monkeypatch):
    monkeypatch.setenv("UIT_LLM_API_KEY", "test-not-a-real-key")
    monkeypatch.delenv("UIT_RESOLVE_IP", raising=False)
    model = build_chat_model(get_profile("gemma-uit"))  # không gọi mạng khi khởi tạo
    assert isinstance(model, JsonToolChat)


def test_weak_harness_is_tighter_than_strong():
    strong = harness_middleware(get_profile("haiku"))[0]
    weak = harness_middleware(get_profile("gemma-uit"))[0]
    assert weak.run_limit < strong.run_limit


def test_unknown_profile_is_an_error():
    with pytest.raises(KeyError):
        get_profile("khong-co")
