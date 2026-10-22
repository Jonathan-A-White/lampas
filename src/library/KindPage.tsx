// src/library/KindPage.tsx — one kind's page of the Library (#/library?kind=lexicon, docs/design/library-at-scale.md 3.4): every book of the kind in a control of Off | On | Pin, pinned
// first, then those on, then those off (and by name within each), All on / All off, and a search over the kind. The list is the shared SearchableList (src/ui/SearchableList.tsx), which
// does not re-sort under his thumb. A fourth pin is refused with a line under the book; Bibles are one at a time (Off | Chosen); Devotionals have no Pin.
import { useState } from 'react';
import { setKind, setState, type ShelfState } from '../data/repositories';
import { backTo } from '../nav/route';
import { entriesOf, entryOf, type CatalogueEntry, type Kind } from '../resources/catalogue';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { SearchableList } from '../ui/SearchableList';
import { ThreeStep } from '../ui/ThreeStep';
import { countLine, headerCount, infoOf, pinRefusal, type Steps } from './kinds';
import { useShelf } from './useShelf';

const OPTIONS: Record<Steps, readonly (readonly [string, string])[]> = {
  pin: [['off', 'Off'], ['on', 'On'], ['pinned', 'Pin']],
  on: [['off', 'Off'], ['on', 'On']],
  chosen: [['off', 'Off'], ['on', 'Chosen']],
};

const BUTTON = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

/** What a book is called under its name: the full title when the name is a short one, and its author. */
const detailOf = (entry: CatalogueEntry): string => [entry.title === entry.short ? '' : entry.title, entry.author ?? ''].filter(Boolean).join(' · ');

export function KindPage({ kind, book }: { kind: Kind; book?: string }) {
  const info = infoOf(kind);
  const states = useShelf();
  const [refused, setRefused] = useState<string | null>(null);
  const entries = [...entriesOf(kind)].sort((a, b) => a.short.localeCompare(b.short));
  const chosen = book !== undefined && entryOf(book)?.kind === kind ? book : undefined;
  useReportScreen({
    name: SCREEN_NAMES.library,
    facts: [
      { label: 'Page', value: info.plural },
      { label: 'On', value: states ? countLine(kind, states) : '' },
    ],
  });

  const choose = async (entry: CatalogueEntry, to: string): Promise<void> => {
    const result = await setState(entry.resource, to as ShelfState);
    setRefused(result.ok ? null : entry.resource);
  };
  const all = async (to: 'on' | 'off'): Promise<void> => {
    setRefused(null);
    await setKind(kind, to);
  };

  return (
    <>
      <ScreenHeader
        title={info.plural}
        back={<HeaderButton onClick={() => backTo('library')}>‹ Library</HeaderButton>}
        action={
          <span data-testid="kind-status" className="chrome-small text-muted">
            {states ? headerCount(kind, states) : ''}
          </span>
        }
      />
      <main className="screen min-h-0 flex-1 px-4">
        <p className="pt-3 text-base">{info.help}</p>
        {entries.length === 0 ? (
          <>
            <p className="pt-3 text-base font-medium">No {info.plural.toLowerCase()} yet</p>
            <p className="text-base text-muted">Lampas has none of these in its catalogue yet.</p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 pt-3">
              {kind === 'bible' ? null : (
                <button type="button" className={BUTTON} onClick={() => void all('on')}>
                  All on
                </button>
              )}
              <button type="button" className={BUTTON} onClick={() => void all('off')}>
                All off
              </button>
            </div>
            {states ? (
              <SearchableList
                key={kind}
                flat
                label={info.plural}
                noun={info.singular.toLowerCase()}
                items={entries.map((e) => ({ id: e.resource, name: e.short, also: [e.title, e.author, e.series].filter(Boolean).join(' ') }))}
                status={countLine(kind, states)}
                focus={chosen}
                rankOf={(id) => (states.get(id) === 'pinned' ? 0 : states.get(id) === 'on' ? 1 : 2)}
                row={(item) => {
                  const entry = entryOf(item.id)!;
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="title-wrap text-base font-medium">{entry.short}</p>
                          {detailOf(entry) ? <p className="title-wrap text-sm text-muted">{detailOf(entry)}</p> : null}
                        </div>
                        <ThreeStep name={entry.short} current={states.get(entry.resource) ?? 'off'} options={OPTIONS[info.steps]} onChoose={(to) => void choose(entry, to)} />
                      </div>
                      {refused === entry.resource ? (
                        <p role="alert" className="px-3 pb-2 text-base text-bad">
                          {pinRefusal()}
                        </p>
                      ) : null}
                    </>
                  );
                }}
              />
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
