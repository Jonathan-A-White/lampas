// src/events/bus.ts — the one typed pub-sub screens talk through instead of calling each other. A screen
// publishes what happened; any screen subscribes to the kinds it cares about. The last event of each kind is
// kept, so a screen that mounts late still knows the current verse. docs/events.md lists every kind.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ReaderView, ReadingLayout, SectionHeadings, Weave } from '../data/repositories';
import type { GreekPronunciation } from '../speech/pronunciation';

export type AppEvent =
  /** `verse` is null when no verse is selected any more (the same verse tapped again, or the reader left) */
  | { kind: 'verse-selected'; chapter: number; verse: number | null }
  | { kind: 'view-changed'; view: ReaderView }
  | { kind: 'weave-changed'; weave: Weave }
  | { kind: 'layout-changed'; layout: ReadingLayout }
  | { kind: 'headings-changed'; headings: SectionHeadings }
  /** the voices he chose in Settings, as the phone's voiceURI; null is the phone's default */
  | { kind: 'voices-changed'; english: string | null; greek: string | null }
  | { kind: 'pronunciation-changed'; pronunciation: GreekPronunciation }
  | { kind: 'verse-reading'; chapter: number; verse: number }
  | { kind: 'reading-stopped' }
  | { kind: 'word-tapped'; strongs: string; verse: number };

export type EventKind = AppEvent['kind'];
export type EventOf<K extends EventKind> = Extract<AppEvent, { kind: K }>;
type Listener<K extends EventKind> = (event: EventOf<K>) => void;

const listeners = new Map<EventKind, Set<Listener<EventKind>>>();
const last = new Map<EventKind, AppEvent>();

/** Tells every listener of `event.kind`, in the order they subscribed. A listener that throws is logged and the
 * others still hear it. */
export function publish(event: AppEvent): void {
  last.set(event.kind, event);
  for (const listener of [...(listeners.get(event.kind) ?? [])]) {
    try {
      (listener as Listener<EventKind>)(event);
    } catch (error) {
      console.error(`event listener for ${event.kind} threw`, error);
    }
  }
}

/** Calls `listener` on each later event of `kind`; returns the unsubscribe. It is not called with an event
 * published before (ask `latest` for that). */
export function subscribe<K extends EventKind>(kind: K, listener: Listener<K>): () => void {
  // A new entry per call, so subscribing the same function twice is two subscriptions.
  const entry = ((event) => listener(event as EventOf<K>)) as Listener<EventKind>;
  const set = listeners.get(kind) ?? new Set();
  set.add(entry);
  listeners.set(kind, set);
  return () => void set.delete(entry);
}

/** The last event published of `kind`, or undefined if none has been. */
export function latest<K extends EventKind>(kind: K): EventOf<K> | undefined {
  return last.get(kind) as EventOf<K> | undefined;
}

/** Forgets every listener and every kept event: for tests. */
export function clearBus(): void {
  listeners.clear();
  last.clear();
}

/** Calls `listener` on each event of `kind` while the component is mounted. The latest `listener` is called, so
 * it needs no useCallback. */
export function useEvent<K extends EventKind>(kind: K, listener: Listener<K>): void {
  const current = useRef(listener);
  useEffect(() => {
    current.current = listener;
  });
  useEffect(() => subscribe(kind, (event) => current.current(event)), [kind]);
}

/** The last event of `kind`, re-rendering when another comes: a screen that mounts late starts from it. */
export function useLatest<K extends EventKind>(kind: K): EventOf<K> | undefined {
  return useSyncExternalStore(
    (notify) => subscribe(kind, notify),
    () => latest(kind),
    () => latest(kind),
  );
}
