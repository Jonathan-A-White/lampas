// src/lists/EditRefs.tsx — editing one verse list's references (mw-9q8wp1.3): each reference with Remove, Move up and Move down, a field to add references by typing them, and Sort into
// Bible order. Every change is written at once through setVerseListRefs (the screen reads the list live, so what is shown is what is kept). The pure parts are in editRefs.ts.
import { useState, type FormEvent } from 'react';
import { setVerseListRefs } from '../data/repositories';
import { listedOf } from './canonical';
import { addedFrom, inBibleOrder } from './editRefs';

const ACTION = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';
const SMALL = 'min-h-12 min-w-12 rounded-lg border border-line px-3 text-base font-medium disabled:opacity-40';

/** The editing part of a list's screen: `refs` are the list's references as kept, `listId` the list. */
export function EditRefs({ listId, refs }: { listId: number; refs: readonly string[] }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const keep = (next: readonly string[]) => void setVerseListRefs(listId, next);
  const move = (i: number, by: -1 | 1) => {
    const next = [...refs];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    keep(next);
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() === '') return;
    const result = addedFrom(refs, draft);
    setError(result.error ?? '');
    if (result.error) return;
    setDraft('');
    keep(result.refs);
  };
  return (
    <section aria-label="Edit the references" className="mt-3 space-y-3">
      <form onSubmit={add} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError('');
            }}
            aria-label="Add a reference"
            placeholder="Add a reference, such as Rom 8:28"
            aria-invalid={error !== ''}
            autoCapitalize="sentences"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            className="min-h-12 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-base text-fg"
          />
          <button type="submit" disabled={draft.trim() === ''} className={`${ACTION} bg-accent text-accent-fg disabled:opacity-50`}>
            Add
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-base text-bad">
            {error}
          </p>
        ) : null}
      </form>
      {refs.length > 1 ? (
        <button type="button" onClick={() => keep(inBibleOrder(refs))} className={ACTION}>
          Sort into Bible order
        </button>
      ) : null}
      {refs.length === 0 ? (
        <p className="text-base text-muted">This list holds no references yet.</p>
      ) : (
        <ul className="space-y-2">
          {refs.map((canonical, i) => {
            const words = listedOf(canonical)?.printed ?? canonical;
            return (
              <li key={`${canonical}-${i}`} className="flex items-center gap-2 rounded-xl border border-line p-2">
                <span className="min-w-0 flex-1 px-2 text-lg">{words}</span>
                <button type="button" aria-label={`Move ${words} up`} disabled={i === 0} onClick={() => move(i, -1)} className={SMALL}>
                  ↑
                </button>
                <button type="button" aria-label={`Move ${words} down`} disabled={i === refs.length - 1} onClick={() => move(i, 1)} className={SMALL}>
                  ↓
                </button>
                <button type="button" aria-label={`Remove ${words}`} onClick={() => keep(refs.filter((_, at) => at !== i))} className={`${SMALL} text-bad`}>
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
