# tldraw alignment specification

Tracking: [#16](https://github.com/zAcherttp/se373-bizops/issues/16). Source of truth: [architecture proposal](ARCHITECTURE.md). Status: **applied and redesigned** on 2026-10-15. Open [SE373.tldr](SE373.tldr) in tldraw. The architecture remains a proposal for team review.

## Page structure (redesigned 2026-10-15)

The board is one consistent version of the proposal: **4 pages, 272 shapes, 86 bindings**. The three
earlier reference pages (Tổng Quan, Chi Tiết, Roadmap) were merged into the proposal and removed, so no
superseded version remains on the board. The pre-redesign file is in git history (commit `9d4815d`).

| Page | Content |
|---|---|
| 01 Kiến trúc | Trusted boundary: identity/API, durable request runtime, queue/lease/recovery, plugin contract, coordinator, specialists, tools, knowledge, skills, audit, trace, human control, cost ledger; policy across every boundary |
| 02 Request bền | 8-step request flow, request-state diagram, wait/escalation contract, recovery monitor, cost ledger, fault-injection acceptance, spending-approval example, amendments to the teammate's flow |
| 03 Skill & Phase | 7-step skill lifecycle with reject/rollback, P1/P2/P3 gates, K1–K8 mapping (K6 multi-agent/MCP, K7 evaluation), use-case portfolio, one merged "Cần nhóm / thầy chốt" area |
| 04 Feature map & Roadmap | 12 lanes, one per architecture node, each banded by phase P1 / P2 / P3 / tùy chọn; 83 mechanism cards tagged with phase, K area and source |

Each page has one "Đề xuất, chưa triển khai" banner and the same colour legend: blue interface and
coordination, violet trusted core, green business capability, red policy and safety, orange human
approval or open decision, grey audit, trace, cost and eval.

### What changed from the earlier feature map

- Room-wide memory → request / employee / department / company-scoped context; derivatives inherit
  the source policy.
- One-time department × tool grant and the four-layer permission model → effective scope (principal ∩
  workflow ∩ resource policy ∩ approval), checked at discovery and execution; delegation only narrows it.
- Skill flow → proposal, validation, offline eval, authorized review, versioned activation, monitoring
  and rollback. "Factory sinh agent mới" dropped: only skills are proposed.
- Approvals bound to action, version, amount and expiry, with separation of duties.
- New lanes: durable request and recovery, cost ledger and acceptance tests, package registry.
- Old "Góp ý" and "Hỏi thầy" stickies merged with ARCHITECTURE §12 into one decisions area; duplicate
  detail/roadmap cards collapsed to one card each.
- Phases follow ARCHITECTURE §8–§9: router and plan DAG move to P3 with the coordinator; skill
  validator and review move to P3 with use case E; the loader and its evals stay P1.
- Numbers carried over from the old cards (middleware order, token thresholds, quotas, approval tiers)
  stay marked "đề xuất" and have not been re-verified.

## Earlier specification (applied, then merged into the pages above)

### Frame 1 — system and trust boundaries

- Interfaces → identity/request API → durable request/workflow runtime → coordinator → department specialists.
- Specialists call authorized tools, scoped knowledge/memory and approved skill registry.
- Add scheduler/events, human question/approval controls and results/notification delivery.
- Add durable admission/queue, leases/heartbeats, recovery monitor, audit and usage/cost ledger.
- Draw policy enforcement across every boundary, not just an entrance diamond.
- Label employee/principal, executing agent, effective scope and request/run IDs as carried context. Specialist delegation may narrow authority, never expand it.
- Trusted core owns mandatory enforcement; department/connector/channel/model/retrieval packages extend explicit contracts. Plugin declaration is not a permission grant or sandbox.

### Frame 2 — durable request lifecycle

- Persist before acceptance; deduplicate inbound event IDs and preserve dispatch intents.
- Interpret → clarify, supported workflow, or unsupported/escalated outcome.
- Execute permitted steps; persist approvals before gated actions; reauthorize on resume.
- Show leases, checkpoints and watchdog recovery of stalled/abandoned attempts.
- Show operation IDs and reconciliation before retrying uncertain external actions.
- Persist result plus notification intent; failed delivery retries separately from business execution.
- Every accepted task is executing, visibly waiting with a deadline, or terminal with evidence. Failures have an assigned escalation; explicit cancellation remains recorded.
- Cost events account for every attempt, including failed/uncertain calls; estimated and invoice-confirmed totals remain distinct.

### Frame 3 — skill proposal and activation

- Repeated procedure → scoped proposal → contract/dependency/policy validation → offline eval/regression → authorized human review → versioned activation → monitoring/rollback.
- Restricted input produces restricted proposals. Public/general publication requires authorized review; a scanner or summary cannot declassify data.
- New executable tools follow code review. Unsupported tasks do not automatically generate and run skills.

## Amend the teammate's earlier flow

- Replace room-wide memory with authorized request/employee/resource context.
- Replace one-time department authorization with repeated resource/action checks.
- Keep RAG/single-specialist/multi-specialist modes and parallel dependent work.
- Bound dynamic planning, retries and model fallback; generalist fallback retains scope.
- Unknown → diagnose ambiguity/missing data/authorization/unsupported capability before any proposal.
- Split completion logging from optional scoped memory publication.
- Final verification includes business receipts and recipient access, not just schema/citations.

## Validation and review

- Unique record IDs, four pages, every arrow bound at both ends; tldraw lint clean on every page, no
  text overflow.
- Text scan: no email, student ID, API key or token.
- Team review is still required for architecture, company/use-case choices and provisional rubric
  wording.
