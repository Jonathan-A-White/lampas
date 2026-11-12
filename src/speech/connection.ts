// src/speech/connection.ts — the one place that reads navigator.connection: is the phone on Wi-Fi?
// For the Bible voice choice "Recording on Wi-Fi only". Android Chrome says type 'wifi', 'ethernet', 'cellular', ...;
// iOS Safari and desktop browsers have no navigator.connection (or no type), and then the answer is null:
// the setting hides the Wi-Fi choice rather than guess.
export type ConnectionKind = 'wifi' | 'other' | null;

/** the part of navigator.connection read here (the Network Information API's `type`) */
export interface ConnectionLike {
  type?: string;
}

/** undefined: read navigator.connection; null or an object: a test's stand-in for it */
let fake: ConnectionLike | null | undefined;

/** For tests: stand in for navigator.connection (null = the phone has none); undefined gives the real one back. */
export function setConnectionForTests(connection: ConnectionLike | null | undefined): void {
  fake = connection;
}

function current(): ConnectionLike | null {
  if (fake !== undefined) return fake;
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { connection?: ConnectionLike }).connection ?? null;
}

/** 'wifi' on Wi-Fi or Ethernet, 'other' on any other named link, null when the phone does not say. */
export function connectionKind(): ConnectionKind {
  const type = current()?.type;
  if (typeof type !== 'string') return null;
  return type === 'wifi' || type === 'ethernet' ? 'wifi' : 'other';
}

/** Calls `listener` when the phone's connection changes (navigator.connection 'change'); returns the unsubscribe. A phone with no such event never calls it. */
export function onConnectionChange(listener: () => void): () => void {
  const target = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { connection?: EventTarget }).connection;
  if (!target || typeof target.addEventListener !== 'function') return () => undefined;
  target.addEventListener('change', listener);
  return () => target.removeEventListener('change', listener);
}
