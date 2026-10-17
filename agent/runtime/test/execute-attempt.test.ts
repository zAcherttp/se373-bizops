import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { test } from "node:test";
import { Result } from "effect";
import type { Failure } from "../src/contracts.ts";
import { executeAttempt } from "../src/execute-attempt.ts";
import type { AttemptOutcome } from "../src/execute-attempt.ts";
import { context } from "./fixtures.ts";

function decision<T>(outcome: AttemptOutcome<T>) {
  assert.equal(outcome.status, "not_succeeded");
  if (outcome.status !== "not_succeeded") throw new Error("Expected failure outcome");
  return outcome.decision;
}

test("successful operation returns its value and correlation IDs", async () => {
  const c = context();
  const out = await executeAttempt(c, async () => Result.succeed("report"), { timeoutMs: 1000 });
  assert.deepEqual(out, { requestId: c.requestId, operationId: c.operationId,
    attemptId: c.attemptId, status: "succeeded", value: "report" });
});

test("classified transient failure schedules retry but does not execute twice", async () => {
  let calls = 0;
  const out = await executeAttempt(context(), async () => {
    calls++;
    return Result.fail({ kind: "transient", effect: "not_started" });
  }, { timeoutMs: 1000 });
  assert.equal(decision(out).action, "retry");
  assert.equal(calls, 1);
});

test("a hanging unsafe operation settles, aborts and requires reconciliation", async () => {
  let signal: AbortSignal | undefined;
  const out = await executeAttempt(context({ recovery: "reconcile_first" }), (s) => {
    signal = s;
    return new Promise<Result.Result<never, Failure>>(() => {});
  }, { timeoutMs: 10 });
  assert.equal(decision(out).code, "unknown_effect");
  assert.equal(signal?.aborted, true);
});

test("a hanging safe read gets a bounded retry decision", async () => {
  const out = await executeAttempt(context(), () => new Promise<Result.Result<never, Failure>>(() => {}), { timeoutMs: 10 });
  assert.equal(decision(out).action, "retry");
});

test("synchronous and asynchronous unknown exceptions escalate without leaking secrets", async () => {
  for (const operation of [
    () => { throw new Error("secret-payroll-token"); },
    () => Promise.reject(new Error("secret-payroll-token")),
  ]) {
    const out = await executeAttempt(context(), operation, { timeoutMs: 1000 });
    assert.equal(decision(out).code, "internal_error");
    assert.equal(JSON.stringify(out).includes("secret-payroll-token"), false);
  }
});

test("already-cancelled work is never invoked", async () => {
  let calls = 0;
  const out = await executeAttempt(context({ recovery: "human_resolution_required" }), async () => {
    calls++; return Result.succeed(1);
  }, { timeoutMs: 1000, signal: AbortSignal.abort() });
  assert.equal(decision(out).action, "cancelled");
  assert.equal(calls, 0);
});

test("cancellation during an unsafe operation cannot publish an abort-handler success", async () => {
  const controller = new AbortController();
  let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  const pending = executeAttempt(context({ recovery: "reconcile_first" }), (signal) => {
    started();
    return new Promise<Result.Result<string, Failure>>((resolve) => {
      signal.addEventListener("abort", () => resolve(Result.succeed("late")), { once: true });
    });
  }, { timeoutMs: 1000, signal: controller.signal });
  await ready;
  controller.abort();
  assert.equal(decision(await pending).code, "unknown_effect");
});

test("late rejection after timeout is observed without changing the outcome", async () => {
  let reject!: (error: Error) => void;
  const out = await executeAttempt(context({ recovery: "reconcile_first" }),
    () => new Promise<Result.Result<never, Failure>>((_, fail) => { reject = fail; }), { timeoutMs: 10 });
  reject(new Error("late private detail"));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(decision(out).code, "unknown_effect");
});

