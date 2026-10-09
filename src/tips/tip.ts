// src/tips/tip.ts — the shapes of the 'tips' grind (grinds/tips.*): the request the phone sends and the answer it gets back, and the guard
// the phone runs on an answer (tests/unit/tips-grind.test.ts holds it equal to the answer schema).
import { SCREENS, type UsageSummary } from './summary';

export interface TipRequest {
  summary: UsageSummary;
  /** the ids of the tips he has been shown, never to be offered again */
  shown: string[];
}

export interface Tip {
  /** a short slug, 'try-talk': what `shown` remembers */
  id: string;
  title: string;
  body: string;
  /** a button that takes him to a screen */
  action?: { label: string; screen: string };
}

/** The grind's answer: one tip, or null when nothing would help him now. */
export interface TipAnswer {
  tip: Tip | null;
}

const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length >= 1 && value.length <= max;

function isTip(value: unknown): value is Tip {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const tip = value as Record<string, unknown>;
  if (Object.keys(tip).some((k) => !['id', 'title', 'body', 'action'].includes(k))) return false;
  if (!isText(tip.id, 60) || !isText(tip.title, 60) || !isText(tip.body, 400)) return false;
  if (!('action' in tip)) return true;
  const action = tip.action as Record<string, unknown> | null;
  return (
    typeof action === 'object' &&
    action !== null &&
    Object.keys(action).every((k) => k === 'label' || k === 'screen') &&
    isText(action.label, 30) &&
    SCREENS.some((s) => s.id === action.screen)
  );
}

export function isTipAnswer(value: unknown): value is TipAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const answer = value as Record<string, unknown>;
  return Object.keys(answer).length === 1 && 'tip' in answer && (answer.tip === null || isTip(answer.tip));
}
