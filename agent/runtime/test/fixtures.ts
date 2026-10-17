import type { AttemptContext } from "../src/failure-policy.ts";

export function context(overrides: Partial<AttemptContext> = {}): AttemptContext {
  return {
    requestId: "request-demo", operationId: "operation-demo", attemptId: "attempt-1",
    owner: "ops-owner", responder: "employee-demo", attempt: 1, maxAttempts: 3,
    deadlineAt: Date.now() + 60_000, budgetExhausted: false,
    recovery: "safe_to_repeat", baseBackoffMs: 100, maxBackoffMs: 1_000, ...overrides,
  };
}
