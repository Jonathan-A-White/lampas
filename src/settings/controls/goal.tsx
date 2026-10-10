import { useLiveQuery } from 'dexie-react-hooks';
import { BOOK_INDEX } from '../../data/bookIndex';
import { goalText, goalTitle, parseGoal, type Goal } from '../../data/goal';
import { getGoal } from '../../data/repositories';
import { navigate } from '../../nav/route';
import { writeSetting } from '../registry';
import { PICKER, SettingRow } from './SettingRow';
import type { Control } from './types';

const NO_BOOK = 'Choose a book';
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

/** A select with a label above it; the options are [value, text] pairs. */
function GoalPicker({ label, value, options, disabled, onChange }: { label: string; value: string; options: [string, string][]; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="block text-base font-medium">{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={PICKER}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The reading goal: Book, then Chapter, then Verse, each narrower than the one before; every change is written as the whole goal. */
function GoalPickers({ saved }: { saved: string }) {
  const goal: Goal | undefined = parseGoal(saved, BOOK_INDEX);
  const info = goal && BOOK_INDEX.books.find((b) => b.code === goal.book);
  const write = (next: Goal | undefined) => void writeSetting('goal', next ? goalText(next) : '');
  return (
    <div role="group" aria-label="Goal">
      <p data-testid="goal-now" className="text-base font-medium">
        {goal ? goalTitle(goal, BOOK_INDEX) : 'Goal: none'}
      </p>
      <GoalPicker
        label="Book"
        value={goal?.book ?? ''}
        options={[['', NO_BOOK], ...BOOK_INDEX.books.map((b): [string, string] => [b.code, b.name])]}
        onChange={(code) => write(code === '' ? undefined : { book: code })}
      />
      <GoalPicker
        label="Chapter"
        value={String(goal?.chapter ?? '')}
        disabled={!info}
        options={[['', 'Whole book'], ...range(info?.chapters ?? 0).map((n): [string, string] => [String(n), String(n)])]}
        onChange={(n) => goal && write(n === '' ? { book: goal.book } : { book: goal.book, chapter: Number(n) })}
      />
      <GoalPicker
        label="Verse"
        value={String(goal?.verse ?? '')}
        disabled={!info || goal?.chapter === undefined}
        options={[['', 'Whole chapter'], ...range(info && goal?.chapter ? (info.verses[goal.chapter - 1] ?? 0) : 0).map((n): [string, string] => [String(n), String(n)])]}
        onChange={(n) => goal?.chapter !== undefined && write(n === '' ? { book: goal.book, chapter: goal.chapter } : { ...goal, verse: Number(n) })}
      />
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={!goal}
          onClick={() => write(undefined)}
          className="min-h-12 min-w-16 rounded-lg border border-line px-4 text-base font-medium text-fg disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => navigate('placement')}
          className="min-h-12 min-w-16 rounded-lg bg-accent px-4 text-base font-medium text-accent-fg"
        >
          Place me
        </button>
        <button
          type="button"
          disabled={!goal}
          onClick={() => navigate('goal')}
          className="min-h-12 min-w-16 rounded-lg border border-line px-4 text-base font-medium text-fg disabled:opacity-50"
        >
          Progress
        </button>
      </div>
    </div>
  );
}

export const GoalControl: Control = ({ row }) => {
  const goal = useLiveQuery(getGoal, []);
  return <SettingRow row={row}>{goal !== undefined ? <GoalPickers saved={goal} /> : null}</SettingRow>;
};
