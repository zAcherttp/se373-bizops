import assert from "node:assert/strict";
import { test } from "node:test";
import { Cause, Context, Deferred, Effect, Exit, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { executeAttemptEffect } from "../src/execute-attempt.ts";
import type { Failure } from "../src/failure-policy.ts";
import { context } from "./fixtures.ts";

test("native API composes successful effects without result envelopes", async () => {
  const out = await Effect.runPromise(executeAttemptEffect(context(), Effect.succeed("report"), { timeoutMs: 1000 }));
  assert.equal(out.status, "succeeded");
  if (out.status === "succeeded") assert.equal(out.value, "report");
});

test("native expected failures use the typed error channel", async () => {
  const operation = Effect.fail<Failure>({ kind: "approval_required", effect: "not_started" });
  const out = await Effect.runPromise(executeAttemptEffect(context(), operation, { timeoutMs: 1000 }));
  assert.equal(out.status, "not_succeeded");
  if (out.status === "not_succeeded") assert.equal(out.decision.action, "wait");
});

test("native defects escalate without exposing their contents", async () => {
  const out = await Effect.runPromise(executeAttemptEffect(context(),
    Effect.die(new Error("private-token")), { timeoutMs: 1000 }));
  assert.equal(out.status, "not_succeeded");
  if (out.status === "not_succeeded") assert.equal(out.decision.code, "internal_error");
  assert.equal(JSON.stringify(out).includes("private-token"), false);
});

test("invalid native configuration remains a typed TypeError before execution", async () => {
  let invoked = false;
  const exit = await Effect.runPromiseExit(executeAttemptEffect(context(),
    Effect.sync(() => { invoked = true; }), { timeoutMs: 0 }));
  assert.equal(Exit.isFailure(exit), true);
  if (Exit.isFailure(exit)) assert.equal(Cause.hasFails(exit.cause), true);
  assert.equal(invoked, false);
});

test("native timeout uses TestClock and releases acquired resources before returning", async () => {
  let releases = 0;
  const outcome = await Effect.runPromise(Effect.gen(function* () {
    const operation = Effect.acquireUseRelease(
      Effect.succeed("resource"),
      () => Effect.never,
      () => Effect.sync(() => { releases++; }),
    );
    const fiber = yield* Effect.forkChild(executeAttemptEffect(
      context({ deadlineAt: 60_000, recovery: "reconcile_first" }), operation, { timeoutMs: 1000 },
    ));
    yield* TestClock.adjust(1000);
    return yield* Fiber.join(fiber);
  }).pipe(Effect.provide(TestClock.layer())));
  assert.equal(outcome.status, "not_succeeded");
  if (outcome.status === "not_succeeded") assert.equal(outcome.decision.code, "unknown_effect");
  assert.equal(releases, 1);
});

test("parent interruption propagates to the supervisor and runs the operation finalizer", async () => {
  let releases = 0;
  const exit = await Effect.runPromise(Effect.gen(function* () {
    const started = yield* Deferred.make<void>();
    const operation = Effect.acquireUseRelease(
      Effect.void,
      () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
      () => Effect.sync(() => { releases++; }),
    );
    const fiber = yield* Effect.forkChild(executeAttemptEffect(context(), operation, { timeoutMs: 1000 }));
    yield* Deferred.await(started);
    yield* Fiber.interrupt(fiber);
    return yield* Fiber.await(fiber);
  }));
  assert.equal(Exit.isFailure(exit), true);
  if (Exit.isFailure(exit)) assert.equal(Cause.hasInterruptsOnly(exit.cause), true);
  assert.equal(releases, 1);
});

test("native operations retain dependency requirements for caller-provided services", async () => {
  const Catalog = Context.Service<{ read: Effect.Effect<string, Failure> }>("test/Catalog");
  const operation = Effect.flatMap(Catalog, (catalog) => catalog.read);
  const out = await Effect.runPromise(executeAttemptEffect(context(), operation, { timeoutMs: 1000 }).pipe(
    Effect.provideService(Catalog, { read: Effect.succeed("authorized catalog") }),
  ));
  assert.equal(out.status, "succeeded");
  if (out.status === "succeeded") assert.equal(out.value, "authorized catalog");
});

test("a finalizer defect cannot be hidden behind a retryable operation failure", async () => {
  const operation = Effect.acquireUseRelease(
    Effect.void,
    () => Effect.fail<Failure>({ kind: "transient", effect: "not_started" }),
    () => Effect.die(new Error("private finalizer failure")),
  );
  const out = await Effect.runPromise(executeAttemptEffect(context(), operation, { timeoutMs: 1000 }));
  assert.equal(out.status, "not_succeeded");
  if (out.status === "not_succeeded") assert.equal(out.decision.code, "internal_error");
  assert.equal(JSON.stringify(out).includes("private finalizer failure"), false);
});
