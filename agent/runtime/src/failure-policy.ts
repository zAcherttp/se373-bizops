/** Pure decisions. Only trusted code classifies failures or supplies authority. */
import { isAttemptContext, isFailure, isJitter, isNonNegativeInteger } from "./contracts.ts";
import type { AttemptContext, Failure, FailureDecision } from "./contracts.ts";
export type { AttemptContext, Failure, FailureKind, FailureDecision, RecoveryPolicy } from "./contracts.ts";

export function validateContext(c: AttemptContext, now: number): void {
  if (!isAttemptContext(c) || !isNonNegativeInteger(now)) throw new TypeError("Invalid attempt configuration");
}

/** Invalid configuration is a caller error; validate before dispatching any operation. */
export function decideFailure(f: Failure, c: AttemptContext, now: number, jitter = 0.5): FailureDecision {
  validateContext(c, now);
  if (!isFailure(f) || !isJitter(jitter)) throw new TypeError("Invalid failure classification");
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
