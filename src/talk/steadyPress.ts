// src/talk/steadyPress.ts — a swipe never starts a hold on Hold to talk (mw-5r3p30.930). The kit's bar (touch-action: none) begins a hold at the touch's first
// instant, so a scroll capture's synthetic swipe, or a thumb that goes down on the bar and on up the screen, opened the microphone. A TOUCH on the bar is held back for
// STEADY_MS and let through (replayed as the same pointerdown) only if it is still down and has not moved past STEADY_SLOP_PX; a touch that lifts first is replayed
// at once, so a quick tap (Tap to talk) is still a tap. A moved touch is swallowed: nothing begins. A mouse, a pen and the keyboard are not held back (they do not
// scroll the page). The bar is voice-kit's, so this stands outside it, on the element that holds it, in the capture phase.

/** How long a touch must stay put before it is a press. */
export const STEADY_MS = 120;
/** How far a touch may wander and still be a press (Android's own touch slop is 8 dp). */
export const STEADY_SLOP_PX = 8;
/** What the kit calls its bar. */
const BAR = '.bk-composer__bar';

interface Waiting {
  pointerId: number;
  x: number;
  y: number;
  bar: Element;
  init: PointerEventInit;
  timer: ReturnType<typeof setTimeout>;
}

/** Watches the bars inside `root`; returns the function that stops. */
export function holdBackSwipes(root: HTMLElement): () => void {
  const replayed = new WeakSet<Event>();
  let waiting: Waiting | undefined;
  const drop = (): void => {
    if (waiting) clearTimeout(waiting.timer);
    waiting = undefined;
  };
  const replay = (): void => {
    const taken = waiting;
    drop();
    if (!taken || !taken.bar.isConnected) return;
    const again = new PointerEvent('pointerdown', taken.init);
    replayed.add(again);
    taken.bar.dispatchEvent(again);
  };
  const onDown = (event: PointerEvent): void => {
    if (replayed.has(event) || event.pointerType !== 'touch') return;
    const bar = event.target instanceof Element ? event.target.closest(BAR) : null;
    if (!bar) return;
    event.stopPropagation();
    drop();
    waiting = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      bar,
      init: {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        buttons: event.buttons,
      },
      timer: setTimeout(replay, STEADY_MS),
    };
  };
  const onMove = (event: PointerEvent): void => {
    if (waiting && event.pointerId === waiting.pointerId && Math.hypot(event.clientX - waiting.x, event.clientY - waiting.y) > STEADY_SLOP_PX) drop();
  };
  // lifted before the wait was over: it was a tap, so the press goes first and the lift follows it
  const onUp = (event: PointerEvent): void => {
    if (waiting && event.pointerId === waiting.pointerId) replay();
  };
  const onCancel = (event: PointerEvent): void => {
    if (waiting && event.pointerId === waiting.pointerId) drop();
  };
  root.addEventListener('pointerdown', onDown, true);
  root.addEventListener('pointermove', onMove, true);
  root.addEventListener('pointerup', onUp, true);
  root.addEventListener('pointercancel', onCancel, true);
  return () => {
    drop();
    root.removeEventListener('pointerdown', onDown, true);
    root.removeEventListener('pointermove', onMove, true);
    root.removeEventListener('pointerup', onUp, true);
    root.removeEventListener('pointercancel', onCancel, true);
  };
}
