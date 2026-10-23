// src/lists/VerseListsScreen.tsx — Verse lists (#/lists, mw-9q8wp1.1): the lists of Bible references he saved, newest first, each with how many references it holds; a tap opens one
// (src/lists/VerseListScreen.tsx, #/lists/<id>). It is a screen of its own, reached from the Library, and the one address `#/lists/<id>` is drawn here too. When he has none it says how
// to make one. A list he just deleted is offered back for a few seconds: 'Refuge deleted' with Undo (src/lists/deleted.ts).
import { useLiveQuery } from 'dexie-react-hooks';
import { listVerseLists } from '../data/repositories';
import { backTo, openVerseList, useAddress, verseListOf } from '../nav/route';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { referencesLine } from './canonical';
import { undoDeleted, useDeleted } from './deleted';
import { VerseListScreen } from './VerseListScreen';

export function VerseListsScreen() {
  const id = verseListOf(useAddress());
  return id === undefined ? <VerseListsHome /> : <VerseListScreen id={id} />;
}

function VerseListsHome() {
  const lists = useLiveQuery(listVerseLists, []);
  const deleted = useDeleted();
  useReportScreen({ name: SCREEN_NAMES.lists, facts: lists ? [{ label: 'Lists', value: String(lists.length) }] : [] });
  return (
    <>
      <ScreenHeader title={SCREEN_NAMES.lists} back={<HeaderButton onClick={() => backTo('library')}>‹ Library</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        {lists === undefined ? null : lists.length === 0 ? (
          <p data-testid="lists-empty" className="mt-3 text-base">
            You have no verse lists yet. Share a page or a picture to Lampas, and on the Share sheet choose Save as a list to keep its Bible references here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {lists.map((list) => (
              <li key={list.id} data-testid="verse-list-row">
                <button type="button" onClick={() => openVerseList(list.id)} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-base">
                  <span className="title-wrap min-w-0 flex-1 font-medium">{list.name}</span>{' '}
                  <span className="shrink-0 text-muted">{referencesLine(list.refs.length)}</span>{' '}
                  <span aria-hidden="true" className="shrink-0 text-muted">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {deleted ? (
          <div role="status" data-testid="list-deleted" className="mt-3 flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface pl-4">
            <p className="min-w-0 flex-1 text-base">{`${deleted.name} deleted`}</p>
            <button type="button" onClick={() => void undoDeleted()} className="min-h-12 min-w-12 shrink-0 rounded-lg px-4 text-base font-medium text-accent">
              Undo
            </button>
          </div>
        ) : null}
        <div className="h-[var(--lp-end-inset)]" aria-hidden="true" />
      </main>
    </>
  );
}
