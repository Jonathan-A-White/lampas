// src/reader/ReadingSetSheet.tsx — 'Read as' (mw-9ji6ek0.25): which reading set the Reader reads (src/reader/readingSets.ts; Byzantine, NA, ECM, Mine once he has chosen a reading, then the
// sets he named), and the three things he does with his own: 'Save as…' names a copy of the set in force, Rename and Delete ('Delete this set?') change one of his; the built-in sets have
// neither. One panel, drawn in the variants chip's long-press sheet (VariantFilterSheet.tsx) and in Settings > Reading > Variants (settings/controls/variants.tsx). The set in force is
// read live, so choosing one lays every chapter again at once (src/reader/variants.ts useReaderVariants).
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { deleteSet, getActiveSet, listReadingSets, renameSet, saveSetAs, setActive } from '../data/repositories';
import { Chips } from '../ui/Chips';
import { focusOnMount } from '../ui/focus';
import { isBuiltIn } from './readingSets';

/** What ECM is, said where it is chosen: the apparatus gives ECM readings only in Acts. */
export const ECM_LINE = 'ECM where the apparatus gives it (18 places in Acts); elsewhere NA';

/** The longest name of a set. */
const NAME_MAX = 40;

const BUTTON = 'min-h-12 min-w-12 rounded-lg px-3 text-base font-medium';

/** The name box of Save as… and Rename, with Save (off while the name is blank) and Cancel. */
function NameForm({ label, initial, onSave, onCancel }: { label: string; initial: string; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial);
  const blank = name.trim() === '';
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!blank) onSave(name);
  };
  return (
    <form onSubmit={submit} className="pt-2">
      <label htmlFor="reading-set-name" className="block pb-1 text-base font-medium">
        {label}
      </label>
      <input
        id="reading-set-name"
        ref={focusOnMount}
        type="text"
        value={name}
        maxLength={NAME_MAX}
        onChange={(event) => setName(event.target.value)}
        className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
      />
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={blank} className={`${BUTTON} bg-accent text-accent-fg disabled:opacity-50`}>
          Save
        </button>
        <button type="button" onClick={onCancel} className={`${BUTTON} text-accent`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

type Asking = 'save' | 'rename' | 'delete' | null;

/** 'Read as': the chips of the sets, the line on ECM, and Save as… / Rename / Delete. `name` is the chips' group name. */
export function ReadAs({ name = 'Read as' }: { name?: string }) {
  const sets = useLiveQuery(listReadingSets, []);
  const active = useLiveQuery(getActiveSet, []);
  const [asking, setAsking] = useState<Asking>(null);
  if (!sets || !active) return null;
  const own = !isBuiltIn(active.id);
  const done = () => setAsking(null);
  return (
    <div>
      <Chips
        name={name}
        current={active.id}
        options={sets.map((s) => [s.id, s.name] as const)}
        onChoose={(id) => {
          done();
          void setActive(id);
        }}
      />
      <p className="pt-1 text-base text-muted">{ECM_LINE}</p>
      {asking === 'save' ? (
        <NameForm
          label="Name this set"
          initial=""
          onSave={(n) => {
            void saveSetAs(n);
            done();
          }}
          onCancel={done}
        />
      ) : asking === 'rename' ? (
        <NameForm
          label="Rename this set"
          initial={active.name}
          onSave={(n) => {
            void renameSet(active.id, n);
            done();
          }}
          onCancel={done}
        />
      ) : asking === 'delete' ? (
        <div className="pt-2">
          <p className="text-base font-medium">Delete this set?</p>
          <p className="text-base text-muted">{`“${active.name}” is deleted from this phone, and the Reader reads Byzantine.`}</p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              ref={focusOnMount}
              onClick={() => {
                void deleteSet(active.id);
                done();
              }}
              className={`${BUTTON} bg-accent text-accent-fg`}
            >
              Delete my set
            </button>
            <button type="button" onClick={done} className={`${BUTTON} text-accent`}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-2 pt-1">
          <button type="button" onClick={() => setAsking('save')} className={`${BUTTON} text-accent`}>
            Save as…
          </button>
          {own ? (
            <>
              <button type="button" onClick={() => setAsking('rename')} className={`${BUTTON} text-accent`}>
                Rename
              </button>
              <button type="button" onClick={() => setAsking('delete')} className={`${BUTTON} text-accent`}>
                Delete
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
