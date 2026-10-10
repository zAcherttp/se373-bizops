"""Dựng agent: model theo profile + tool + skill + trace + middleware giới hạn."""

from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path

from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel

from bizops.core.models import ModelProfile, build_chat_model, get_profile, harness_middleware
from bizops.core.skills import make_load_skill_tool, render_catalog, scan_skills
from bizops.core.trace import DEFAULT_TRACE_DIR, TraceMiddleware


def build_agent(
    tools: Sequence,
    system_prompt: str,
    *,
    profile: ModelProfile | None = None,
    model: BaseChatModel | None = None,
    skills_dir: Path | None = None,
    trace_dir: Path = DEFAULT_TRACE_DIR,
    extra_middleware: Sequence = (),
):
    """Trả (agent, trace). `model` cho phép test truyền model giả thay vì dựng từ profile."""
    profile = profile or get_profile()
    skills = scan_skills(skills_dir) if skills_dir else {}
    all_tools = list(tools) + ([make_load_skill_tool(skills)] if skills else [])
    prompt = "\n\n".join(p for p in (system_prompt, render_catalog(skills)) if p)
    trace = TraceMiddleware(trace_dir, meta={"profile": profile.name, "model": profile.model})
    agent = create_agent(
        model=model or build_chat_model(profile),
        tools=all_tools,
        system_prompt=prompt,
        middleware=[trace, *harness_middleware(profile), *extra_middleware],
    )
    return agent, trace
