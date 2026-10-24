import assert from "node:assert/strict";
import { test } from "node:test";
import { decideFailure } from "../src/failure-policy.ts";
import type { Failure, FailureKind, RecoveryPolicy } from "../src/failure-policy.ts";
import { context } from "./fixtures.ts";

const now = 10_000;
const c = context({ deadlineAt: 30_000 });
const transient: Failure = { kind: "transient", effect: "not_started" };

test("transient retry uses bounded exponential backoff and jitter", () => {
  for (const [attempt, expected] of [[1, 100], [2, 200], [20, 1_000]] as const) {
    const result = decideFailure(transient, { ...c, attempt, maxAttempts: 30 }, now, 1);
    assert.equal(result.action, "retry");
    if (result.action === "retry") assert.equal(result.retryAt, now + expected);
  }
  const result = decideFailure(transient, c, now, 0);
  assert.equal(result.action === "retry" && result.retryAt, now + 50);
});

test("Retry-After is honored even above the local backoff cap", () => {
  const result = decideFailure({ ...transient, retryAfterMs: 2_000 }, c, now, 0);
  assert.equal(result.action === "retry" && result.retryAt, now + 2_000);
  assert.equal(decideFailure({ ...transient, retryAfterMs: 20_000 }, c, now).code, "deadline_exceeded");
});

for (const recovery of ["reconcile_first", "human_resolution_required"] as const) {
  for (const kind of ["transient", "timeout", "cancelled", "permission_denied", "device_offline"] as const) {
    test(`${recovery}: uncertain ${kind} escalates without replay even after expiry`, () => {
      const result = decideFailure({ kind, effect: "unknown" },
        { ...c, recovery, deadlineAt: now, budgetExhausted: true }, now);
      assert.equal(result.action, "escalate");
      assert.equal(result.code, "unknown_effect");
      if (result.action === "escalate") assert.equal(result.owner, c.owner);
    });
  }
}

test("even safe-to-repeat tools must reconcile an explicitly unknown effect", () => {
  assert.equal(decideFailure({ kind: "unknown_effect", effect: "unknown" }, c, now).action, "escalate");
});

test("authoritative not-started evidence allows a bounded retry for an effectful operation", () => {
  assert.equal(decideFailure(transient, { ...c, recovery: "reconcile_first" }, now).action, "retry");
});

for (const kind of ["missing_information", "approval_required", "device_offline"] as const) {
  test(`${kind} produces an owned wait with a deadline`, () => {
    const result = decideFailure({ kind, effect: "not_started" }, c, now);
    assert.equal(result.action, "wait");
    if (result.action === "wait") {
      assert.equal(result.responder, c.responder);
      assert.equal(result.deadlineAt, c.deadlineAt);
    }
    assert.equal(decideFailure({ kind, effect: "not_started" }, c, c.deadlineAt).code, "deadline_exceeded");
  });
}

test("permission denial never triggers retry or model fallback", () => {
  const result = decideFailure({ kind: "permission_denied", effect: "not_started" }, c, now);
  assert.equal(result.action, "escalate");
  assert.equal(result.code, "permission_denied");
});

test("attempt, time and budget limits stop retries", () => {
  assert.equal(decideFailure(transient, { ...c, attempt: 3 }, now).code, "attempts_exhausted");
  assert.equal(decideFailure(transient, c, c.deadlineAt).code, "deadline_exceeded");
  assert.equal(decideFailure(transient, { ...c, budgetExhausted: true }, now).code, "budget_exhausted");
  assert.equal(decideFailure(transient, { ...c, deadlineAt: now + 1 }, now).code, "deadline_exceeded");
});

for (const kind of ["unsupported", "internal_error"] as const) {
  test(`${kind} escalates without guessing or retrying`, () => {
    assert.equal(decideFailure({ kind, effect: "not_started" }, c, now).action, "escalate");
  });
}

test("safe cancellation is explicit and does not claim compensation", () => {
  const result = decideFailure({ kind: "cancelled", effect: "not_started" }, c, now);
  assert.equal(result.action, "cancelled");
  assert.match(result.nextAction, /does not undo/);
});

test("invalid budgets, identity, recovery and classifications fail closed", () => {
  for (const overrides of [
    { attempt: 0 }, { attempt: 1.5 }, { maxAttempts: 0 }, { deadlineAt: NaN },
    { baseBackoffMs: 0 }, { maxBackoffMs: 1 }, { owner: " " },
    { recovery: "guess" as RecoveryPolicy },
  ]) assert.throws(() => decideFailure(transient, { ...c, ...overrides }, now), TypeError);
  assert.throws(() => decideFailure(transient, c, now, NaN), TypeError);
  assert.throws(() => decideFailure({ ...transient, retryAfterMs: -1 }, c, now), TypeError);
  assert.throws(() => decideFailure({ kind: "guess" as FailureKind, effect: "unknown" }, c, now), TypeError);
});
