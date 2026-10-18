// tests/unit/app-update-patience.test.ts: the banner's tap never sits on 'Updating…' (his Postern screenshot
// 2026-10-18, class from TradeTracker mw-iy99ci.20): if the new worker has not taken over within the patience,
// the page reloads anyway, once, whether or not a worker still waits.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyUpdate, getUpdateState, startAppUpdates, TAKE_OVER_PATIENCE_MS, type AppUpdates } from '../../src/services/appUpdate';
import { fakeSetup, fakeWorker } from '../support/fake-registration';

let updates: AppUpdates | undefined;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  updates?.stop();
  vi.useRealTimers();
});

function tapped(setup = fakeSetup({ waiting: fakeWorker() })) {
  updates = startAppUpdates({ container: setup.container, registration: setup.registration, reload: setup.reload });
  expect(getUpdateState()).toBe('ready');
  applyUpdate();
  expect(getUpdateState()).toBe('updating');
  return setup;
}

describe('the tap on the update banner', () => {
  it('reloads once when no controllerchange comes within the patience and the worker still waits', async () => {
    const setup = tapped();
    await vi.advanceTimersByTimeAsync(TAKE_OVER_PATIENCE_MS - 1);
    expect(setup.reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(setup.reload).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(TAKE_OVER_PATIENCE_MS * 3);
    expect(setup.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads once when no controllerchange comes within the patience and no worker waits any more', async () => {
    const setup = tapped();
    setup.registration.waiting = null;
    await vi.advanceTimersByTimeAsync(TAKE_OVER_PATIENCE_MS);
    expect(setup.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads exactly once when the controller changes within the patience', async () => {
    const setup = tapped();
    await vi.advanceTimersByTimeAsync(TAKE_OVER_PATIENCE_MS / 2);
    setup.controllerChanges();
    expect(setup.reload).toHaveBeenCalledTimes(1);
    setup.controllerChanges();
    await vi.advanceTimersByTimeAsync(TAKE_OVER_PATIENCE_MS * 3);
    expect(setup.reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload by patience when no tap was made', async () => {
    const setup = fakeSetup({ waiting: fakeWorker() });
    updates = startAppUpdates({ container: setup.container, registration: setup.registration, reload: setup.reload });
    await vi.advanceTimersByTimeAsync(TAKE_OVER_PATIENCE_MS * 3);
    expect(setup.reload).not.toHaveBeenCalled();
  });
});
