from pathlib import Path

from langchain_core.messages import AIMessage
from langchain_core.tools import tool

from bizops.agent import build_agent
from bizops.core.models import get_profile
from bizops.core.trace import read_trace
from tests.conftest import call

FIXTURES = Path(__file__).parent / "fixtures" / "skills"


@tool
def get_revenue(week: int) -> dict:
    """Doanh thu của một tuần."""
    return {"week": week, "revenue": 120_000_000}


@tool
def get_target(week: int) -> dict:
    """Chỉ tiêu doanh thu của một tuần."""
    return {"week": week, "target": 100_000_000}


def test_agent_loop_with_two_tools_one_skill_and_jsonl_trace(scripted, tmp_path):
    model = scripted(
        call("load_skill", 1, name="bao-cao-tuan"),
        call("get_revenue", 2, week=41),
        call("get_target", 3, week=41),
        AIMessage(content="Tuần 41: 120 triệu, vượt chỉ tiêu 20%."),
    )
    agent, trace = build_agent(
        [get_revenue, get_target], "Bạn là trợ lý báo cáo.",
        profile=get_profile("haiku"), model=model, skills_dir=FIXTURES, trace_dir=tmp_path,
    )
    out = agent.invoke({"messages": [{"role": "user", "content": "báo cáo tuần 41"}]})
    assert "vượt chỉ tiêu" in out["messages"][-1].content

    events = read_trace(trace.path)
    kinds = [e["event"] for e in events]
    assert kinds[0] == "run_start" and kinds[-1] == "run_end"
    assert kinds.count("model") == 4
    assert [e["name"] for e in events if e["event"] == "tool"] == ["load_skill", "get_revenue", "get_target"]
    assert all(e["profile"] == "haiku" for e in events if e["event"] == "run_start")
