"""Skill dạng thư mục chứa SKILL.md có YAML frontmatter, nạp theo kiểu progressive disclosure.

System prompt chỉ chứa danh mục (tên + mô tả). Khi cần, model gọi `load_skill(name)` để đọc thân
skill. Cùng định dạng với lab của môn và với agentskills.io.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml
from langchain_core.tools import StructuredTool


class SkillError(ValueError):
    pass


@dataclass(frozen=True)
class Skill:
    name: str
    description: str
    path: Path

    @property
    def body(self) -> str:
        return split_frontmatter(self.path.read_text(encoding="utf-8"))[1]


def split_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---\n"):
        raise SkillError("SKILL.md phải bắt đầu bằng frontmatter '---'")
    head, sep, body = text[4:].partition("\n---\n")
    if not sep:
        raise SkillError("frontmatter chưa đóng bằng '---'")
    meta = yaml.safe_load(head) or {}
    if not isinstance(meta, dict):
        raise SkillError("frontmatter phải là một mapping YAML")
    return meta, body.lstrip("\n")


def scan_skills(root: Path) -> dict[str, Skill]:
    skills: dict[str, Skill] = {}
    for md in sorted(root.glob("*/SKILL.md")):
        meta, _ = split_frontmatter(md.read_text(encoding="utf-8"))
        name, desc = meta.get("name"), meta.get("description")
        if not name or not desc:
            raise SkillError(f"{md}: thiếu 'name' hoặc 'description'")
        if name in skills:
            raise SkillError(f"trùng tên skill '{name}'")
        skills[name] = Skill(name=name, description=desc, path=md)
    return skills


def render_catalog(skills: dict[str, Skill]) -> str:
    if not skills:
        return ""
    lines = ["## Skill có sẵn", "Gọi load_skill(name) để đọc hướng dẫn đầy đủ trước khi làm việc thuộc skill đó."]
    lines += [f"- {s.name}: {s.description}" for s in skills.values()]
    return "\n".join(lines)


def make_load_skill_tool(skills: dict[str, Skill]) -> StructuredTool:
    def load_skill(name: str) -> str:
        """Đọc hướng dẫn đầy đủ của một skill trong danh mục."""
        if name not in skills:
            return f"Không có skill '{name}'. Skill có sẵn: {', '.join(skills) or 'không có'}."
        return skills[name].body

    return StructuredTool.from_function(load_skill, name="load_skill")
