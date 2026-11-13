// src/sermons/SermonSourcesPage.tsx — Sermon sources (#/settings?sources=sermons, mw-qtu3zvz.92, docs/design/sermon-sources.md): the one list of every sermon source the Sermons door draws on, a page of its own
// behind the row Sermon sources of Settings > Study resources > Sermons, in the look of a page of the Library. A help line, a search field (from eight sources up) that stays at the top with the count of those on,
// All on and All off (with a search typed: 'These N on', 'These N off', the rows shown only) and an Undo after either, then the sources in two groups named by what On gives, each row a name of two lines at most,
// one line under it and Off | On. No Pin. What is on leads each group; the order is made when the page opens and when the search changes, never under his thumb. The list itself is sourceList.ts, read from the
// phone by useSourceList.ts; a list's switch is its setting `sermons.<id>`, a Logos book's is its row of the shelf (so a book that is also on a page of the Library has one switch).
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { importNote, setShelfStates, setState, type ShelfState } from '../data/repositories';
import { useAiAllowed } from '../gate/licenceContext';
import { infoOf } from '../library/kinds';
import { openLibrary } from '../nav/route';
import { useScrollMemory } from '../nav/scrollMemory';
import { entryOf } from '../resources/catalogue';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { backToStudyResources, openSetting } from '../settings/link';
import { settingOf, writeSetting } from '../settings/registry';
import { useReportScreen } from '../tutor/screenContext';
import { matching } from '../ui/listFilter';
import { scrollBoxOf } from '../ui/reveal';
import { ThreeStep } from '../ui/ThreeStep';
import { AskForPreacher } from './AskForPreacher';
import { countLine, GROUP_ORDER, GROUP_WORDS, inOrder, onCount, onLine, type SourceItem, type SourceList } from './sourceList';
import { useSourceList } from './useSourceList';

/** The page's name, as its header, the row that opens it and the tutor say it. */
export const SOURCES_TITLE = 'Sermon sources';
/** The fewest sources that get a search field: a list of two needs none (the vault's rule gives the search to a list longer than about seven). */
export const SEARCH_FROM = 8;

const OPTIONS = [['off', 'Off'], ['on', 'On']] as const;
const BUTTON = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';
const LINK = 'relative inline text-left text-accent underline underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[\'\']';

/** What All on or All off changed, to put back: each source and the switch it had. */
interface Undo {
  line: string;
  lists: { key: string; value: 'on' | 'off' }[];
  books: { resource: string; state: ShelfState }[];
}

/** Writes a list's switch; a source the registry does not know (none in the app) is left alone. */
async function writeList(key: string, value: 'on' | 'off'): Promise<void> {
  if (settingOf(key)) await writeSetting(key, value);
}

/** Puts every source of `items` On or Off, the lists by their settings and the books in one write of the shelf. */
async function writeAll(items: readonly SourceItem[], on: boolean): Promise<void> {
  for (const item of items) if (item.sort === 'list') await writeList(item.id, on ? 'on' : 'off');
  const books = items.filter((item) => item.sort === 'book').map((item) => ({ resource: item.id, state: (on ? 'on' : 'off') as ShelfState }));
  if (books.length > 0) await setShelfStates(books);
}

/** The name of a source the address asks for that is not listed: the setting's label, a book's short name. */
const nameOf = (id: string): string | undefined => settingOf(id)?.label ?? entryOf(id)?.short;

export function SermonSourcesPage({ at }: { at?: string }) {
  const list = useSourceList();
  // null while he has imported no list
  const note = useLiveQuery(async () => (await importNote()) ?? null, []);
  const scrollRef = useScrollMemory('sermon-sources');
  const on = list ? onCount(list.items) : 0;
  useReportScreen({
    name: 'Settings',
    facts: [
      { label: 'Page', value: SOURCES_TITLE },
      ...(list
        ? [
            { label: 'On', value: `${on} of ${list.items.length}` },
            ...GROUP_ORDER.flatMap((group) => {
              const own = list.items.filter((item) => item.group === group);
              return own.length > 0 ? [{ label: GROUP_WORDS[group].title, value: `${onCount(own)} of ${own.length} on` }] : [];
            }),
          ]
        : []),
    ],
  });
  return (
    <>
      <ScreenHeader
        title={SOURCES_TITLE}
        back={<HeaderButton onClick={backToStudyResources}>‹ Study resources</HeaderButton>}
        action={
          <span data-testid="sources-status" className="chrome-small text-muted">
            {list ? onLine(on) : ''}
          </span>
        }
      />
      <main ref={scrollRef} data-sermon-sources className="screen min-h-0 flex-1 px-4">
        <p className="pt-3 text-base">The Sermons door at a verse draws on the sources that are on.</p>
        {list && note !== undefined ? <Sources list={list} at={at} imported={note !== null} /> : null}
        <div className="h-[var(--lp-end-inset)]" aria-hidden="true" />
      </main>
    </>
  );
}

