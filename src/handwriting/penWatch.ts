// src/handwriting/penWatch.ts — a web page sees a pen only once it touches (mw-86e9r1.51): a pointer event anywhere in Lampas whose pointerType is 'pen'
// marks 'pen seen' on the phone (data/repositories/handwriting.ts), and with Handwriting drills on Automatic Write it is offered from then on. App.tsx
// watches from its first draw; the watch lets go after the first pen.
import { markPenSeen } from '../data/repositories';

/** Watches the whole document for a pen; returns the unwatch. */
export function watchForPen(onPen: () => Promise<void> = markPenSeen): () => void {
  const seen = (event: PointerEvent): void => {
    if (event.pointerType !== 'pen') return;
    stop();
    void onPen().catch((error: unknown) => console.error('could not keep pen seen', error));
  };
  const stop = (): void => document.removeEventListener('pointerdown', seen, true);
  document.addEventListener('pointerdown', seen, true);
  return stop;
}
