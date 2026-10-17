import { executeAttempt } from "./execute-attempt.ts";
import { decideFailure } from "./failure-policy.ts";
import type { AttemptContext, Failure, RecoveryPolicy } from "./failure-policy.ts";

// Fixed clock and jitter make the policy examples repeatable; no provider or secrets required.
const now = 1_000;
const base: AttemptContext = {
  requestId: "demo-request", operationId: "demo-operation", attemptId: "demo-attempt-1",
  owner: "ops-owner", responder: "employee-demo", attempt: 1, maxAttempts: 3,
  deadlineAt: 10_000, budgetExhausted: false, recovery: "safe_to_repeat",
  baseBackoffMs: 100, maxBackoffMs: 1000,
};
const scenarios: { name: string; failure: Failure; recovery: RecoveryPolicy }[] = [
  { name: "provider-unavailable", failure: { kind: "transient", effect: "not_started" }, recovery: "safe_to_repeat" },
  { name: "employee-device-offline", failure: { kind: "device_offline", effect: "not_started" }, recovery: "reconcile_first" },
  { name: "missing-information", failure: { kind: "missing_information", effect: "not_started" }, recovery: "safe_to_repeat" },
  { name: "permission-revoked", failure: { kind: "permission_denied", effect: "not_started" }, recovery: "safe_to_repeat" },
  { name: "interrupted-payment", failure: { kind: "timeout", effect: "unknown" }, recovery: "reconcile_first" },
];
for (const { name, failure, recovery } of scenarios) {
  console.log(JSON.stringify({ scenario: name, requestId: base.requestId, operationId: base.operationId,
    attemptId: base.attemptId, failure, decision: decideFailure(failure, { ...base, recovery }, now, 0.5) }));
}

// Exercise a genuinely hanging Promise. It returns an escalation without waiting forever.
console.log(JSON.stringify({ scenario: "hanging-operation", ...await executeAttempt(
  { ...base, deadlineAt: Date.now() + 60_000, recovery: "human_resolution_required" },
  () => new Promise(() => {}), { timeoutMs: 10 },
) }));
