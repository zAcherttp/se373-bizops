import { decideFailure, validateContext } from "./failure-policy.ts";
import type { AttemptContext, Failure, FailureDecision } from "./failure-policy.ts";

export type OperationResult<T> = { ok: true; value: T } | { ok: false; failure: Failure };
export type AttemptOutcome<T> = {
  requestId: string;
  operationId: string;
  attemptId: string;
} & ({ status: "succeeded"; value: T }
  | { status: "not_succeeded"; failure: Pick<Failure, "kind" | "effect">; decision: FailureDecision });

export interface AttemptOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

/** Runs once. Supply a gated operation: this module is not an authorization boundary. */
export async function executeAttempt<T>(
  context: AttemptContext,
  operation: (signal: AbortSignal) => Promise<OperationResult<T>>,
  options: AttemptOptions,
): Promise<AttemptOutcome<T>> {
  validateContext(context, Date.now());
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 2_147_483_647) {
    throw new TypeError("Invalid attempt timeout");
  }
  // Caller mutations must not change the policy/correlation of an in-flight attempt.
  const c = { ...context };
  const { signal, timeoutMs } = options;
  const expiresAt = Math.min(c.deadlineAt, Date.now() + timeoutMs);
  const ids = { requestId: c.requestId, operationId: c.operationId, attemptId: c.attemptId };
  const failed = (f: Failure): AttemptOutcome<T> => ({ ...ids, status: "not_succeeded",
    failure: { kind: f.kind, effect: f.effect },
    decision: decideFailure(f, c, Date.now(), Math.random()) });
  if (signal?.aborted) return failed({ kind: "cancelled", effect: "not_started" });
  if (Date.now() >= c.deadlineAt || c.budgetExhausted || c.attempt > c.maxAttempts) {
    return failed({ kind: "transient", effect: "not_started" });
  }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  const interrupted = new Promise<OperationResult<T>>((resolve) => {
    const interrupt = (kind: "timeout" | "cancelled") => {
      // Settle first: synchronous abort handlers must not turn cancellation into success.
      resolve({ ok: false, failure: { kind, effect: "unknown" } });
      controller.abort();
    };
    timer = setTimeout(() => interrupt("timeout"), Math.max(1, expiresAt - Date.now()));
    abortListener = () => interrupt("cancelled");
    signal?.addEventListener("abort", abortListener, { once: true });
  });
  try {
    // Also catch synchronous throws; race observes late rejections without publishing late success.
    const work = Promise.resolve().then(() => {
      if (controller.signal.aborted) return { ok: false, failure: { kind: "cancelled", effect: "not_started" } } as const;
      return operation(controller.signal);
    });
    const result = await Promise.race([interrupted, work]);
    // Preserve explicit denial/uncertainty; a late denial must not become a retryable timeout.
    if (result.ok === false) {
      if (signal?.aborted && result.failure.kind !== "permission_denied" && result.failure.kind !== "unknown_effect") {
        return failed({ kind: "cancelled", effect: result.failure.effect });
      }
      return failed(result.failure);
    }
    if (result.ok !== true || !Object.hasOwn(result, "value")) throw new TypeError("Invalid operation result");
    // Timers cannot preempt synchronous work. Reject results observed after the cutoff as well.
    if (signal?.aborted) return failed({ kind: "cancelled", effect: "unknown" });
    if (Date.now() >= expiresAt) return failed({ kind: "timeout", effect: "unknown" });
    return { ...ids, status: "succeeded", value: result.value };
  } catch {
    // Raw exceptions may contain payroll, tokens or documents; never publish their text here.
    return failed({ kind: "internal_error", effect: "unknown" });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (abortListener) signal?.removeEventListener("abort", abortListener);
  }
}
