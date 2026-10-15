# tldraw alignment specification

Tracking: [#16](https://github.com/zAcherttp/se373-bizops/issues/16). Source of truth: [architecture proposal](ARCHITECTURE.md). Status: ready to apply after transfer; **the existing board has not been edited**. `docs/SE373.tldr` is not present in this checkout. Do not create a replacement and claim that it preserves the original board.

## Apply to the existing board

Preserve the original view as a dated comparison frame. Build three linked frames from the architecture document's three Mermaid diagrams; label each as proposed, with phase markers and explicit implementation status.

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

## Review before saving

Confirm the actual board's page IDs, assets and original content after transfer. Preserve unrelated content and verify the edited file opens correctly in tldraw. Check three frames against ARCHITECTURE.md, including the phase gates: P1 one bounded slice, P2 RAG/persistence/LangGraph approval/recovery, P3 multi-agent/MCP and skill evolution. Company, owners and concrete use cases stay marked pending.

Record the actual board update in a follow-up commit after the original file is available. This specification is not evidence of board completion or acceptance of an ADR.
