// src/services/appUpdate.ts — a new build of Postern waits behind the one in control until he taps
// (mw-yxwtth.1): the banner (src/cockpit/UpdateBanner.tsx) shows while a worker is waiting, the tap
// posts {type:'SKIP_WAITING'} to it (src/sw.ts skips waiting and, on activate, claims the windows) and
// the page reloads ONCE when the controller changes, only if he asked: a first install claiming the
// page, or another tab's update, never reloads this one. If the new worker has not taken over a few
// seconds after the tap, the page reloads anyway, so the banner never sits on 'Updating…' (mw-0cdbia). The app also asks the browser whether there is
// a new build on start, on return to the foreground and every 30 minutes, so a phone that keeps
// Postern open for days still finds out.
// A waiting build with nothing new to show him (the changelog has no entry after the running version, mw-5r3p30.236)
// is never offered: no banner, and it takes over by itself, at start-up or when the app is hidden, never while he
// uses it; the page then reloads (hidden, or at start-up). A take-over that did not happen is asked for again at the next hide.
// One that lands after he came back (the worker held by a slow request) reloads the page at the next hide (mw-5r3p30.304),
// so the page does not run the old build under the new worker until the next cold start.
// When the changelog cannot be read the banner shows as usual.
import { useSyncExternalStore } from 'react';
import { summarise, type ChangelogEntry } from 'pwa-kit/whats-new';

/** How often a running app asks whether a newer build is up. */
export const UPDATE_CHECK_EVERY_MS = 30 * 60_000;

/** How long a tap waits for the new worker to take over before the page reloads anyway. */
export const TAKE_OVER_PATIENCE_MS = 3_000;

export type UpdateState = 'none' | 'ready' | 'updating';

interface WorkerLike {
  state: ServiceWorkerState;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
}

export interface UpdateContainer {
  controller: unknown;
  addEventListener(type: 'controllerchange', listener: () => void): void;
  removeEventListener(type: 'controllerchange', listener: () => void): void;
}

export interface UpdateRegistration {
  waiting: WorkerLike | null;
  installing: WorkerLike | null;
  update(): Promise<unknown>;
  addEventListener(type: 'updatefound', listener: () => void): void;
  removeEventListener(type: 'updatefound', listener: () => void): void;
}

/** Reads the waiting build's changelog (src/whatsNew/useAppChangelog.ts asks the server fresh); rejects when it cannot. */
export type ReadChangelog = () => Promise<ChangelogEntry[] | null>;

export interface AppUpdates {
  /** Tells the waiting worker to take over; the page reloads once it has. */
  apply(): void;
  /** Asks the browser now whether a newer build is up. */
  checkNow(): void;
  stop(): void;
}

let state: UpdateState = 'none';
let active: AppUpdates | undefined;
const listeners = new Set<() => void>();

function setState(next: UpdateState): void {
  if (state === next) return;
  state = next;
  for (const listener of [...listeners]) listener();
}

/** The banner's state: nothing waiting, a build ready to take, or the tap made and the worker taking over. */
export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => state,
  );
}

/** The state now, for code that is not a component. */
export function getUpdateState(): UpdateState {
  return state;
}

/** The tap on the banner. */
export function applyUpdate(): void {
  active?.apply();
}

/** Watches `registration` for a waiting worker and looks for a newer build now, on return to the foreground and every 30 minutes. */
export function startAppUpdates(deps: {
  container: UpdateContainer;
  registration: UpdateRegistration;
  reload: () => void;
  /** Without it a waiting build is always offered. */
  changelog?: ReadChangelog;
  /** The running build's plain version: an entry after it is something new to show. */
  version?: string;
}): AppUpdates {
  const { container, registration, reload, changelog, version } = deps;
  active?.stop();
  let asked = false;
  let patience: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  // A build with nothing to show: the worker that is to take over quietly, and whether the page reloads when it has.
  let quiet: WorkerLike | undefined;
  let quietAsked: 'start-up' | 'hidden' | undefined;
  // A quiet take-over landed while he used the app: the page reloads the next time it is hidden.
  let reloadWhenHidden = false;
  // The worker whose changelog is being read or was read.
  let judged: WorkerLike | undefined;
  const atStart = registration.waiting;

  const hidden = () => document.visibilityState === 'hidden';

  const takeOverQuietly = () => {
    const worker = quiet;
    if (!worker) return;
    // No longer waiting: it took over (or was replaced), so there is nothing left to ask for.
    if (registration.waiting !== worker) {
      quiet = undefined;
      return;
    }
    // At start-up (the worker was already waiting when the app opened) or hidden: never while he uses it.
    const atStartUp = worker === atStart && !hidden();
    if (!atStartUp && !hidden()) return;
    // `quiet` stays until the worker has left the waiting place: a take-over that did not happen is asked for at the next hide.
    quietAsked = atStartUp ? 'start-up' : 'hidden';
    worker.postMessage({ type: 'SKIP_WAITING' });
  };

  const offer = () => {
    if (state === 'none') setState('ready');
  };

  const judge = (worker: WorkerLike) => {
    if (judged === worker) return;
    judged = worker;
    if (!changelog || !version) return offer();
    changelog().then(
      (entries) => {
        if (stopped || registration.waiting !== worker) return;
        if (!entries || summarise(entries, version)) return offer();
        quiet = worker;
        takeOverQuietly();
      },
      () => {
        if (!stopped && registration.waiting === worker) offer();
      },
    );
  };

  const syncWaiting = () => {
    // The first worker ever has nothing to wait behind: it activates, and claims the page.
    if (registration.waiting && container.controller) judge(registration.waiting);
    else if (!asked) setState('none');
  };

  const onFound = () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') syncWaiting();
    });
  };

  // Reloads at most once per tap: on the controller change, or when the patience runs out first.
  const reloadOnce = () => {
    if (!asked) return;
    asked = false;
    clearTimeout(patience);
    reload();
  };

  const onControllerChange = () => {
    if (quietAsked) {
      // a quiet take-over reloads only out of his sight: he may have come back since the worker was told
      const mode = quietAsked;
      quietAsked = undefined;
      if (mode === 'start-up' || hidden()) reload();
      else reloadWhenHidden = true;
      return;
    }
    reloadOnce();
  };

  const checkNow = () => {
    // Offline, or the server is down: the next check tries again.
    void Promise.resolve(registration.update()).catch(() => undefined);
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') checkNow();
    else if (reloadWhenHidden) {
      reloadWhenHidden = false;
      reload();
    } else takeOverQuietly();
  };

  registration.addEventListener('updatefound', onFound);
  container.addEventListener('controllerchange', onControllerChange);
  document.addEventListener('visibilitychange', onVisible);
  const every = setInterval(checkNow, UPDATE_CHECK_EVERY_MS);
  onFound();
  syncWaiting();
  checkNow();

  const updates: AppUpdates = {
    apply() {
      const worker = registration.waiting;
      if (state !== 'ready' || !worker) return;
      asked = true;
      setState('updating');
      worker.postMessage({ type: 'SKIP_WAITING' });
      clearTimeout(patience);
      patience = setTimeout(reloadOnce, TAKE_OVER_PATIENCE_MS);
    },
    checkNow,
    stop() {
      stopped = true;
      registration.removeEventListener('updatefound', onFound);
      container.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(every);
      clearTimeout(patience);
      if (active === updates) {
        active = undefined;
        asked = false;
        setState('none');
      }
    },
  };
  active = updates;
  return updates;
}
