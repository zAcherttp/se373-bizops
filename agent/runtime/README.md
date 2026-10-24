# TypeScript failure-handling core

> **Chỉ để tham khảo (2026-10-24, [ADR 003](../../docs/decisions/003-python-langgraph.md)):** agent core là Python + LangGraph trong `agent/`; package này không phải runtime.

First implementation slice for [task #19](https://github.com/zAcherttp/se373-bizops/issues/19),
based on the 2026-10-18 architecture proposal (now folded into [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)). Pi Durable is reference-only;
this package uses Effect for in-process execution, with no Pi, Cordis, LangGraph or model runtime dependency. Node 24 executes erasable
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
Policy decisions use fixed time/jitter for repeatability; the last example times out a native `Effect.never`.
These are inspectable demo events, not an authenticated Audit Ledger or persistent request trace.

## Effect API

`executeAttemptEffect(context, operation, { timeoutMs })` accepts an
`Effect<Result, Failure, Requirements>` and returns an
`Effect<AttemptOutcome<Result>, TypeError, Requirements>`. Expected operation failures use the typed
error channel; successful operations return a value directly. Caller-provided services remain in
the effect's requirements. Configuration errors are typed `TypeError`s, distinct from business
failure decisions. Effect is pinned to `4.0.5` in this package and lockfile.

```ts
import { Effect } from "effect";
import { executeAttemptEffect } from "./src/execute-attempt.ts";
import type { Failure } from "./src/failure-policy.ts";

// Within a caller's Effect program, with its authorized context:
const operation = Effect.fail<Failure>({
  kind: "approval_required",
  effect: "not_started",
});
const program = Effect.gen(function* () {
  const outcome = yield* executeAttemptEffect(context, operation, { timeoutMs: 5_000 });
  return outcome; // Correlated wait with responder/deadline; nothing is retried here.
});
```

`fromPromiseOperation` adapts `(signal) => Promise<Result.Result<T, Failure>>` into an effect via
`Effect.fromResult`. Use Effect's `Result.succeed(value)` / `Result.fail(failure)` constructors;
the bespoke `{ ok, value/failure }` envelope has been removed. `executeAttempt` remains the
Promise-facing entry point, with its adapter contract migrated to built-in Result.
New Effect callers should use `executeAttemptEffect` directly instead of nesting `runPromise` calls.

## Schemas and built-in types

`src/contracts.ts` defines failure kinds, recovery policies, failure records, attempt context,
failure decisions and `AttemptOutcome(successSchema)` with Effect Schema. Their TypeScript types
come from the schemas' `Type`; enum lists and handwritten field validators are not maintained twice.
Schema checks enforce valid identifiers, safe integer bounds, jitter, timeout and backoff constraints.
Plain internal option records holding an AbortSignal stay ordinary TypeScript types: they are not
serialized data contracts.

Schema checks establish data shape; they do not grant authorization, establish idempotency or prove
that an operation never started. The pure policy still determines whether retry/wait/escalation is
allowed. `Schema.TaggedError` is available for schema-backed exception classes, but our failures are
plain domain records already validated by Schema; adding classes would not add behavior here.

The Promise bridge validates the built-in Result and its failure record with
`Schema.Result(Schema.Unknown, Failure)`. Its success payload is deliberately opaque: this is a
typed in-process adapter, not an unknown JSON ingress. A connector must decode its actual success
schema before returning `Result.succeed`. For example, a catalog connector would validate SKU,
availability and price fields, rather than cast the response to a TypeScript type.

For an external Result representation, use `Schema.toCodecJson(Schema.Result(valueSchema, Failure))`
and `Schema.decodeUnknownEffect`. This uses Effect's Success/Failure representation and built-in
codec. Use `AttemptOutcome(valueSchema)` when validating a materialized attempt outcome. These
schemas are available for boundaries; the current package has no HTTP ingress or persisted store.
Schema parse issues can contain input values, so the executor sanitizes thrown parser errors before
returning an employee-facing failure outcome.

| Need | Effect v4 facility | Usage here |
|---|---|---|
| Running an operation | `Effect<A, E, R>` | Native API; expected failures use the error channel |
| Completed success/failure data | `Result`, `Effect.fromResult` | Promise adapter, replacing a custom union |
| Boundary types and validation | `Schema.Struct`, `Schema.Union`, `Schema.Result` | Contracts and derived TypeScript types |
| Full termination information | `Exit`, `Cause` | Distinguish typed failure, defect and interruption |
| Timing, randomness and resources | `Clock`, `Random`, timeout and scoped finalizers | Executor and virtual-clock tests |
| Recurrence, deployment configuration, secrets | `Schedule`, `Config`, `Redacted` | Available; not additional implementations in this slice |

`Schedule` can drive recurrence when a scheduler is introduced, while our business policy must still
veto unsafe retries. The installed v4 package also exports `effect/workflow` and `effect/sql`; those
are candidates for the Phase 2 persistence evaluation, not crash-recovery guarantees supplied by
this in-memory executor. Effect supplies mechanisms; company policy and business correctness still
require explicit rules, adapters and verification.

Effect owns timeout fibers, interruption and operation finalizers. `Effect.tryPromise` supplies the
operation's abort signal. The Promise boundary passes the external signal directly to
`Effect.runPromiseExit(program, { signal })`; v4 owns the abort subscription and removes it when
the fiber exits. There are no handwritten event listeners, cancellation streams, manual timeout
handles, operation AbortControllers, Promise races or `finally` cleanup in the executor.

The implementation uses v4's `timeoutOrElse`, cause inspection helpers and service API. Tests use
`forkChild` and `TestClock.layer()` from `effect/testing`; they verify that interruption releases
resources and completed attempts leave no external abort subscription behind.

Native parent interruption remains interruption, so a supervisor can observe its `Exit` and record
the cancellation; it is not silently converted into a successful fiber. The Promise boundary acts
as that supervisor and returns an explicit cancelled/uncertain-effect outcome. Unclassified defects,
including finalizer defects, escalate with sanitized messages. Effect retry combinators are not used:
business retry eligibility remains in the pure policy, preventing accidental payment replay.

## Module walkthrough

| Module | Inputs → outputs | State/dependencies | Failure behavior |
|---|---|---|---|
| `src/contracts.ts` | Runtime schemas → derived types, guards and payload-specific outcome schemas | Effect Schema; no I/O or authority grants | Rejects malformed shape/bounds; boundary decoders strip unrelated fields by default |
| `src/failure-policy.ts` | Trusted failure classification, attempt/owner/budget policy, time and jitter → retry, wait, escalation or cancellation | Pure function; no I/O, database, model or retained state | Invalid inputs throw before dispatch; uncertain effects take precedence over expiry/cancellation; no implicit retries |
| `src/execute-attempt.ts` | Context, already-gated Effect and timeout → correlated success or failure decision; Promise compatibility wrapper | One in-memory attempt; Effect Clock/Random, timeout, interruption and scoped cleanup; pure failure policy | Separates expected failures, defects and interruption; rejects late success; preserves uncertain effects |

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
Effect timeouts wait for resource finalizers: finalizers must be bounded. An uninterruptible operation
or stuck finalizer can still delay termination; Effect is not a process supervisor or durable runtime.