/** The list, drawn once the phone is read: its order is made here, when it opens. */
function Sources({ list, at, imported }: { list: SourceList; at?: string; imported: boolean }) {
  const { items } = list;
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<readonly string[]>(() => inOrder(items).map((item) => item.id));
  const [undo, setUndo] = useState<Undo | null>(null);
  // the row an address opened the page at is marked until his next tap
  const [marked, setMarked] = useState(at);
  const markedRow = useRef<HTMLDivElement | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    markedRow.current?.scrollIntoView?.({ block: 'center' });
  }, []);
  useEffect(() => {
    if (marked === undefined) return;
    const clear = () => setMarked(undefined);
    document.addEventListener('pointerdown', clear, true);
    return () => document.removeEventListener('pointerdown', clear, true);
  }, [marked]);

  const byId = new Map(items.map((item) => [item.id, item]));
  const placed = new Set(order);
  // the order as it was made, then any source that has arrived since, last in its group
  const ordered = [...order.flatMap((id) => byId.get(id) ?? []), ...inOrder(items.filter((item) => !placed.has(item.id)))];
  const searching = query.trim() !== '';
  const shown = searching ? matching(ordered.map((item) => ({ id: item.id, name: item.name, also: [item.title, item.detail, item.search].filter(Boolean).join(' ') })), query).map((found) => byId.get(found.id)!) : ordered;
  const on = onCount(items);
  const bothGroups = GROUP_ORDER.every((group) => items.some((item) => item.group === group));

  const choose = async (item: SourceItem, to: string): Promise<void> => {
    setUndo(null);
    // a tap on the step it already shows changes nothing (a Pinned book reads as On, and stays Pinned)
    if ((to === 'on') === item.on) return;
    if (item.sort === 'list') await writeList(item.id, to === 'on' ? 'on' : 'off');
    else await setState(item.id, to === 'on' ? 'on' : 'off');
  };
  const all = async (to: boolean): Promise<void> => {
    const changing = shown.filter((item) => item.on !== to);
    if (changing.length === 0) return setUndo(null);
    await writeAll(changing, to);
    setUndo({
      line: `Turned ${to ? 'on' : 'off'} ${changing.length}.`,
      lists: changing.filter((item) => item.sort === 'list').map((item) => ({ key: item.id, value: item.on ? 'on' : 'off' })),
      books: changing.filter((item) => item.sort === 'book').map((item) => ({ resource: item.id, state: item.pinned ? 'pinned' : item.on ? 'on' : 'off' })),
    });
  };
  const putBack = async (): Promise<void> => {
    if (!undo) return;
    for (const { key, value } of undo.lists) await writeList(key, value);
    if (undo.books.length > 0) await setShelfStates(undo.books);
    setUndo(null);
  };
  const unlisted = at !== undefined && !byId.has(at) ? nameOf(at) : undefined;

  return (
    <div ref={box} data-sources-list>
      {unlisted ? (
        <p role="status" data-source-needs className="mt-3 rounded-lg border border-line px-3 py-2 text-base">
          {`“${unlisted}” is listed only while Logos is on and your Library import says you own it in Logos. Import your Logos library first.`}
        </p>
      ) : null}
      <div className="sticky top-0 z-10 bg-canvas pb-1 pt-2">
        {items.length >= SEARCH_FROM ? (
          <input
            type="search"
            value={query}
            placeholder={`Search ${items.length} sermon sources`}
            aria-label="Search sermon sources"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(event) => {
              setQuery(event.target.value);
              // what is on leads again, as the page stands now; typing shows the first matches, not the middle of the list
              setOrder(inOrder(items).map((item) => item.id));
              const scrolled = scrollBoxOf(box.current);
              if (scrolled) scrolled.scrollTop = 0;
            }}
            className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
          />
        ) : null}
        <p data-testid="sources-line" className="pt-1 text-sm text-muted" aria-live="polite">
          {countLine(on, items.length)}
          {searching ? ` · ${shown.length} shown` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" className={BUTTON} disabled={shown.length === 0} onClick={() => void all(true)}>
          {searching ? `These ${shown.length} on` : 'All on'}
        </button>
        <button type="button" className={BUTTON} disabled={shown.length === 0} onClick={() => void all(false)}>
          {searching ? `These ${shown.length} off` : 'All off'}
        </button>
      </div>
      {undo ? (
        <p data-testid="sources-undo" role="status" className="flex items-center justify-between gap-3 pt-2 text-base">
          {undo.line}
          <button type="button" className={BUTTON} onClick={() => void putBack()}>
            Undo
          </button>
        </p>
      ) : null}
      {on === 0 && items.length > 0 ? (
        <p role="status" className="pt-2 text-base text-muted">
          No source is on, so no verse has a Sermons door.
        </p>
      ) : null}
      {shown.length === 0 ? <NoMatch /> : null}
      {GROUP_ORDER.map((group) => {
        const rows = shown.filter((item) => item.group === group);
        if (rows.length === 0) return null;
        const own = items.filter((item) => item.group === group);
        return (
          <section key={group} data-group={group} className="pt-3">
            {bothGroups ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-base font-semibold">{GROUP_WORDS[group].title}</h2>
                  {searching ? null : (
                    <span data-testid="group-count" className="shrink-0 text-sm text-muted">
                      {countLine(onCount(own), own.length)}
                    </span>
                  )}
                </div>
                {searching ? null : <p className="text-sm text-muted">{GROUP_WORDS[group].line}</p>}
              </>
            ) : null}
            <div className="mt-1 rounded-lg border border-line">
              {rows.map((item) => (
                <div
                  key={item.id}
                  data-source={item.id}
                  ref={item.id === marked ? markedRow : undefined}
                  aria-current={item.id === marked ? 'true' : undefined}
                  className={`flex items-center gap-x-3 border-t border-line px-3 py-2 first:border-t-0 ${item.id === marked ? 'rounded-lg bg-accent/15 outline-2 outline-accent' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-base font-medium [overflow-wrap:anywhere]">{item.name}</p>
                    {item.detail ? <p className="text-sm text-muted [overflow-wrap:anywhere]">{item.detail}</p> : null}
                    {item.free ? <p className="text-sm font-medium text-accent">Free with Logos</p> : null}
                    {item.also ? (
                      <button type="button" onClick={() => openLibrary({ kind: item.also, book: item.id })} className="min-h-11 text-left text-sm font-medium text-accent">
                        Also in your Library: {infoOf(item.also).plural} ›
                      </button>
                    ) : null}
                  </div>
                  <ThreeStep name={item.title} current={item.on ? 'on' : 'off'} options={OPTIONS} onChoose={(to) => void choose(item, to)} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {list.logosOn && (!imported || list.held === 0) ? (
        <section data-testid="sources-import" className="mt-4 rounded-xl border border-line bg-surface p-3">
          <p className="text-base">{imported ? 'Your Logos list holds no sermon book Lampas can open.' : 'Sermon books in Logos? Import your Logos list, and the ones Lampas can open join this list.'}</p>
          <button type="button" className={`${BUTTON} mt-2`} onClick={() => openLibrary({ import: true })}>
            {imported ? 'Import again' : 'Import'}
          </button>
        </section>
      ) : null}
      {!list.logosOn && list.hiddenOn > 0 ? (
        <p data-testid="sources-logos-off" className="pt-4 text-base text-muted">
          {list.hidden === 1 ? '1 source in your Logos library is not offered while Logos is off in ' : `${list.hidden} sources in your Logos library are not offered while Logos is off in `}
          <button type="button" onClick={() => openSetting('resource.logos')} className={LINK}>
            Study resources
          </button>
          . Your switches stay as they are.
        </p>
      ) : null}
    </div>
  );
}

/** A search that finds no source: the line, and the door that tells the makers whom the sermon index lacks. It goes to the mill, so without a licence it is greyed and says 'Needs a licence'. */
function NoMatch() {
  const allowed = useAiAllowed();
  const [asking, setAsking] = useState(false);
  return (
    <div className="pt-3">
      <p className="text-base text-muted">No sermon source matches</p>
      <button type="button" disabled={!allowed} onClick={() => setAsking(true)} className={`${BUTTON} mt-2 text-left text-accent disabled:opacity-50`}>
        <span className="block">Ask for a preacher</span>
        {allowed ? null : <span className="block text-sm font-normal text-muted">Needs a licence</span>}
      </button>
      {asking ? <AskForPreacher onClose={() => setAsking(false)} /> : null}
    </div>
  );
}
