// src/share/SaveAsList.tsx — 'Save as a list' under the Share sheet's 'Bible references (N)' (mw-9q8wp1.2): the references showing, in the order showing (Page order or Bible order), are kept as
// a new verse list (src/lists/, repositories/verseLists.ts) or added to one he has, which takes only the references it does not hold. The Old Testament's are kept too (only Play skips
// them). The form is a name (offered from the shared title, else the date) and where to save it ('New list' or a list he has); once saved, 'Saved N references to <name>' with Open,
// which goes to #/lists/<id>. The share stays waiting, so Back from the list returns to the sheet.
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState, type FormEvent } from 'react';
import { listVerseLists, UNTITLED_LIST } from '../data/repositories';
import { FormHelper } from '../formHelper/FormHelper';
import { useAiAllowed } from '../gate/licenceContext';
import { openVerseList } from '../nav/route';
import { saveAsListCommand, type ListSaved } from '../services/formCommands';
import { focusQuietly } from '../ui/focus';
import { LimitedInput } from '../ui/LimitedField';
import { LIST_NAME_MAX, suggestedListName } from './listName';
import { NAME_LABEL, NEW_LIST_CHOICE, saveListForm, WHERE_LABEL } from './saveListForm';

const NEW_LIST = 'new';
const ACTION = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

/** `refs`: the canonical strings (src/lists/canonical.ts) of the references showing, in the order showing; `text`: the shared words, for the name. */
export function SaveAsList({ refs, text }: { refs: readonly string[]; text?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState(NEW_LIST);
  const [saved, setSaved] = useState<ListSaved | null>(null);
  const [filled, setFilled] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const ai = useAiAllowed();
  const lists = useLiveQuery(listVerseLists, []);
  const start = () => {
    setName(suggestedListName(text));
    setTarget(NEW_LIST);
    setFilled(null);
    setOpen(true);
    setTimeout(() => focusQuietly(field.current), 0);
  };
  // the one command both Saves run (the form's own and the helper's Send): it tells the sheet what it did; a list that went away is said and the choice goes back to New list
  const made = saveAsListCommand(
    refs,
    (lists ?? []).map((l) => l.name),
    {
      onSaved: (result) => {
        setSaved(result);
        setOpen(false);
      },
    },
  );
  const command = {
    ...made,
    run: async (args: Parameters<typeof made.run>[0]) => {
      try {
        return await made.run(args);
      } catch (err) {
        setSaved({
          id: null,
          line: (err instanceof Error ? err.message : 'Something went wrong.').replace(/^Not saved: /, ''),
        });
        setTarget(NEW_LIST);
        throw err;
      }
    },
  };
  const chosen = target === NEW_LIST ? undefined : lists?.find((l) => String(l.id) === target);
  const values = {
    where: target === NEW_LIST ? NEW_LIST_CHOICE : (chosen?.name ?? ''),
    name,
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (target !== NEW_LIST && !chosen) {
      // the list he chose went away while the form was open: nothing is saved
      setSaved({ id: null, line: 'That list is not there any more. Choose another, or a new list.' });
      setTarget(NEW_LIST);
      return;
    }
    command.run({ where: values.where, name: name.trim() || UNTITLED_LIST }).catch(() => undefined);
  };
  /** The tutor filled a field: the field shows it, ringed. */
  const fill = (fieldName: string, value: string) => {
    if (fieldName === 'where') setTarget(value === NEW_LIST_CHOICE ? NEW_LIST : String(lists?.find((l) => l.name === value)?.id ?? NEW_LIST));
    else if (fieldName === 'name') setName(value);
    else return;
    setFilled(fieldName);
  };
  const ring = (fieldName: string): string => (filled === fieldName ? ' ring-2 ring-accent' : '');
  return (
    <div data-save-as-list className="space-y-2">
      {open ? (
        <div className="space-y-2 rounded-xl border border-line">
          {ai ? <FormHelper form={saveListForm((lists ?? []).map((l) => l.name))} values={values} onFill={fill} command={command} /> : null}
          <form onSubmit={save} className="space-y-2 p-3">
            <label className="block text-base font-medium">
              {WHERE_LABEL}
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className={`mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base font-normal text-fg${ring('where')}`}
              >
                <option value={NEW_LIST}>{NEW_LIST_CHOICE}</option>
                {(lists ?? []).map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            {target === NEW_LIST ? (
              <LimitedInput
                ref={field}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label={NAME_LABEL}
                maxLength={LIST_NAME_MAX}
                autoCapitalize="sentences"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                className={`min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg${ring('name')}`}
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
        </div>
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