test("expired, exhausted and over-budget requests never dispatch", async () => {
  for (const overrides of [{ deadlineAt: Date.now() - 1 }, { budgetExhausted: true }, { attempt: 4 }]) {
    let calls = 0;
    const out = await executeAttempt(context(overrides), async () => {
      calls++; return Result.succeed(1);
    }, { timeoutMs: 1000 });
    assert.equal(decision(out).action, "escalate");
    assert.equal(calls, 0);
  }
});

test("an operation that blocks the event loop cannot publish success past its cutoff", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const out = await executeAttempt(context(), async () => {
    now += 100;
    return Result.succeed("too late");
  }, { timeoutMs: 10 });
  assert.equal(decision(out).code, "timeout");
});

test("policy is snapshotted so an operation cannot extend its own retry budget", async () => {
  const c = context({ attempt: 3 });
  const out = await executeAttempt(c, async () => {
    c.maxAttempts = 999;
    return Result.fail({ kind: "transient", effect: "not_started" });
  }, { timeoutMs: 1000 });
  assert.equal(decision(out).code, "attempts_exhausted");
});

test("invalid configuration rejects before invocation", async () => {
  let calls = 0;
  for (const timeoutMs of [0, -1, Infinity, 2_147_483_648]) {
    await assert.rejects(executeAttempt(context(), async () => {
      calls++; return Result.succeed(1);
    }, { timeoutMs }), TypeError);
  }
  assert.equal(calls, 0);
});

test("malformed adapter results become a safe internal error", async () => {
  const out = await executeAttempt(context(), async () => Result.fail({ kind: "untrusted classification", effect: "unknown" }) as unknown as Result.Result<never, Failure>,
  { timeoutMs: 1000 });
  assert.equal(decision(out).code, "internal_error");
});

test("malformed success discriminants cannot be accepted as a completed operation", async () => {
  for (const result of [{ ok: "true", value: "untrusted" }, { ok: true }]) {
    const out = await executeAttempt(context(), async () => result as unknown as Result.Result<string, Failure>,
      { timeoutMs: 1000 });
    assert.equal(decision(out).code, "internal_error");
  }
});

test("completion removes the caller abort subscription and ignores later cancellation", async () => {
  const controller = new AbortController();
  let operationSignal: AbortSignal | undefined;
  const out = await executeAttempt(context(), async (signal) => {
    operationSignal = signal;
    return Result.succeed(1);
  }, { timeoutMs: 1000, signal: controller.signal });
  assert.equal(out.status, "succeeded");
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  controller.abort();
  assert.equal(operationSignal?.aborted, false);
});

test("late success after timeout cannot overwrite the failure outcome", async () => {
  let complete!: (value: Result.Result<string, Failure>) => void;
  const out = await executeAttempt(context({ recovery: "reconcile_first" }),
    () => new Promise<Result.Result<string, Failure>>((resolve) => { complete = resolve; }), { timeoutMs: 10 });
  complete(Result.succeed("late receipt"));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(decision(out).code, "unknown_effect");
  if (out.status === "not_succeeded") assert.deepEqual(out.failure, { kind: "timeout", effect: "unknown" });
});

test("the final allowed attempt may still succeed", async () => {
  const out = await executeAttempt(context({ attempt: 3 }), async () => Result.succeed(1),
    { timeoutMs: 1000 });
  assert.equal(out.status, "succeeded");
});

test("late permission denial retains its classification rather than becoming retryable", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const out = await executeAttempt(context(), async () => {
    now += 100;
    return Result.fail({ kind: "permission_denied", effect: "not_started" });
  }, { timeoutMs: 10 });
  assert.equal(decision(out).code, "permission_denied");
});

test("concurrent cancellation prevents a returned transient failure from scheduling retry", async () => {
  const controller = new AbortController();
  const out = await executeAttempt(context(), async () => {
    // Queue abort after the work Promise settles but before its consumer continues.
    queueMicrotask(() => controller.abort());
    return Result.fail({ kind: "transient", effect: "not_started" });
  }, { timeoutMs: 1000, signal: controller.signal });
  assert.equal(decision(out).action, "cancelled");
});
