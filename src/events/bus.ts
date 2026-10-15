// src/events/bus.ts — the one typed pub-sub screens talk through instead of calling each other. A screen
// publishes what happened; any screen subscribes to the kinds it cares about. The last event of each kind is
// kept, so a screen that mounts late still knows the current verse. docs/events.md lists every kind; a kind is declared in its
// domain's file under src/events/kinds/, never here.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { SettingsEvent } from './kinds/settings';
import type { ReaderEvent } from './kinds/reader';
import type { LearningEvent } from './kinds/learning';
import type { TalkEvent } from './kinds/talk';

export type AppEvent = SettingsEvent | ReaderEvent | LearningEvent | TalkEvent;

export type EventKind = AppEvent['kind'];
export type EventOf<K extends EventKind> = Extract<AppEvent, Record<'kind', K>>;
type Listener<K extends EventKind> = (event: EventOf<K>) => void;

const listeners = new Map<EventKind, Set<Listener<EventKind>>>();
const last = new Map<EventKind, AppEvent>();
/** the last setting-changed of each setting, by its key: one kind carries every setting */
const lastSetting = new Map<string, EventOf<'setting-changed'>>();
const everyListeners = new Set<(event: AppEvent) => void>();

/** Tells every listener of `event.kind`, in the order they subscribed. A listener that throws is logged and the
 * others still hear it. */
export function publish(event: AppEvent): void {
  last.set(event.kind, event);
  if (event.kind === 'setting-changed') lastSetting.set(event.key, event);
  const calls = [...(listeners.get(event.kind) ?? [])].map((l) => () => (l as Listener<EventKind>)(event));
  for (const every of [...everyListeners]) calls.push(() => every(event));
  for (const call of calls) {
    try {
      call();
    } catch (error) {
      console.error(`event listener for ${event.kind} threw`, error);
    }
  }
}

/** Calls `listener` on each later event of any kind, after the listeners of its kind; returns the unsubscribe. For things that
 * count what happens (src/tips/usageLog.ts), not for screens. */
export function subscribeAll(listener: (event: AppEvent) => void): () => void {
  const entry = (event: AppEvent) => listener(event);
  everyListeners.add(entry);
  return () => void everyListeners.delete(entry);
}

/** Calls `listener` on each later event of `name`; returns the unsubscribe. It is not called with an event
 * published before (ask `latest` for that). */
export function subscribe<K extends EventKind>(name: K, listener: Listener<K>): () => void {
  // A new entry per call, so subscribing the same function twice is two subscriptions.
  const entry = ((event) => listener(event as EventOf<K>)) as Listener<EventKind>;
  const set = listeners.get(name) ?? new Set();
  set.add(entry);
  listeners.set(name, set);
  return () => void set.delete(entry);
}

/** The last event published of `name`, or undefined if none has been. */
export function latest<K extends EventKind>(name: K): EventOf<K> | undefined {
  return last.get(name) as EventOf<K> | undefined;
}

/** The last setting-changed of the setting `key`, or undefined if none has been (`latest('setting-changed')` is of any setting). */
export function latestSetting(key: string): EventOf<'setting-changed'> | undefined {
  return lastSetting.get(key);
}

/** Forgets every listener and every kept event: for tests. */
export function clearBus(): void {
  listeners.clear();
  everyListeners.clear();
  last.clear();
  lastSetting.clear();
}

/** Calls `listener` on each event of `name` while the component is mounted. The latest `listener` is called, so
 * it needs no useCallback. */
export function useEvent<K extends EventKind>(name: K, listener: Listener<K>): void {
  const current = useRef(listener);
  useEffect(() => {
    current.current = listener;
  });
  useEffect(() => subscribe(name, (event) => current.current(event)), [name]);
}

/** The last event of `name`, re-rendering when another comes: a screen that mounts late starts from it. */
export function useLatest<K extends EventKind>(name: K): EventOf<K> | undefined {
  return useSyncExternalStore(
    (notify) => subscribe(name, notify),
    () => latest(name),
    () => latest(name),
  );
}
