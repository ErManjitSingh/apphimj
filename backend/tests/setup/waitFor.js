/**
 * Poll `conditionFn` until it returns a truthy value or `timeoutMs` elapses.
 *
 * Needed because the beacon endpoint deliberately responds (204) BEFORE awaiting
 * its background UserSession write (a real page-unload beacon must never be held
 * up waiting on a DB round trip) — so `await request(app).post('/session/beacon')`
 * resolving is not proof the write has landed yet. Under light load the write
 * usually wins the race before the test's next statement runs; under heavier load
 * (e.g. three test files' worth of mongodb-memory-server instances competing for
 * CPU in one process) it occasionally doesn't, producing an intermittent failure
 * that has nothing to do with the beacon/reconciliation logic itself. Polling with
 * a short bounded timeout — instead of trusting the HTTP response's timing, and
 * instead of a single fixed sleep — is the standard fix for this class of
 * fire-and-forget race and keeps the test deterministic without weakening what
 * it actually asserts.
 */
async function waitFor(conditionFn, { timeoutMs = 2000, intervalMs = 10 } = {}) {
  const start = Date.now();
  for (;;) {
    const result = await conditionFn();
    if (result) return result;
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

module.exports = { waitFor };
