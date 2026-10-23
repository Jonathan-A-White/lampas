// src/share/SaveAsList.tsx — 'Save as a list' under the Share sheet's 'Bible references (N)' (mw-9q8wp1.2): the references showing, in the order showing (Page order or Bible order), are kept as
// a new verse list (src/lists/, repositories/verseLists.ts) or added to one he has, which takes only the references it does not hold. The Old Testament's are kept too (only Play skips
// them). The form is a name (offered from the shared title, else the date) and where to save it ('New list' or a list he has); once saved, 'Saved N references to <name>' with Open,
// which goes to #/lists/<id>. The share stays waiting, so Back from the list returns to the sheet.
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState, type FormEvent } from 'react';
import { appendToVerseList, createVerseList, listVerseLists } from '../data/repositories';
import { referencesLine } from '../lists/canonical';
import { openVerseList } from '../nav/route';
import { focusQuietly } from '../ui/focus';
import { suggestedListName } from './listName';

const NEW_LIST = 'new';
const ACTION = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

type Saved = { id: number; line: string } | { id: null; line: string };

/** `refs`: the canonical strings (src/lists/canonical.ts) of the references showing, in the order showing; `text`: the shared words, for the name. */
export function SaveAsList({ refs, text }: { refs: readonly string[]; text?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState(NEW_LIST);
  const [saved, setSaved] = useState<Saved | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const lists = useLiveQuery(listVerseLists, []);
  const start = () => {
    setName(suggestedListName(text));
    setTarget(NEW_LIST);
    setOpen(true);
    setTimeout(() => focusQuietly(field.current), 0);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (target === NEW_LIST) {
      const row = await createVerseList(name, refs);
      setSaved({ id: row.id, line: `Saved ${referencesLine(refs.length)} to ${row.name}` });
    } else {
      const found = lists?.find((l) => String(l.id) === target);
      const result = await appendToVerseList(Number(target), refs);
      if (!result) {
        setSaved({ id: null, line: `${found?.name ?? 'That list'} is not there any more. Choose another, or a new list.` });
        setTarget(NEW_LIST);
        return;
      }
      const { row, added } = result;
      setSaved({
        id: row.id,
        line: added === 0 ? `${refs.length === 1 ? 'The reference was' : `All ${refs.length} references were`} already in ${row.name}` : `Saved ${referencesLine(added)} to ${row.name}`,
      });
    }
    setOpen(false);
  };
  return (
    <div data-save-as-list className="space-y-2">
      {open ? (
        <form onSubmit={(event) => void save(event)} className="space-y-2 rounded-xl border border-line p-3">
          <label className="block text-base font-medium">
            Save to
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base font-normal text-fg">
              <option value={NEW_LIST}>New list</option>
              {(lists ?? []).map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          {target === NEW_LIST ? (
            <input
              ref={field}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="List name"
              autoCapitalize="sentences"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
            />
          ) : null}
          <div className="flex gap-2">
            <button type="submit" className={`${ACTION} bg-accent text-accent-fg`}>
              Save
            </button>
            <button type="button" onClick={() => setOpen(false)} className={ACTION}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={start} className="min-h-12 w-full rounded-xl border border-line px-4 text-lg font-medium text-accent active:bg-line">
          Save as a list
        </button>
      )}
      {saved ? (
        <div role="status" data-testid="saved-as-list" className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface pl-4">
          <p className="min-w-0 flex-1 text-base">{saved.line}</p>
          {saved.id === null ? null : (
            <button type="button" onClick={() => openVerseList(saved.id)} className="min-h-12 min-w-12 shrink-0 rounded-lg px-4 text-base font-medium text-accent">
              Open
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
