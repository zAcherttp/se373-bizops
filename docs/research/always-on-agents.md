# Always-on agents: architecture research

- Source: [lecture video](https://www.youtube.com/watch?v=L1OBRtfPS34), about 45 minutes.
- Captured: 2026-10-15; English auto-generated captions, 1,285 segments.
- Evidence: [paragraph](../references/L1OBRtfPS34.en.paragraph.txt),
  [timestamped JSON](../references/L1OBRtfPS34.en.json).
- Status: AI-assisted summary and architecture proposals; pending human review. No team decision recorded.
- Limitations: captions can misrecognize names and technical terms. Speaker claims and predictions are
  not independently verified benchmarks. Review the video before quoting or attributing identities.

## Findings and proposed application

| Source observation | Implication proposed for BizOps | Tradeoff / verification |
|---|---|---|
| [10:17–12:18](https://www.youtube.com/watch?v=L1OBRtfPS34&t=617s): events wake the agent; state persists between runs; routing deduplicates events and decides whether to notify. | Normalize app requests, chat messages and scheduled runs into events with stable IDs. Notify on useful outcomes or required approval. | A queue alone does not prevent duplicate business effects. Replay the same event and verify one report delivery. |
| [13:32–15:23](https://www.youtube.com/watch?v=L1OBRtfPS34&t=812s): agent execution and state live on a server independently of optional computer environments. | Keep React as the client; Python owns execution and policy. Persist task state independently of UI sessions. | One backend is enough initially. Test closing and reopening the client without losing persisted work in Phase 2. |
| [16:20–17:20](https://www.youtube.com/watch?v=L1OBRtfPS34&t=980s): durable workflows resume progress; the speaker uses Temporal. | Evaluate the course-required LangGraph checkpoint/resume for Phase 2 before considering additional infrastructure. | This talk does not establish equivalence between Temporal and LangGraph. Inject failures around side effects; prove resume and idempotency separately. |
| [17:25–18:06](https://www.youtube.com/watch?v=L1OBRtfPS34&t=1045s): user corrections take priority; messages can be batched into a turn. | Serialize mutations per conversation and define how corrections cancel or supersede pending work. | Do not assume cancellation reverses an already completed action. Test a changed report period before dispatch. |
| [20:01–21:30](https://www.youtube.com/watch?v=L1OBRtfPS34&t=1201s): discover tool details when needed to reduce context usage. | Keep skill metadata compact and load detailed instructions on demand; add tool discovery only when tool count warrants it. | Discovery adds latency and can miss tools. Measure selection accuracy and prompt size against a small static baseline. |
| [23:30–25:12](https://www.youtube.com/watch?v=L1OBRtfPS34&t=1410s): helpers isolate verbose work and return results; each can have durable execution. | In Phase 3, department workers return structured results and evidence references to the coordinator. | Extra orchestration costs tokens and complicates recovery. Compare with a single-agent baseline on the same cross-department task. |
| [25:18–26:27](https://www.youtube.com/watch?v=L1OBRtfPS34&t=1518s): concise stable tool definitions, dedicated tools for frequent operations, and actionable errors improve harness operation. | Use typed business tools with clear errors rather than exposing arbitrary shell operations. | Test invalid arguments, empty data and tool failures; trace retries and termination. |
| [26:30–27:23](https://www.youtube.com/watch?v=L1OBRtfPS34&t=1590s): untrusted input must not become authority; risky actions need review; credentials stay outside conversations. | Enforce department permissions and spending approval in code outside the model. Treat research transcripts, retrieved documents, skill proposals and memory as untrusted data. | An automated reviewer cannot replace required human spending approval. Test injection and attempts to bypass approval. |
| [27:26–29:51](https://www.youtube.com/watch?v=L1OBRtfPS34&t=1646s): stable prompt prefixes support caching; large outputs can live in files. | Store long artifacts separately and return references plus short summaries; measure provider caching rather than assuming savings. | File references require authorization and retrieval. Track tokens, latency and answer quality together. |
| [31:49–34:25](https://www.youtube.com/watch?v=L1OBRtfPS34&t=1909s): compaction loses information; memory can separate core facts, dated logs and temporary notes. | Separate company facts, task checkpoints, audit history and scratch context. Verify goals, constraints, approvals and next steps survive compaction. | Memory can be stale or poisoned. Preserve provenance, access limits and retention rules. |
| [36:07–37:42](https://www.youtube.com/watch?v=L1OBRtfPS34&t=2167s): convert failures into evals, fix the harness, and compare model versions. | Run repeatable regression cases before and after changes; record quality, cost, latency and traces per profile. | Fake-model tests verify mechanics but cannot establish real-model quality. Keep live eval results distinct. |

## Proposed architecture direction, pending decision

Use a React client and one Python backend with a bounded agent loop, typed tools, reusable skills,
policy enforcement and trace storage. Keep triggers and persisted execution behind explicit interfaces.
Add LangGraph checkpointing and approval workflows in Phase 2; add department delegation or MCP in
Phase 3. Defer Temporal, general-purpose desktop automation and cloud VMs until a demonstrated use
case justifies their operational cost. This is our interpretation, not a recommendation validated by
the speaker for this project.

Phase 1 remains one app-to-agent use case with two tools, one skill, step logs and ten eval cases.
The new rubric's final-system requirements add two reusable skills, a workflow with at least three
nodes, and `5 × UC count + 5` attack cases; do not treat those as permission to bypass phase gates.
Its K mapping differs from `docs/YEU-CAU.md`: K6 combines multi-agent/MCP and K7 is evaluation.
Reconcile that mapping before assigning coverage to owners.

## Questions for architecture decisions

1. Which fictional company and official use cases determine the data and permissions model?
2. Which chat channel and external tool will the first report actually use?
3. What storage/checkpointer supports the required failure and approval scenarios with minimal setup?
4. What counts as an idempotent report or spending action, and how are retries audited?
5. What data may enter persistent memory, who may read it, and when is it deleted?

Create a Decision issue for each consequential choice; link this note and record alternatives plus
the eval evidence in the accepted decision record. This note does not settle those choices.
