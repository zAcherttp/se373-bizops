import { Schema } from "effect";

// One runtime definition per boundary contract; TypeScript types are inferred below.
export const NonNegativeInteger = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
const PositiveInteger = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));
const Identifier = Schema.String.check(Schema.isPattern(/\S/));
export const Jitter = Schema.Number.check(Schema.isFinite(), Schema.isBetween({ minimum: 0, maximum: 1 }));
export const AttemptTimeout = PositiveInteger.check(Schema.isLessThanOrEqualTo(2_147_483_647));

export const RecoveryPolicy = Schema.Literals(["safe_to_repeat", "reconcile_first", "human_resolution_required"]);
export type RecoveryPolicy = typeof RecoveryPolicy.Type;

export const FailureKind = Schema.Literals([
  "transient", "timeout", "missing_information", "approval_required", "permission_denied",
  "device_offline", "unsupported", "unknown_effect", "internal_error", "cancelled",
]);
export type FailureKind = typeof FailureKind.Type;

export const Failure = Schema.Struct({
  kind: FailureKind,
  // Only authoritative adapter evidence may establish that execution never started.
  effect: Schema.Literals(["not_started", "unknown"]),
  retryAfterMs: Schema.optionalKey(NonNegativeInteger),
});
export type Failure = typeof Failure.Type;

export const AttemptContext = Schema.Struct({
  requestId: Identifier,
  operationId: Identifier, // Stable across retries; distinct from the attempt ID.
  attemptId: Identifier,
  owner: Identifier,
  responder: Identifier,
  attempt: PositiveInteger, // One-based, including this attempt.
  maxAttempts: PositiveInteger,
  deadlineAt: NonNegativeInteger, // Epoch milliseconds.
  budgetExhausted: Schema.Boolean,
  recovery: RecoveryPolicy,
  baseBackoffMs: PositiveInteger,
  maxBackoffMs: PositiveInteger,
}).check(Schema.makeFilter((c) => c.maxBackoffMs >= c.baseBackoffMs));
export type AttemptContext = typeof AttemptContext.Type;

export const isAttemptContext = Schema.is(AttemptContext);
export const isFailure = Schema.is(Failure);
export const isNonNegativeInteger = Schema.is(NonNegativeInteger);
export const isJitter = Schema.is(Jitter);
export const isAttemptTimeout = Schema.is(AttemptTimeout);

// Typed in-process Results may carry arbitrary success values. A connector must decode its own
// success payload schema before constructing Result.succeed; Unknown does not validate that value.
export const isOperationResult = Schema.is(Schema.Result(Schema.Unknown, Failure));

export const FailureDecision = Schema.Union([
  Schema.Struct({ action: Schema.Literal("retry"), code: Schema.Literals(["transient", "timeout"]),
    retryAt: NonNegativeInteger, nextAction: Identifier }),
  Schema.Struct({ action: Schema.Literal("wait"), code: FailureKind,
    responder: Identifier, deadlineAt: NonNegativeInteger, nextAction: Identifier }),
  Schema.Struct({ action: Schema.Literal("escalate"),
    code: Schema.Union([FailureKind, Schema.Literals(["deadline_exceeded", "attempts_exhausted", "budget_exhausted"])]),
    owner: Identifier, nextAction: Identifier }),
  Schema.Struct({ action: Schema.Literal("cancelled"), code: Schema.Literal("cancelled"), nextAction: Identifier }),
]);
export type FailureDecision = typeof FailureDecision.Type;

const Correlation = { requestId: Identifier, operationId: Identifier, attemptId: Identifier };
const FailureSummary = Schema.Struct({ kind: Failure.fields.kind, effect: Failure.fields.effect });

/** Boundary schema: the producer chooses the actual success payload schema. */
export const AttemptOutcome = <S extends Schema.Constraint>(success: S) => Schema.Union([
  Schema.Struct({ ...Correlation, status: Schema.Literal("succeeded"), value: success }),
  Schema.Struct({ ...Correlation, status: Schema.Literal("not_succeeded"),
    failure: FailureSummary, decision: FailureDecision }),
]);
export type AttemptOutcome<T> = ReturnType<typeof AttemptOutcome<Schema.declare<T>>>["Type"];
