// src/lists/VerseListScreen.tsx — one verse list (#/lists/<id>, mw-9q8wp1.1): its name and its references in the order saved, each the link the Share sheet's references are (a tap opens the
// pop-up with the verse; Open goes to the Reader and Back comes here). Rename is in place: the name becomes a field with Save and Cancel. Delete takes the list away, goes back to the lists
// and leaves Undo there for a few seconds (src/lists/deleted.ts). Play all (PlayAllBar.tsx, mw-9q8wp1.5) reads the references in order above them. Edit swaps the references for src/lists/EditRefs.tsx (add by typing, remove, move, sort, move or copy to another list; mw-9q8wp1.3, .8). A list that is not there (deleted, then Back) says so and offers the lists.
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState, type FormEvent } from 'react';
import { getVerseList, removeVerseList, renameVerseList } from '../data/repositories';
import { memorizedOf } from '../data/repositories/memorize';
import { memorizable, memorizeList, unmemorizeList } from '../memorize/commands';
import { MemorizeControl } from '../memorize/MemorizeControl';
import { ProgressMarks } from '../memorize/ProgressMark';
import { backTo } from '../nav/route';
import { RefLink } from '../share/ShareReferences';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { focusQuietly } from '../ui/focus';
import { announce } from '../ui/live';
import { listedOf, referencesLine } from './canonical';
import { noteDeleted } from './deleted';
import { EditRefs } from './EditRefs';
import { PlayAll } from './PlayAllBar';

const ACTION = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

/** 'Memorize this list' (mw-fu7dqf.5): On while every reference the list holds, of either testament, is memorized in English; a tap goes through the memorize commands. */
function MemorizeList({ listId, refs }: { listId: number; refs: readonly string[] }) {
  const held = memorizable(refs);
  const found = useLiveQuery(() => memorizedOf(held), [held.join(' ')]);
  if (found === undefined) return null;
  const on = held.length > 0 && held.every((ref) => found.get(ref)?.includes('en'));
  const flip = () => void (on ? unmemorizeList({ listId }) : memorizeList({ listId })).then(({ said }) => announce(said)).catch((error) => console.error('could not change what is memorized', error));
  return (
    <div className="mt-3">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <span className="text-base font-medium">Memorize this list</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Memorize this list"
          onClick={flip}
          className={`min-h-12 min-w-16 rounded-lg px-4 text-base font-medium ${on ? 'bg-accent text-accent-fg' : 'border border-line text-fg'}`}
        >
          {on ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}

export function VerseListScreen({ id }: { id: number }) {
  const list = useLiveQuery(async () => (await getVerseList(id)) ?? null, [id]);
  const [renaming, setRenaming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const field = useRef<HTMLInputElement>(null);
  useReportScreen({
    name: SCREEN_NAMES.lists,
    facts: list ? [{ label: 'List', value: list.name }, { label: 'References', value: String(list.refs.length) }] : [],
  });
  const back = <HeaderButton onClick={() => backTo('lists')}>‹ {SCREEN_NAMES.lists}</HeaderButton>;
  if (list === undefined) return <ScreenHeader title="" back={back} />;
  if (list === null) {
    return (
      <>
        <ScreenHeader title={SCREEN_NAMES.lists} back={back} />
        <main className="screen min-h-0 flex-1 px-4">
          <p className="mt-3 text-base">This list is not here any more.</p>
          <button type="button" onClick={() => backTo('lists')} className={`${ACTION} mt-3`}>
            See your lists
          </button>
        </main>
      </>
    );
  }
  const startRename = () => {
    setDraft(list.name);
    setRenaming(true);
    setTimeout(() => focusQuietly(field.current), 0);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() === '') return;
    await renameVerseList(list.id, draft);
    setRenaming(false);
  };
  const remove = async () => {
    const removed = await removeVerseList(list.id);
    if (removed) noteDeleted(removed);
    backTo('lists');
  };
  const shown = list.refs.map((canonical) => ({ canonical, listed: listedOf(canonical) }));
  return (
    <>
      <ScreenHeader title={list.name} subtitle={referencesLine(list.refs.length)} back={back} />
      <main className="screen min-h-0 flex-1 px-4">
        {renaming ? (
          <form onSubmit={save} className="mt-3 space-y-2">
            <input
              ref={field}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="List name"
              autoCapitalize="sentences"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={draft.trim() === ''} className={`${ACTION} bg-accent text-accent-fg disabled:opacity-50`}>
                Save
              </button>
              <button type="button" onClick={() => setRenaming(false)} className={ACTION}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={startRename} className={ACTION}>
              Rename
            </button>
            <button type="button" aria-pressed={editing} onClick={() => setEditing(!editing)} className={`${ACTION} ${editing ? 'bg-accent text-accent-fg' : ''}`}>
              {editing ? 'Done' : 'Edit'}
            </button>
            <button type="button" onClick={() => void remove()} className={`${ACTION} text-bad`}>
              Delete
            </button>
          </div>
        )}
        {editing ? (
          <EditRefs listId={list.id} refs={list.refs} />
        ) : shown.length === 0 ? (
          <p className="mt-3 text-base text-muted">This list holds no references yet.</p>
        ) : (
          <>
            <MemorizeList listId={list.id} refs={list.refs} />
            <div className="mt-3">
              <PlayAll refs={shown.flatMap(({ listed }) => (listed ? [listed] : []))} />
            </div>
            <ul className="mt-3 space-y-2">
              {shown.map(({ canonical, listed }, i) => (
                <li key={`${canonical}-${i}`} className="flex items-stretch gap-2">
                  <div className="min-w-0 flex-1">
                    {listed ? <RefLink r={listed} replacing={false} /> : <span className="flex min-h-12 items-center rounded-xl border border-line px-4 text-lg text-muted">{canonical}</span>}
                    {listed ? <ProgressMarks canonical={canonical} className="mt-1 px-1" /> : null}
                  </div>
                  {listed ? <MemorizeControl canonical={canonical} compact /> : null}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="h-[var(--lp-end-inset)]" aria-hidden="true" />
      </main>
    </>
  );
}
