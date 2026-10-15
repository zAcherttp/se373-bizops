# tldraw alignment specification

Tracking: [#16](https://github.com/zAcherttp/se373-bizops/issues/16). Source of truth: [architecture proposal](ARCHITECTURE.md). Status: **applied to the uploaded original board** on 2026-10-15. Open [SE373.tldr](SE373.tldr) in tldraw. The architecture remains a proposal for team review.

## Applied page structure

The original had 562 records: three pages, 449 shapes, 108 bindings, one user and one document. All original shapes, bindings, user and document records are preserved unchanged. Original page IDs are preserved; names/order now mark them as reference material. Added 107 records for three proposal pages, native editable shapes/connectors and reference banners (669 records total).

| Current proposal | Preserved earlier page |
|---|---|
| 01 Kiến trúc | Tham khảo · Tổng Quan |
| 02 Request bền | Tham khảo · Chi Tiết |
| 03 Skill & Phase | Tham khảo · Roadmap |

The new pages carry phase gates and a proposed/not-implemented banner. Old concrete choices remain visible for discussion rather than being silently promoted to decisions.

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

- Compared every original non-page record with the uploaded source: all preserved unchanged.
- Confirmed unique record IDs, valid parent/binding references and six page entries.
- Opened the generated file through tldraw's parser/schema migration and browser editor; inspected the current proposal pages and switched through all reference pages.
- Native shapes and bound arrows remain editable. Browser screenshots were used for visual inspection; they are not substitutes for the editable file.
- No original assets were present; no assets or unrelated content were removed.

Team review is still required for architecture, company/use-case choices and provisional rubric wording. The desktop rubric and transcript research are still missing; receiving the board does not transfer those files.
