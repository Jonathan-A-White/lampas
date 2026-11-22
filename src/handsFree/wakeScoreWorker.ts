// src/handsFree/wakeScoreWorker.ts — the wake model's score of what an input hears, for the wake log (wakeLog.ts, mw-5r3p30.1231). The wake's own worker (voice-kit/wake)
// tells only a wake, never a score below it, so this runs the same detector a second time on the same samples and answers, when asked, the highest score since it was
// last asked. It is a worker so the page never waits on it.
import { createDetector, loadModel, type Detector, type WakeModel } from 'voice-kit/wake';

type ToScorer = { type: 'init'; model: WakeModel; inputRate: number } | { type: 'audio'; samples: Float32Array } | { type: 'best' };

const scope = self as unknown as { onmessage: ((event: MessageEvent<ToScorer>) => void) | null; postMessage(message: unknown): void };

let detector: Detector | null = null;
let best: number | null = null;

scope.onmessage = (event) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      detector = createDetector(loadModel(message.model), { inputRate: message.inputRate, keepScores: true });
      return;
    }
    if (message.type === 'best') {
      scope.postMessage({ type: 'best', best });
      best = null;
      return;
    }
    if (!detector) return;
    detector.push(message.samples);
    const scores = detector.scores;
    for (const score of scores) if (best === null || score > best) best = score;
    scores.length = 0;
  } catch {
    // a model it cannot read: no score, as if none was measured
    detector = null;
  }
};
