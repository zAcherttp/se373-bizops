import { Cause, Clock, Effect, Exit, Option, Random, Result } from "effect";
import { isAttemptTimeout, isOperationResult } from "./contracts.ts";
import { decideFailure, validateContext } from "./failure-policy.ts";
import type { AttemptContext, Failure } from "./failure-policy.ts";
import type { AttemptOutcome } from "./contracts.ts";
export type { AttemptOutcome } from "./contracts.ts";

export interface AttemptOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

type PreparedAttempt = { context: AttemptContext; expiresAt: number };
const internalError: Failure = { kind: "internal_error", effect: "unknown" };
const timeout: Failure = { kind: "timeout", effect: "unknown" };

function prepare(context: AttemptContext, timeoutMs: number, now: number): PreparedAttempt {
  validateContext(context, now);
  if (!isAttemptTimeout(timeoutMs)) {
    throw new TypeError("Invalid attempt timeout");
  }
  return { context: { ...context }, expiresAt: Math.min(context.deadlineAt, now + timeoutMs) };
}

function ids(c: AttemptContext) {
  return { requestId: c.requestId, operationId: c.operationId, attemptId: c.attemptId };
}

function failureOutcome(c: AttemptContext, failure: Failure, now: number, jitter: number): AttemptOutcome<never> {
  // Invalid adapter classifications are internal failures, never a new permission or retry grant.
  try {
    const decision = decideFailure(failure, c, now, jitter);
    return { ...ids(c), status: "not_succeeded", failure: { kind: failure.kind, effect: failure.effect }, decision };
  } catch {
    return { ...ids(c), status: "not_succeeded", failure: internalError,
      decision: decideFailure(internalError, c, now, jitter) };
  }
}

const failureOutcomeEffect = (c: AttemptContext, failure: Failure) => Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis;
  const jitter = yield* Random.next;
  return failureOutcome(c, failure, now, jitter);
});

/** One bounded operation. Effect owns interruption, timeout fibers and their finalizers. */
function runAttempt<T, R>(attempt: PreparedAttempt, operation: Effect.Effect<T, Failure, R>) {
  return Effect.gen(function* () {
    const { context: c, expiresAt } = attempt;
    const now = yield* Clock.currentTimeMillis;
    if (now >= c.deadlineAt || c.budgetExhausted || c.attempt > c.maxAttempts) {
      return yield* failureOutcomeEffect(c, { kind: "transient", effect: "not_started" });
    }
    if (now >= expiresAt) return yield* failureOutcomeEffect(c, { kind: "timeout", effect: "not_started" });
    const exit = yield* Effect.exit(operation.pipe(Effect.timeoutOrElse({
      duration: Math.max(1, expiresAt - now),
      orElse: () => Effect.fail(timeout),
    })));
    if (Exit.isFailure(exit)) {
      // Propagate fiber cancellation to its supervisor; do not turn it into retryable business failure.
      if (Cause.hasInterruptsOnly(exit.cause)) return yield* Effect.interrupt;
      const failure = Cause.hasDies(exit.cause) ? internalError
        : Option.getOrElse(Cause.findErrorOption(exit.cause), () => internalError);
      return yield* failureOutcomeEffect(c, failure);
    }
    // A timer cannot preempt synchronous JavaScript; reject a success observed after its cutoff.
    if ((yield* Clock.currentTimeMillis) >= expiresAt) return yield* failureOutcomeEffect(c, timeout);
    return { ...ids(c), status: "succeeded" as const, value: exit.value };
  });
}

/** Preferred composable API: expected failures use Effect's typed error channel. */
export function executeAttemptEffect<T, R>(
  context: AttemptContext,
  operation: Effect.Effect<T, Failure, R>,
  options: Pick<AttemptOptions, "timeoutMs">,
): Effect.Effect<AttemptOutcome<T>, TypeError, R> {
  return Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const attempt = yield* Effect.try({
      try: () => prepare(context, options.timeoutMs, now),
      catch: () => new TypeError("Invalid attempt configuration"),
    });
    return yield* runAttempt(attempt, operation);
  });
}

/** Bridge for existing Promise adapters. Effect creates and cleans up their AbortSignal. */
export function fromPromiseOperation<T>(
  operation: (signal: AbortSignal) => Promise<Result.Result<T, Failure>>,
): Effect.Effect<T, Failure> {
  return Effect.tryPromise({ try: operation, catch: () => internalError }).pipe(
    Effect.flatMap((result) => isOperationResult(result) ? Effect.fromResult(result) : Effect.fail(internalError)),
  );
}

/** Promise boundary: supervise a Result-returning adapter and materialize cancellation. */
export async function executeAttempt<T>(
  context: AttemptContext,
  operation: (signal: AbortSignal) => Promise<Result.Result<T, Failure>>,
  options: AttemptOptions,
): Promise<AttemptOutcome<T>> {
  const attempt = prepare(context, options.timeoutMs, Date.now());
  const { signal } = options;
  if (signal?.aborted) return failureOutcome(attempt.context, { kind: "cancelled", effect: "not_started" }, Date.now(), Math.random());
  let started = false;
  const work = Effect.suspend(() => {
    started = true;
    return fromPromiseOperation(operation);
  });
  const program = runAttempt(attempt, work);
  const exit = await Effect.runPromiseExit(program, signal ? { signal } : undefined);
  if (Exit.isSuccess(exit)) {
    const outcome = exit.value;
    // Cancellation observed at the Promise boundary vetoes further work.
    // Keep explicit escalations (especially uncertain effects) rather than hiding them as cancellation.
    if (signal?.aborted && (outcome.status === "succeeded"
        || outcome.decision.action === "retry" || outcome.decision.action === "wait")) {
      return failureOutcome(attempt.context, { kind: "cancelled",
        effect: outcome.status === "succeeded" ? "unknown" : outcome.failure.effect }, Date.now(), Math.random());
    }
    return outcome;
  }
  const failure: Failure = Cause.hasInterruptsOnly(exit.cause)
    ? { kind: "cancelled", effect: started ? "unknown" : "not_started" }
    : Option.getOrElse(Cause.findErrorOption(exit.cause), () => internalError);
  return failureOutcome(attempt.context, failure, Date.now(), Math.random());
}
