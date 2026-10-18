import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState } from 'react';
import { getQuizGoal, QUIZ_GOAL_MAX } from '../../data/repositories';
import { writeSetting } from '../registry';
import { SettingRow } from './SettingRow';
import type { Control } from './types';

/** The kept goal in a field he can change (Save) or empty (Clear); with none kept the row says so and the tutor asks at the next quiz. Save needs words: only Clear drops a kept goal. */
function QuizGoalField({ saved }: { saved: string }) {
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const text = draft ?? saved;
  const trimmed = text.trim();
  const changed = trimmed !== '' && trimmed !== saved;
  const fieldId = useId();
  return (
    <div role="group" aria-label="Quiz goal">
      <label htmlFor={fieldId} className="block text-base font-semibold">
        Quiz goal
      </label>
      <p className="text-base text-muted">{saved === '' ? 'No goal kept' : `Quiz goal: ${saved}`}</p>
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
          onClick={() => void writeSetting('quizGoal', text).then(() => setDraft(undefined))}
          className="min-h-12 min-w-16 rounded-lg border border-transparent bg-accent px-4 text-base font-medium text-accent-fg disabled:border-line disabled:bg-transparent disabled:text-muted"
        >
          Save
        </button>
        <button
          type="button"
          disabled={saved === '' && text === ''}
          onClick={() => void writeSetting('quizGoal', '').then(() => setDraft(undefined))}
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
