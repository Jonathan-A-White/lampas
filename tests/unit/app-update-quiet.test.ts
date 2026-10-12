// tests/unit/app-update-quiet.test.ts: a waiting build whose changelog has nothing newer than the running version is
// not offered to him (mw-5r3p30.236): it takes over by itself, at start-up or while the app is hidden, never while he
// uses it. A build with a line to show keeps the banner and waits for his tap. An unreadable changelog keeps the banner.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangelogEntry } from 'bsv-kit/whats-new';
import { getUpdateState, startAppUpdates, type AppUpdates, type UpdateState } from '../../src/services/appUpdate';
import { fakeSetup, fakeWorker } from '../support/fake-registration';

const RUNNING = '0.1.120';
const entry = (version: string): ChangelogEntry => ({ version, date: '2026-10-12', story: 'fx-1', kind: 'fixed', text: 'A line.' });
const NO_NEWER = [entry(RUNNING), entry('0.1.119')];
const NEWER = [entry('0.1.121'), entry(RUNNING)];

let updates: AppUpdates | undefined;
let visibility: DocumentVisibilityState = 'visible';

function hide(): void {
  visibility = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
}
const settle = () => vi.advanceTimersByTimeAsync(0);

/** What the banner would show right now. */
function stateOf(): UpdateState {
  return getUpdateState();
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
});
afterEach(() => {
  updates?.stop();
  vi.useRealTimers();
});

function start(setup: ReturnType<typeof fakeSetup>, changelog: () => Promise<ChangelogEntry[] | null>) {
  updates = startAppUpdates({ container: setup.container, registration: setup.registration, reload: setup.reload, changelog, version: RUNNING });
}

describe('a waiting build with nothing new to show', () => {
  it('shows no banner and takes over at start-up, then reloads once', async () => {
    const worker = fakeWorker();
    const setup = fakeSetup({ waiting: worker });
    start(setup, async () => NO_NEWER);
    await settle();
    expect(stateOf()).toBe('none');
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    setup.controllerChanges();
    expect(setup.reload).toHaveBeenCalledTimes(1);
  });

  it('found while he is using the app, is left waiting until the app is hidden, and no reload happens while visible', async () => {
    const setup = fakeSetup();
    start(setup, async () => NO_NEWER);
    await settle();
    const worker = setup.newWorkerWaits();
    await settle();
    expect(stateOf()).toBe('none');
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(setup.reload).not.toHaveBeenCalled();
    hide();
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    setup.controllerChanges();
    expect(setup.reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload if he came back before the new worker took control', async () => {
    const setup = fakeSetup();
    start(setup, async () => NO_NEWER);
    await settle();
    setup.newWorkerWaits();
    await settle();
    hide();
    visibility = 'visible';
    setup.controllerChanges();
    expect(setup.reload).not.toHaveBeenCalled();
  });
});

describe('a waiting build with something new to show', () => {
  it('shows the banner and applies nothing without his tap', async () => {
    const worker = fakeWorker();
    const setup = fakeSetup({ waiting: worker });
    start(setup, async () => NEWER);
    await settle();
    expect(stateOf()).toBe('ready');
    hide();
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(setup.reload).not.toHaveBeenCalled();
  });
});

describe('a changelog that cannot be read', () => {
  it('keeps the banner', async () => {
    const worker = fakeWorker();
    const setup = fakeSetup({ waiting: worker });
    start(setup, async () => {
      throw new Error('offline');
    });
    await settle();
    expect(stateOf()).toBe('ready');
    hide();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });
});
