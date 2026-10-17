# Business Ops Agent · repo rules

Course rules, team, and the school endpoint are in `~/dev/se373/CLAUDE.md`. Requirements and grading
are in `docs/YEU-CAU.md`; research and design direction in `docs/NGHIEN-CUU.md`.

- **Current scaffold:** `agent/` is Python 3.12/uv/LangChain/LangGraph; `app/` is TypeScript/Vite/React/pnpm.
  Per the user's lecturer clarification (2026-10-17), Python and LangGraph are optional. The proposed
  target is a TypeScript agent core authored by the team; Pi Durable is reference-only, not a runtime
  dependency. This documentation change does not migrate the scaffold. See `docs/ARCHITECTURE.md`.
- **Phase rule:** each phase may only use course knowledge taught by then. Before adding a capability
  (RAG, durable workflow, multi-agent, MCP), check which phase it belongs to in `docs/YEU-CAU.md`.
  No `deepagents` in phase 1: it bundles subagents and a filesystem.
- **Every use case needs three things to score:** a stable demo script, a rerunnable eval, and a
  viewable trace. Build them with the feature, not after.
- **Secrets:** keys only in `.env` (gitignored); CI runs gitleaks. A leaked key costs 1 point.
- **Models:** pick by profile in `agent/models.yaml`. Tests use a scripted fake model and must never
  need a key or network.
- **Checks before commit:** `uv run ruff check . && uv run pytest` in `agent/`; `pnpm run lint &&
  pnpm run build` in `app/`; `pnpm run typecheck && pnpm run lint && pnpm test` in `agent/runtime/`.
  Read exit codes, don't pipe into `tail`.
- **Team workflow** is in `docs/QUY-TRINH.md`: every task is an issue on the board
  (github.com/users/zAcherttp/projects/2), milestones are the phases, every change reaches `main` through
  a PR that closes its issue (`Closes #n`).
- **`main` is protected** (ruleset `main`): PR only, **1 approving review** from someone other than the
  author, the three CI checks green (secret scan, Agent, App) on a branch up to date with `main`, squash
  merge only, branches deleted on merge. No force push, no deleting `main`.
- **Agents never push to `main`, never merge, never approve.** Branch named `<issue>-<short-name>`,
  commit, push the branch, open a PR with the template, stop. A person reviews and the author merges.
- **The repo is public:** no student IDs, school emails, phone numbers, keys or tokens in files, issues,
  PRs or commit messages.
- **Lessons** go in `LESSONS.md`, append-only, one tagged English line each.
- Code identifiers in English; docs and comments may be Vietnamese.
