// src/ui/keepInView.ts — moving a scrolling box so the one thing he needs is in it (mw-5r3p30.600). Every move scrolls the box and nothing else, by the box's own rectangles,
// so a phone turned or a speaking bar that takes room from the box changes only the numbers. The Talk sheet's keep-in-view effect (a failed send's message and Copy, the quiz
// goal's buttons, the bridge's Take me there, the lines of an answer) and the app-wide alert watcher (src/ui/alertInView.ts) call these.
/** How far inside the box's edge a thing is brought, in px. */
const GAP = 8;

/** Moves the box so `target`'s foot is in it, and no further than leaves `anchor`'s top in it (the anchor is the target itself unless a thing above it must stay too).
 * Only on, unless `up`: a target that is under the box's end (suggestions after a failure) is then brought up as well. */
export function revealFoot(box: HTMLElement, target: HTMLElement, anchor: HTMLElement = target, up = false): void {
  const room = box.getBoundingClientRect();
  const need = target.getBoundingClientRect().bottom - room.bottom + GAP;
  box.scrollTop += Math.min(up ? need : Math.max(0, need), anchor.getBoundingClientRect().top - room.top - GAP);
}

/** Moves the box on until `lines` lines of `text` (or all of it, when it is shorter) are in it, and no further than the text's own top at the box's top. */
export function revealLines(box: HTMLElement, text: HTMLElement, lines: number): void {
  const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
  if (!Number.isFinite(lineHeight)) return;
  const room = box.getBoundingClientRect();
  const at = text.getBoundingClientRect();
  const shown = Math.min(at.bottom, room.bottom) - Math.max(at.top, room.top);
  const want = Math.min(lines * lineHeight, at.height);
  if (shown < want) box.scrollTop += Math.min(want - shown, at.top - room.top);
}

/** Puts a thing in place with `place()` (one of the moves above) and keeps it there while the screen settles around it: the box or something in `watch` changes size (the speaking bar comes up, the phone is
 * turned, a font loads). It stops when `ms` pass or he touches or wheels the box, since his scroll is his. Call the returned function to stop. The Verse view's Ask box uses it (src/Ask.tsx). */
export function keepPlaced(box: HTMLElement, place: () => void, watch: HTMLElement[] = [], ms = 1500): () => void {
  place();
  if (typeof ResizeObserver === 'undefined') return () => undefined;
  const settle = new ResizeObserver(place);
  settle.observe(box);
  for (const el of watch) settle.observe(el);
  const stop = (): void => {
    settle.disconnect();
    window.clearTimeout(timer);
    box.removeEventListener('wheel', stop);
    box.removeEventListener('touchstart', stop);
  };
  const timer = window.setTimeout(stop, ms);
  box.addEventListener('wheel', stop, { once: true, passive: true });
  box.addEventListener('touchstart', stop, { once: true, passive: true });
  return stop;
}
