from pathlib import Path

import pytest

from bizops.core.skills import SkillError, make_load_skill_tool, render_catalog, scan_skills, split_frontmatter

FIXTURES = Path(__file__).parent / "fixtures" / "skills"


def test_scan_and_catalog_holds_only_metadata():
    skills = scan_skills(FIXTURES)
    assert list(skills) == ["bao-cao-tuan"]
    catalog = render_catalog(skills)
    assert "bao-cao-tuan: Viết báo cáo tuần" in catalog
    assert "Gọi get_revenue" not in catalog  # thân skill chỉ nạp khi gọi load_skill


def test_load_skill_returns_body_and_handles_unknown_name():
    tool = make_load_skill_tool(scan_skills(FIXTURES))
    assert "Gọi get_revenue" in tool.invoke({"name": "bao-cao-tuan"})
    assert "Không có skill" in tool.invoke({"name": "khong-co"})


@pytest.mark.parametrize("text", ["# no frontmatter", "---\nname: x\n"])
def test_bad_frontmatter_is_rejected(text):
    with pytest.raises(SkillError):
        split_frontmatter(text)
