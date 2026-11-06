// src/library/KindPage.tsx — one kind's page of the Library (#/library?kind=lexicon, docs/design/library-at-scale.md 3.4): every book of the kind in a control of Off | On | Pin, pinned
// first, then those on, then those off (and by name within each; a kind with Hebrew and Greek books, Lexicons and Grammars, in a Hebrew group then a Greek one), All on / All off, and a search over the kind. The list is the shared SearchableList (src/ui/SearchableList.tsx), which
// does not re-sort under his thumb. A fourth pin is refused with a line under the book; a Bible shows the parts it is set for (NT, OT, Apocrypha, read from the three Settings keys) and "Set for…" asks
// which part (PartChoice.tsx); Devotionals have no Pin.
import { useState } from 'react';
import { setKind, setState, type ShelfState } from '../data/repositories';
import { backTo } from '../nav/route';
import { entriesOf, entryOf, type CatalogueEntry, type Kind } from '../resources/catalogue';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { SearchableList } from '../ui/SearchableList';
import { ThreeStep } from '../ui/ThreeStep';
import { marksOf } from './bibleParts';
import { countLine, detailOf, headerCount, infoOf, pinRefusal } from './kinds';
import { PartChoice } from './PartChoice';
import { TypedBible } from './TypedBible';
import { useBibles, useShelf } from './useShelf';

const OPTIONS: Record<'pin' | 'on', readonly (readonly [string, string])[]> = {
  pin: [['off', 'Off'], ['on', 'On'], ['pinned', 'Pin']],
  on: [['off', 'Off'], ['on', 'On']],
};

const GROUP_LANGS = ['he', 'grc', 'en', 'both'] as const;
const GROUPS = ['Hebrew', 'Greek', 'English', 'Hebrew and Greek'] as const;

const BUTTON = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

export function KindPage({ kind, book }: { kind: Kind; book?: string }) {
  const info = infoOf(kind);
  const states = useShelf();
  const bibles = useBibles();
  // the Bible whose "Set for…" is open
  const [asking, setAsking] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const entries = [...entriesOf(kind)].sort((a, b) => a.short.localeCompare(b.short));
  // a kind with books in both Hebrew and Greek (Lexicons, Grammars) is grouped Hebrew, then Greek, each in the order above (mw-5r3p30.1117)
  const grouped = entries.some((e) => e.lang === 'he') && entries.some((e) => e.lang === 'grc');
  const groupRank = (id: string): number => (grouped ? Math.max(0, GROUP_LANGS.indexOf(entryOf(id)!.lang)) : 0);
  const chosen = book !== undefined && entryOf(book)?.kind === kind ? book : undefined;
  useReportScreen({
    name: SCREEN_NAMES.library,
    facts: [
      { label: 'Page', value: info.plural },
      { label: 'On', value: states ? countLine(kind, states, bibles) : '' },
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
        {kind === 'bible' ? <TypedBible /> : null}
        {entries.length === 0 ? (
          <>
            <p className="pt-3 text-base font-medium">No {info.plural.toLowerCase()} yet</p>
            <p className="text-base text-muted">Lampas has none of these in its catalogue yet.</p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 pt-3">
              {kind === 'bible' ? null : (
                <>
                  <button type="button" className={BUTTON} onClick={() => void all('on')}>
                    All on
                  </button>
                  <button type="button" className={BUTTON} onClick={() => void all('off')}>
                    All off
                  </button>
                </>
              )}
            </div>
            {states ? (
              <SearchableList
                key={kind}
                flat
                label={info.plural}
                noun={info.singular.toLowerCase()}
                items={entries.map((e) => ({ id: e.resource, name: e.short, also: [e.title, e.author, e.series].filter(Boolean).join(' ') }))}
                status={countLine(kind, states, bibles)}
                focus={chosen}
                rankOf={(id) => groupRank(id) * 3 + (states.get(id) === 'pinned' ? 0 : states.get(id) === 'on' ? 1 : 2)}
                groupOf={grouped ? (id) => GROUPS[groupRank(id)] : undefined}
                row={(item) => {
                  const entry = entryOf(item.id)!;
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="title-wrap text-base font-medium">{entry.short}</p>
                          {detailOf(entry) ? <p className="title-wrap text-sm text-muted">{detailOf(entry)}</p> : null}
                          {info.steps === 'parts' && bibles && marksOf(entry.resource, bibles) ? (
                            <p data-testid="bible-marks" className="text-sm font-medium text-accent">
                              Set for {marksOf(entry.resource, bibles)}
                            </p>
                          ) : null}
                        </div>
                        {info.steps === 'parts' ? (
                          <button
                            type="button"
                            aria-label={`Set for… ${entry.short}`}
                            aria-expanded={asking === entry.resource}
                            className={BUTTON}
                            onClick={() => setAsking(asking === entry.resource ? null : entry.resource)}
                          >
                            Set for…
                          </button>
                        ) : (
                          <ThreeStep name={entry.short} current={states.get(entry.resource) ?? 'off'} options={OPTIONS[info.steps]} onChoose={(to) => void choose(entry, to)} />
                        )}
                      </div>
                      {info.steps === 'parts' && asking === entry.resource ? (
                        <div className="px-3 pb-2">
                          <PartChoice name={entry.short} resourceId={entry.resource} onChosen={() => setAsking(null)} />
                        </div>
                      ) : null}
                      {refused === entry.resource ? (
                        <p role="alert" className="px-3 pb-2 text-base text-bad">
                          {pinRefusal(entry)}
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
