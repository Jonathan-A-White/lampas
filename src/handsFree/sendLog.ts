// src/handsFree/sendLog.ts — sending what Hands-free heard to the makers (mw-5r3p30.1231): the wake log (wakeLog.ts) as one feedback grist, through the one sender
// (src/services/feedback.ts sendHandsFreeLog, the path of the tutor's 'Send this to the makers'). Two ways: the button 'Send what Hands-free heard' under Settings,
// Hands-free (src/settings/controls/voice.tsx), and, so he can send it in the car without looking, three fingers held on the screen for HOLD_MS while Hands-free
// is on (watchThreeFingerHold, from src/handsFree/HandsFreeGate.tsx), which says "Sent" aloud, or "Not sent" and why.
import { buildHandsFreeLogRequest, sendHandsFreeLog } from '../services/feedback';
import { speakText } from '../speech/greek';
import { SAID_KEY } from './playback';
import { holdMs, listeningNow, wakeLogLines } from './wakeLog';

/** The button's words. */
export const SEND_LOG_LABEL = 'Send what Hands-free heard';

/** What is shown and said once the makers have it. */
export const SENT_ALOUD = 'Sent';

/** What is said before the reason when it could not be sent. */
export const NOT_SENT_ALOUD = 'Not sent.';

/** Sends the wake log as it is now. Throws a TutorError when it could not be sent. */
export async function sendWhatHandsFreeHeard(): Promise<void> {
  const where = listeningNow();
  const summary = where ? `Hands-free: ${where.split(';')[0]}` : 'Hands-free: the wake listens on no input now';
  const browser = typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent;
  await sendHandsFreeLog(buildHandsFreeLogRequest(wakeLogLines(), summary, browser));
}

/** Sends it and says aloud whether it went: the long press's way, for a phone he does not look at. */
export async function sendAndSay(): Promise<void> {
  let said: string;
  try {
    await sendWhatHandsFreeHeard();
    said = SENT_ALOUD;
  } catch (err) {
    said = `${NOT_SENT_ALOUD} ${err instanceof Error ? err.message : ''}`.trim();
  }
  speakText(said, SAID_KEY, { language: 'english' });
}

/** How far a finger may move and still be part of the long press, in px (the three-finger tap's). */
const HOLD_MOVE_PX = 10;

interface Point {
  identifier: number;
  clientX: number;
  clientY: number;
}

const points = (list: TouchList | undefined): Point[] => (list ? Array.from({ length: list.length }, (_, i) => list[i]) : []);

/**
 * Calls `onHold` when exactly three fingers are held down for holdMs() (wakeLog.ts HOLD_MS) and none moves more than HOLD_MOVE_PX: longer than the three-finger
 * tap (voice-kit, 400 ms), so the two never both fire. A touch that starts on something with finger gestures of its own (`skip`) is left alone. Returns how to stop.
 */
export function watchThreeFingerHold(element: EventTarget, onHold: () => void, options: { skip?: (target: EventTarget | null) => boolean } = {}): () => void {
  const starts = new Map<number, Point>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let skipped = false;
  const cancel = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const onStart = (event: Event): void => {
    const e = event as TouchEvent;
    const down = points(e.touches);
    if (down.length <= points(e.changedTouches).length) {
      starts.clear();
      skipped = options.skip?.(event.target) ?? false;
    }
    if (skipped) return;
    for (const p of points(e.changedTouches)) starts.set(p.identifier, p);
    cancel();
    if (down.length === 3) timer = setTimeout(() => ((timer = null), onHold()), holdMs());
  };
  const onMove = (event: Event): void => {
    if (timer === null) return;
    for (const p of points((event as TouchEvent).changedTouches)) {
      const from = starts.get(p.identifier);
      if (from && Math.hypot(p.clientX - from.clientX, p.clientY - from.clientY) > HOLD_MOVE_PX) cancel();
    }
  };
  const onEnd = (): void => cancel();
  const passive = { passive: true };
  element.addEventListener('touchstart', onStart, passive);
  element.addEventListener('touchmove', onMove, passive);
  element.addEventListener('touchend', onEnd, passive);
  element.addEventListener('touchcancel', onEnd, passive);
  return () => {
    cancel();
    element.removeEventListener('touchstart', onStart);
    element.removeEventListener('touchmove', onMove);
    element.removeEventListener('touchend', onEnd);
    element.removeEventListener('touchcancel', onEnd);
  };
}
