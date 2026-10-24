import assert from "node:assert/strict";
import { test } from "node:test";
import { Effect, Result, Schema } from "effect";
import { AttemptContext, AttemptOutcome, Failure, FailureDecision, isOperationResult } from "../src/contracts.ts";
import { executeAttempt, fromPromiseOperation } from "../src/execute-attempt.ts";
import { context } from "./fixtures.ts";

test("context schema rejects malformed data, unsafe integers and inconsistent backoff", () => {
  const isContext = Schema.is(AttemptContext);
  assert.equal(isContext(context()), true);
  for (const input of [null, {}, context({ owner: "   " }), context({ attempt: 1.5 }),
    context({ deadlineAt: Number.MAX_SAFE_INTEGER + 1 }), context({ maxBackoffMs: 1 }),
    { ...context(), budgetExhausted: "false" }, { ...context(), recovery: "guess" }]) {
    assert.equal(isContext(input), false);
  }
});

test("schema decoding strips unrelated context fields without granting authority", async () => {
  const decoded = await Effect.runPromise(Schema.decodeUnknownEffect(AttemptContext)({
    ...context(), administrator: true, secret: "private-data",
  }));
  assert.equal(Object.hasOwn(decoded, "administrator"), false);
  assert.equal(Object.hasOwn(decoded, "secret"), false);
});

test("failure schema rejects invalid kinds, uncertain-effect labels and retry delays", () => {
  const isFailure = Schema.is(Failure);
  for (const input of [null, { kind: "guessed", effect: "unknown" },
    { kind: "timeout", effect: "probably_not_started" },
    { kind: "timeout", effect: "unknown", retryAfterMs: -1 },
    { kind: "timeout", effect: "unknown", retryAfterMs: Infinity },
    { kind: "timeout", effect: "unknown", retryAfterMs: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.equal(isFailure(input), false);
  }
});

test("built-in Result schema rejects plain lookalikes and invalid failure payloads", () => {
  assert.equal(isOperationResult(Result.succeed("report")), true);
  assert.equal(isOperationResult(Result.fail({ kind: "timeout", effect: "unknown" })), true);
  assert.equal(isOperationResult({ _tag: "Success", success: "forged" }), false);
  assert.equal(isOperationResult(Result.fail({ kind: "timeout", effect: "maybe" })), false);
});

test("Schema.Result validates concrete success payloads and provides the JSON codec", () => {
  const schema = Schema.Result(Schema.Struct({ sku: Schema.String, available: Schema.Boolean }), Failure);
  const codec = Schema.toCodecJson(schema);
  const decode = Schema.decodeUnknownSync(codec);
  const encoded = Schema.encodeSync(codec)(Result.succeed({ sku: "printer-30", available: true }));
  assert.deepEqual(encoded, { _tag: "Success", success: { sku: "printer-30", available: true } });
  const decoded = decode(encoded);
  assert.equal(Result.isSuccess(decoded), true);
  if (Result.isSuccess(decoded)) assert.equal(decoded.success.sku, "printer-30");
  assert.throws(() => decode({ _tag: "Success", success: { sku: 30, available: "yes" } }));
});

test("schema parser issues are sanitized when an adapter is used by the executor", async () => {
  const out = await executeAttempt(context(), async () => {
    const decoded = Schema.decodeUnknownSync(Schema.Struct({ amount: Schema.Int }))({ amount: "private-salary" });
    return Result.succeed(decoded);
  }, { timeoutMs: 1000 });
  assert.equal(out.status, "not_succeeded");
  if (out.status === "not_succeeded") assert.equal(out.decision.code, "internal_error");
  assert.equal(JSON.stringify(out).includes("private-salary"), false);
});

test("Promise bridge converts Result directly into Effect's success and error channels", async () => {
  assert.equal(await Effect.runPromise(fromPromiseOperation(async () => Result.succeed("report"))), "report");
  const failure = { kind: "permission_denied", effect: "not_started" } as const;
  const out = await Effect.runPromise(Effect.result(fromPromiseOperation(async () => Result.fail(failure))));
  assert.equal(Result.isFailure(out), true);
  if (Result.isFailure(out)) assert.deepEqual(out.failure, failure);
});

test("outcome schema validates the actual operation value and branch-specific fields", () => {
  const isOutcome = Schema.is(AttemptOutcome(Schema.Struct({ total: Schema.Int })));
  const ids = { requestId: "r", operationId: "o", attemptId: "a" };
  assert.equal(isOutcome({ ...ids, status: "succeeded", value: { total: 30 } }), true);
  assert.equal(isOutcome({ ...ids, status: "succeeded", value: { total: "30" } }), false);
  assert.equal(Schema.is(FailureDecision)({ action: "wait", code: "device_offline", deadlineAt: 100 }), false);
  assert.equal(Schema.is(FailureDecision)({ action: "retry", code: "permission_denied", retryAt: 100,
    nextAction: "retry with another identity" }), false);
});
