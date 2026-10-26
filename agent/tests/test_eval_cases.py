"""Kiểm tra cấu trúc bộ eval case (agent/evals/cases.jsonl), không chạy agent."""

import json
from collections import Counter
from pathlib import Path

import pytest

CASES_PATH = Path(__file__).resolve().parents[1] / "evals" / "cases.jsonl"

REQUIRED = {
    "id": str,
    "layer": str,
    "name": str,
    "uc": list,
    "phase": str,
    "prompt_vi": str,
    "prompt_en": str,
    "setup": str,
    "fails_if": str,
    "passes_if": str,
    "severity": str,
    "multi_turn": bool,
    "attack": bool,
    "grader": str,
    "p1": bool,
}
UC_VALUES = {"UC-01", "UC-02", "UC-09", "UC-06", "UC-08", "UC-03", "core"}
SELECTED_UCS = ["UC-01", "UC-02", "UC-09", "UC-06", "UC-08"]
PHASES = {"P1", "P2", "P3"}
SEVERITIES = {"standard", "critical"}
GRADERS = {"rule", "judge"}


def load_cases() -> list[dict]:
    lines = CASES_PATH.read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines if line.strip()]


CASES = load_cases()


def test_ids_are_unique():
    dupes = [cid for cid, n in Counter(c["id"] for c in CASES).items() if n > 1]
    assert not dupes, f"id trùng: {dupes}"


@pytest.mark.parametrize("case", CASES, ids=lambda c: c.get("id", "?"))
def test_case_fields_and_enums(case):
    assert set(case) == set(REQUIRED), f"thừa/thiếu trường: {set(case) ^ set(REQUIRED)}"
    for field, typ in REQUIRED.items():
        assert isinstance(case[field], typ), f"{field} phải là {typ.__name__}"
        if typ is str:
            assert case[field].strip(), f"{field} rỗng"
    assert case["uc"] and set(case["uc"]) <= UC_VALUES
    assert case["phase"] in PHASES
    assert case["severity"] in SEVERITIES
    assert case["grader"] in GRADERS
    if case["p1"]:
        assert case["phase"] == "P1", "case p1 phải chạy được ở P1"


def test_p1_subset_has_at_least_ten_cases():
    assert sum(c["p1"] for c in CASES) >= 10


@pytest.mark.parametrize("uc", SELECTED_UCS)
def test_each_selected_uc_has_five_cases(uc):
    assert sum(uc in c["uc"] for c in CASES) >= 5


def test_at_least_five_attack_cases():
    assert sum(c["attack"] for c in CASES) >= 5
