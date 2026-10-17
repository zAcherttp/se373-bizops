# TypeScript failure-handling core

First implementation slice for [task #19](https://github.com/zAcherttp/se373-bizops/issues/19),
based on the [architecture proposal](../../docs/ARCHITECTURE.md). Pi Durable is reference-only;
this package has no Pi, Cordis, LangGraph or model runtime dependency. Node 24 executes erasable
TypeScript directly; `tsc` checks it separately. The existing Python scaffold is still the app's
agent baseline; this package is not wired into its invocation or an employee-facing API yet.

```bash
cd agent/runtime
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run demo
```

The demo prints six JSONL scenario outcomes using synthetic IDs and no network or API keys.
Policy decisions use fixed time/jitter for repeatability; the last example runs a hanging Promise.
These are inspectable demo events, not an authenticated Audit Ledger or persistent request trace.

## Module walkthrough

| Module | Inputs → outputs | State/dependencies | Failure behavior |
|---|---|---|---|
| `src/failure-policy.ts` | Trusted failure classification, attempt/owner/budget policy, time and jitter → retry, wait, escalation or cancellation | Pure function; no I/O, database, model or retained state | Invalid inputs throw before dispatch; uncertain effects take precedence over expiry/cancellation; no implicit retries |
| `src/execute-attempt.ts` | Context, already-gated async operation, timeout and optional AbortSignal → correlated success or failure decision | One in-memory attempt, timer and abort listener; depends on failure policy | Catches sync/async exceptions, bounds waits, signals abort, suppresses late results and cleans its timer/listener |

Normal path: validate context → snapshot policy → invoke the supplied gated operation once →
return its result with request/operation/attempt IDs. Success means **this operation returned a
result**, not that the whole business request is completed or its outcome verified.

Failure path: a payment call starts, then times out → signal abort → classify the effect as unknown
→ return an owned escalation requiring receipt reconciliation. The executor does not submit a second
payment. Cancellation also cannot establish that the first payment did not happen. The outcome
retains the original failure kind and effect, even when its decision code becomes `unknown_effect`.

## Decision rules

- Retry only classified transient failures/timeouts within attempt, deadline and budget limits.
  Backoff is exponential, capped, with equal jitter. Provider Retry-After remains a minimum.
  A retry decision schedules nothing itself; the caller must reauthorize and supply a new attempt ID,
  keeping the operation ID stable. Underlying SDK retries must be disabled or accounted for separately.
- Unknown effects on `reconcile_first` or `human_resolution_required` operations escalate without
  replay. Explicit `unknown_effect` also escalates for a nominally safe tool. A trusted adapter may
  report `not_started` only with authoritative evidence, allowing retry without duplicating an effect.
- Missing information, approval and offline devices return a wait with responder, deadline and next
  action. A wait releases this call; it is not an LLM polling loop or a completion claim.
- Permission denial never retries or switches identity/model. Unsupported and unclassified errors
  escalate. Raw exception messages/stacks are omitted because they may contain sensitive data.
- Already-cancelled, expired, exhausted or over-budget attempts do not invoke the operation.
  The final allowed attempt may still run; a subsequent retry cannot. A known-safe cancellation is
  explicit; an uncertain effect still needs resolution.

The caller supplies authoritative classification, scope, owners, recovery policy and budget snapshot.
These fields must never come directly from a model or employee input. This module does not grant
permissions, approve spending, calculate charges or verify identity. Success payloads may contain
sensitive information and must pass downstream access checks before delivery. Correlation IDs are
references for authorized evidence lookup, not credentials or evidence that an effect occurred.

## Boundaries and next phase

This is Phase 1 bounded execution/failure handling, not durable recovery. All state is in memory;
process death loses it. Wait/escalation outcomes are returned to the caller, not yet stored or sent.
The new CI job exercises the TypeScript package alongside existing Python and app checks.

Phase 2 work must add atomic request/outbox admission, checkpoints, operation intent/receipts,
persisted blockers, ownership fencing, recovery scans and separate notification delivery. A durable
adapter must commit the outcome before publishing it. Never infer crash recovery from these tests.

Abort is cooperative: it cannot kill CPU-blocking JavaScript, undo an external action or guarantee a
provider stopped billing. A cutoff check rejects a late-observed result, but the event loop must be
able to run to return an outcome. Non-cooperative workloads need a process/Worker boundary and
supervision in a later slice. Late external effects need authoritative reconciliation, not replay.
