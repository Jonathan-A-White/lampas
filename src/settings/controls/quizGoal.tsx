import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useRef, useState } from 'react';
import { getQuizGoal, QUIZ_GOAL_MAX } from '../../data/repositories';
import { writeSetting } from '../registry';
import { SettingRow } from './SettingRow';
import type { Control } from './types';

/** localStorage key of the words typed in the field and not yet saved (docs/pwa-best-practices.md section 16: keep the draft). */
export const QUIZ_GOAL_DRAFT_KEY = 'lampas.quizGoalDraft';

/** How long after the last keystroke the draft is written to the phone. */
const DRAFT_KEEP_MS = 500;

/** localStorage, or nothing where the phone refuses it: the draft is then lost, as it was. */
function readDraft(): string | undefined {
  try {
    return window.localStorage.getItem(QUIZ_GOAL_DRAFT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeDraft(draft: string | undefined): void {
  try {
    if (draft === undefined) window.localStorage.removeItem(QUIZ_GOAL_DRAFT_KEY);
    else window.localStorage.setItem(QUIZ_GOAL_DRAFT_KEY, draft);
  } catch {
    // the phone refuses storage: nothing to keep it in
  }
}

/** The kept goal in a field he can change (Save) or empty (Clear); with none kept the row says so and the tutor asks at the next quiz. Save needs words: only Clear drops a kept goal. */
function QuizGoalField({ saved }: { saved: string }) {
  const [draft, setDraft] = useState<string | undefined>(readDraft);
  const latest = useRef(draft);
  const text = draft ?? saved;
  const trimmed = text.trim();
  const changed = trimmed !== '' && trimmed !== saved;
  const fieldId = useId();
  /** Save and Clear end the draft: forget it on the phone too, at once. */
  const dropDraft = () => {
    latest.current = undefined;
    writeDraft(undefined);
    setDraft(undefined);
  };

  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  // Keep the words typed: written 500 ms after the last keystroke and at once when Settings is left or the page is hidden.
  useEffect(() => {
    if (draft === undefined || draft === readDraft()) return;
    const timer = setTimeout(() => writeDraft(latest.current), DRAFT_KEEP_MS);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    const flush = () => writeDraft(latest.current);
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, []);
  return (
    <div role="group" aria-label="Quiz goal">
      <label htmlFor={fieldId} className="block text-base font-semibold">
        Quiz goal
      </label>
      <p className="text-base text-muted">{saved === '' ? 'No goal kept' : `Kept: ${saved}`}</p>
      <input
        id={fieldId}
        type="text"
        value={text}
        maxLength={QUIZ_GOAL_MAX}
        placeholder="Why you want a quiz"
        onChange={(e) => setDraft(e.target.value)}
        className="mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
      />
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          disabled={!changed}
          onClick={() => void writeSetting('quizGoal', text).then(dropDraft)}
          className="min-h-12 min-w-16 rounded-lg border border-transparent bg-accent px-4 text-base font-medium text-accent-fg disabled:border-line disabled:bg-transparent disabled:text-muted"
        >
          Save
        </button>
        <button
          type="button"
          disabled={saved === '' && text === ''}
          onClick={() => void writeSetting('quizGoal', '').then(dropDraft)}
          className="min-h-12 min-w-16 rounded-lg border border-line px-4 text-base font-medium text-fg disabled:text-muted"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export const QuizGoalControl: Control = ({ row }) => {
  const saved = useLiveQuery(getQuizGoal, []);
  return <SettingRow row={row}>{saved !== undefined ? <QuizGoalField saved={saved} /> : null}</SettingRow>;
};
