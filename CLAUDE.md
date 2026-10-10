# Business Ops Agent · repo rules

Course rules, team, and the school endpoint are in `~/dev/se373/CLAUDE.md`. Requirements and grading
are in `docs/YEU-CAU.md`; research and design direction in `docs/NGHIEN-CUU.md`.

- **Two codebases**, as the course asks: `agent/` (Python 3.12, uv, LangChain 1.x + LangGraph) and
  `app/` (TypeScript, Vite, React, pnpm).
- **Phase rule:** each phase may only use course knowledge taught by then. Before adding a capability
  (RAG, LangGraph workflow, multi-agent, MCP), check which phase it belongs to in `docs/YEU-CAU.md`.
  No `deepagents` in phase 1: it bundles subagents and a filesystem.
- **Every use case needs three things to score:** a stable demo script, a rerunnable eval, and a
  viewable trace. Build them with the feature, not after.
- **Secrets:** keys only in `.env` (gitignored); CI runs gitleaks. A leaked key costs 1 point.
- **Models:** pick by profile in `agent/models.yaml`. Tests use a scripted fake model and must never
  need a key or network.
- **Checks before commit:** `uv run ruff check . && uv run pytest` in `agent/`; `pnpm run lint &&
  pnpm run build` in `app/`. Read exit codes, don't pipe into `tail`.
- **`main` is protected** (ruleset `main`): changes land only through a pull request, after the three
  CI checks pass (secret scan, Agent, App) on a branch that is up to date with `main`. No force push,
  no deleting `main`. Required approvals are 0 until teammates are collaborators, then 1.
- **Lessons** go in `LESSONS.md`, append-only, one tagged English line each.
- Code identifiers in English; docs and comments may be Vietnamese.
