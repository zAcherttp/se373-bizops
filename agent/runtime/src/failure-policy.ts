/** Pure decisions. Only trusted code classifies failures or supplies authority. */
export type RecoveryPolicy = "safe_to_repeat" | "reconcile_first" | "human_resolution_required";
export type FailureKind = "transient" | "timeout" | "missing_information" | "approval_required"
  | "permission_denied" | "device_offline" | "unsupported" | "unknown_effect" | "internal_error" | "cancelled";

export interface Failure {
  kind: FailureKind;
  // Only authoritative adapter evidence may establish that execution never started.
  effect: "not_started" | "unknown";
  retryAfterMs?: number;
}

export interface AttemptContext {
  requestId: string;
  operationId: string; // Stable across retries; distinct from the attempt ID.
  attemptId: string;
  owner: string;
  responder: string;
  attempt: number; // One-based, including this attempt.
  maxAttempts: number;
  deadlineAt: number; // Epoch milliseconds.
  budgetExhausted: boolean;
  recovery: RecoveryPolicy;
  baseBackoffMs: number;
  maxBackoffMs: number;
}

export type FailureDecision =
  | { action: "retry"; code: "transient" | "timeout"; retryAt: number; nextAction: string }
  | { action: "wait"; code: FailureKind; responder: string; deadlineAt: number; nextAction: string }
  | { action: "escalate"; code: FailureKind | "deadline_exceeded" | "attempts_exhausted" | "budget_exhausted";
      owner: string; nextAction: string }
  | { action: "cancelled"; code: "cancelled"; nextAction: string };

const recoveries: readonly string[] = ["safe_to_repeat", "reconcile_first", "human_resolution_required"];
const kinds: readonly string[] = ["transient", "timeout", "missing_information", "approval_required",
  "permission_denied", "device_offline", "unsupported", "unknown_effect", "internal_error", "cancelled"];

export function validateContext(c: AttemptContext, now: number): void {
  for (const name of ["requestId", "operationId", "attemptId", "owner", "responder"] as const) {
    if (typeof c[name] !== "string" || c[name].trim() === "") throw new TypeError(`Invalid ${name}`);
  }
  for (const [name, value] of Object.entries({ now, deadlineAt: c.deadlineAt,
    attempt: c.attempt, maxAttempts: c.maxAttempts, baseBackoffMs: c.baseBackoffMs,
    maxBackoffMs: c.maxBackoffMs })) {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Invalid ${name}`);
  }
  if (c.attempt < 1 || c.maxAttempts < 1 || c.baseBackoffMs < 1 || c.maxBackoffMs < c.baseBackoffMs
      || typeof c.budgetExhausted !== "boolean" || !recoveries.includes(c.recovery)) {
    throw new TypeError("Invalid attempt policy");
  }
}

/** Invalid configuration is a caller error; validate before dispatching any operation. */
export function decideFailure(f: Failure, c: AttemptContext, now: number, jitter = 0.5): FailureDecision {
  validateContext(c, now);
  if (!kinds.includes(f.kind) || !["not_started", "unknown"].includes(f.effect)
      || !Number.isFinite(jitter) || jitter < 0 || jitter > 1
      || (f.retryAfterMs !== undefined && (!Number.isSafeInteger(f.retryAfterMs) || f.retryAfterMs < 0))) {
    throw new TypeError("Invalid failure classification");
  }
  const escalate = (code: Extract<FailureDecision, { action: "escalate" }>["code"], nextAction: string): FailureDecision =>
    ({ action: "escalate", code, owner: c.owner, nextAction });
  // Uncertain effects must remain visible even after cancellation or budget/deadline exhaustion.
  if (f.effect === "unknown" && (f.kind === "unknown_effect" || c.recovery !== "safe_to_repeat")) {
    return escalate("unknown_effect", c.recovery === "reconcile_first"
      ? "An authorized owner must reconcile the operation receipt before any replay."
      : "An authorized owner must resolve the uncertain effect; do not replay the operation.");
  }
  if (f.kind === "permission_denied") return escalate(f.kind, "An authorized owner must review access; do not switch models or identities.");
  if (f.kind === "cancelled") return { action: "cancelled", code: "cancelled", nextAction: "Stop automated work; cancellation does not undo prior effects." };
  if (now >= c.deadlineAt) return escalate("deadline_exceeded", "Review the request deadline and last confirmed progress.");
  if (c.budgetExhausted) return escalate("budget_exhausted", "Review the budget before authorizing further work.");
  if (f.kind === "missing_information" || f.kind === "approval_required" || f.kind === "device_offline") {
    return { action: "wait", code: f.kind, responder: c.responder, deadlineAt: c.deadlineAt,
      nextAction: f.kind === "missing_information" ? "Provide the missing information through an authenticated channel."
        : f.kind === "approval_required" ? "Obtain approval for the exact action; reauthorize before resuming."
          : "Wait for authenticated device reconnect; reauthorize before resuming." };
  }
  if (f.kind === "transient" || f.kind === "timeout") {
    if (c.attempt >= c.maxAttempts) return escalate("attempts_exhausted", "Review repeated failures and the last confirmed progress.");
    // Equal jitter: [half cap, cap]. Retry-After is a minimum, not shortened by our cap.
    const cap = Math.min(c.maxBackoffMs, c.baseBackoffMs * 2 ** Math.min(c.attempt - 1, 52));
    const delay = Math.max(1, Math.ceil(cap * (0.5 + jitter / 2)), f.retryAfterMs ?? 0);
    if (delay >= c.deadlineAt - now) return escalate("deadline_exceeded", "No retry fits within the request deadline.");
    return { action: "retry", code: f.kind, retryAt: now + delay,
      nextAction: "Schedule another bounded attempt with the same operation ID after reauthorization." };
  }
  return escalate(f.kind, "Review the failure and safe evidence; no automatic replay is authorized.");
}
