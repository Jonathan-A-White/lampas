// src/ParadigmsScreen.tsx — Paradigms (mw-5r3p30.82, #/paradigms, reached from Settings > More beside Review; docs/paradigms.md): the list of
// tables (sixteen, listed in data/paradigms/index.ts) with 'Available forms: N of M' and a bar, and a table (#/paradigms?t=article&mode=study).
// The list groups the tables by the ladder's tier, under the tier's title. A form is available once every grammar idea it needs is at the frontier or solid (grammarLevels); a locked form shows as locked, not hidden, so the
// table keeps its shape. Study mode: an available cell says 'reveal' and a tap shows its form (a tap on a shown one hides it); Review mode: every
// available cell shows its form. One button switches modes; Ask the tutor opens the Reader's Talk sheet on the open chapter with the table's name
// and the forms shown. Names are PROVISIONAL, the Governor to confirm.
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { TIER_TITLES } from './approaches/ladder';
import type { Chapter, GreekWord } from './data/chapter';
import { ideaOf, TIERS } from './data/grammar/ladder';
import {
  availableCount,
  availableText,
  cellName,
  isAvailable,
  paradigmById,
  PARADIGMS,
  type Levels,
  type Paradigm,
  type ParadigmColumn,
} from './data/paradigms';
import { needsOf, needsText } from './data/paradigms/needs';
import { blocksOf, columnsThatFit, greekRemOf } from './data/paradigms/layout';
import { hideAll, revealedOf, toggleRevealed } from './data/paradigms/revealed';
import { getOpenChapter } from './data/readerChapter';
import { PARADIGM_KIND } from './data/paradigms/cells';
import { ensureScheduled, listLevels, markParadigmOpened, reviewsOf } from './data/repositories';
import { useAiAllowed } from './gate/licenceContext';
import { askAboutParadigm } from './nav/readerRequest';
import { backTo, openParadigm, paradigmHash, paradigmOf, replaceHash, useAddress } from './nav/route';
import { oneTap } from './ui/settle';
import { MAX_REVEALED } from './services/talk';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { greekLang } from './script/greekLang';
import { IdeaSheet } from './IdeaSheet';
import { WordSheet, type Lookup } from './WordSheet';

const BUTTON = 'min-h-12 w-full rounded-xl border border-line px-4 text-lg font-medium';

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** The bar of the list: filled to the share of available forms, and the count is written beside it, so colour alone says nothing. */
function Bar({ available, total }: { available: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Available forms"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={available}
      className="mt-2 h-3 overflow-hidden rounded-full border border-line bg-surface"
    >
      <div className="h-full bg-accent" style={{ width: `${(available / total) * 100}%` }} />
    </div>
  );
}

function ParadigmList({ levels }: { levels: Levels | undefined }) {
  return (
    <>
      <ScreenHeader title="Paradigms" back={<HeaderButton onClick={() => backTo('home')}>‹ Reader</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pt-4">
        <p className="text-base text-muted">Tables to learn by heart. A form unlocks when you have the grammar it needs.</p>
        {TIERS.map((tier) => {
          const tables = PARADIGMS.filter((table) => table.tier === tier);
          if (tables.length === 0) return null;
          return (
            <section key={tier} data-tier={tier} aria-labelledby={`tier-${tier}`} className="mt-5">
              <h2 id={`tier-${tier}`} className="text-lg font-semibold text-muted">
                {TIER_TITLES[tier]}
              </h2>
              <ul className="mt-2 grid gap-3">
                {tables.map((table) => {
                  const count = levels ? availableCount(table, levels) : undefined;
                  return (
                    <li key={table.id}>
                      <button
                        type="button"
                        data-paradigm={table.id}
                        onClick={() => openParadigm({ table: table.id })}
                        className="block min-h-16 w-full rounded-xl border border-line px-4 py-3 text-left active:bg-line"
                      >
                        <span data-testid="paradigm-name" {...greekLang(table.id === 'eimi' || table.id === 'oida')} className="block text-xl font-semibold">
                          {table.name}
                        </span>
                        <span className="block text-base text-muted">{table.about}</span>
                        <span data-testid="paradigm-available" className="mt-1 block text-base">
                          {count ? availableText(count) : '…'}
                        </span>
                        {count ? <Bar {...count} /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </main>
    </>
  );
}

/** The first header row of a block, when some columns share a heading: [{label, span}]; null when none do. */
function groupsOf(columns: ParadigmColumn[]): { label: string; span: number }[] | null {
  if (!columns.some((c) => c.group)) return null;
  const groups: { label: string; span: number }[] = [];
  for (const column of columns) {
    const last = groups[groups.length - 1];
    if (last && last.label === (column.group ?? '')) last.span += 1;
    else groups.push({ label: column.group ?? '', span: 1 });
  }
  return groups;
}

/** How many columns of the table fit the box, in a layout effect so the first paint is already right (all of them where the box has no width: jsdom). */
function useColumnsThatFit(table: Paradigm, box: RefObject<HTMLDivElement | null>): number {
  const [fit, setFit] = useState(table.columns.length);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      setFit(el.clientWidth > 0 && rem > 0 ? columnsThatFit(table, el.clientWidth / rem) : table.columns.length);
    };
    measure();
    window.addEventListener('resize', measure);
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    watch?.observe(el);
    return () => {
      window.removeEventListener('resize', measure);
      watch?.disconnect();
    };
  }, [table, box]);
  return fit;
}

// The one cell and label layout of every table (mw-svw421.40): the Greek is text-xl (text-2xl where the table has one or two columns), the
// labels around the cells text-xs in a 5.5rem column, and a word is never broken inside (no break-words: a label wraps at its spaces). A
// table whose forms do not all fit the box in one row of cells is drawn as blocks, each with the columns that fit (src/data/paradigms/layout.ts).
function Table({ table, levels, mode, revealed, onToggle }: {
  table: Paradigm;
  levels: Levels;
  mode: 'study' | 'review';
  revealed: ReadonlySet<string>;
  onToggle: (place: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const fit = useColumnsThatFit(table, box);
  // the locked form he tapped: the line saying what it needs is drawn under its row (mw-svw421.18)
  const [asked, setAsked] = useState<string | null>(null);
  // the idea he opened from that line, and the word he tapped in its examples: both sheets open over the table, which stays (mw-svw421.25)
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [word, setWord] = useState<{ chapter: Chapter; lookup: Lookup } | null>(null);
  const size = greekRemOf(table) > 1.25 ? 'text-2xl' : 'text-xl';
  const label = 'text-xs';
  return (
    <div ref={box} className="mt-3 grid gap-3">
      {ideaId ? (
        <IdeaSheet
          idea={ideaOf(ideaId)}
          onClose={() => setIdeaId(null)}
          covered={word !== null}
          onWord={(chapter: Chapter, tapped: GreekWord) => setWord({ chapter, lookup: { words: [tapped], fromEnglish: false } })}
        />
      ) : null}
      {word ? <WordSheet chapter={word.chapter} lookup={word.lookup} onClose={() => setWord(null)} /> : null}
      {blocksOf(table.columns, fit).map((cols, block) => {
        const columns = cols.map((c) => table.columns[c]);
        const groups = groupsOf(columns);
        return (
          <div key={block} className="overflow-x-auto rounded-xl border border-line">
            <table data-testid="paradigm-table" className="w-full table-fixed border-collapse text-center">
              <caption className="sr-only">{table.name}</caption>
              <thead>
                {groups ? (
                  <tr>
                    <td className="w-[5.5rem]" />
                    {groups.map((g, i) => (
                      <th key={i} colSpan={g.span} scope="colgroup" className="border-b border-l border-line px-1 py-1 text-sm font-semibold text-muted">
                        {g.label}
                      </th>
                    ))}
                  </tr>
                ) : null}
                <tr>
                  <td className="w-[5.5rem]" />
                  {columns.map((c, i) => (
                    <th key={i} scope="col" className={`border-b border-l border-line px-0.5 py-1 font-semibold text-muted ${label}`} aria-label={c.group ? `${c.group} ${c.label}` : c.label}>
                      {c.short ?? c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) => {
                  const askedCol = asked === null ? undefined : cols.find((c) => cellName(table, row, c) === asked && !isAvailable(row.cells[c], levels));
                  return (
                    <Fragment key={r}>
                      {row.group && row.group !== table.rows[r - 1]?.group ? (
                        <tr>
                          <th colSpan={cols.length + 1} scope="rowgroup" className="border-b border-line bg-surface px-2 py-1 text-left text-base font-semibold">
                            {row.group}
                          </th>
                        </tr>
                      ) : null}
                      <tr>
                        <th scope="row" className={`w-[5.5rem] border-b border-line px-1 py-1 text-left font-medium text-muted ${label}`}>
                          {row.label}
                        </th>
                        {cols.map((c) => {
                          const cell = row.cells[c];
                          const place = cellName(table, row, c);
                          const lang = greekLang(cell.lang === 'el');
                          const font = cell.lang === 'el' ? `font-greek ${size}` : 'text-sm';
                          const frame = 'flex min-h-14 w-full min-w-0 items-center justify-center px-0.5';
                          const cellBox = `${frame} ${font}`;
                          if (!isAvailable(cell, levels)) {
                            return (
                              <td key={c} className="border-b border-l border-line p-0.5">
                                <button
                                  type="button"
                                  data-cell={place}
                                  data-state="locked"
                                  aria-expanded={asked === place}
                                  aria-label={`${place}: locked. ${needsText(cell, levels)}`}
                                  onClick={() => oneTap(`paradigms:${place}`, () => setAsked(asked === place ? null : place))}
                                  className={`${cellBox} rounded-lg border border-dashed border-line active:bg-line`}
                                >
                                  <LockIcon />
                                </button>
                              </td>
                            );
                          }
                          const shown = mode === 'review' || revealed.has(place);
                          if (mode === 'review') {
                            return (
                              <td key={c} className="border-b border-l border-line p-0.5">
                                <div data-cell={place} data-state="shown" {...lang} aria-label={`${place}: ${cell.form}`} className={cellBox}>
                                  {cell.form}
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td key={c} className="border-b border-l border-line p-0.5">
                              <button
                                type="button"
                                data-cell={place}
                                data-state={shown ? 'shown' : 'hidden'}
                                aria-pressed={shown}
                                aria-label={shown ? `${place}: ${cell.form}. Tap to hide` : `Reveal ${place}`}
                                {...(shown ? lang : {})}
                                onClick={() => onToggle(place)}
                                className={`${shown ? cellBox : `${frame} ${label} font-medium text-accent active:bg-accent/30 bg-accent/15`} rounded-lg`}
                              >
                                {shown ? cell.form : 'reveal'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                      {askedCol !== undefined ? (
                        <tr>
                          <td colSpan={cols.length + 1} data-testid="lock-needs" role="status" className="border-b border-line bg-surface px-2 py-2 text-left text-base">
                            {needsText(row.cells[askedCol], levels)}
                            <ul aria-label="Ideas it needs" className="mt-2 flex flex-wrap gap-2">
                              {needsOf(row.cells[askedCol], levels).map((idea) => (
                                <li key={idea.id}>
                                  <button
                                    type="button"
                                    data-idea={idea.id}
                                    onClick={() => setIdeaId(idea.id)}
                                    className="min-h-11 rounded-lg border border-line px-3 text-base font-medium text-accent active:bg-line"
                                  >
                                    Go to {idea.title}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/** The forms showing now, each with its place ('Genitive Singular Masculine: τοῦ'), in the table's order. */
function shownForms(table: Paradigm, levels: Levels, mode: 'study' | 'review', revealed: ReadonlySet<string>): string[] {
  return table.rows
    .flatMap((row) => row.cells.map((cell, c) => ({ place: cellName(table, row, c), cell })))
    .filter(({ place, cell }) => isAvailable(cell, levels) && (mode === 'review' || revealed.has(place)))
    .map(({ place, cell }) => `${place}: ${cell.form}`)
    .slice(0, MAX_REVEALED);
}

/** The line under the title: Study says to tap a cell only while a cell is open to tap; with every cell locked it says what opens them (mw-svw421.23). */
function modeHelp(mode: 'study' | 'review', available: number | undefined): string {
  if (mode === 'review') return 'Review mode: every available form is shown.';
  if (available === undefined) return '…';
  return available > 0 ? 'Study mode: tap a cell to reveal it.' : 'Every form is locked. Mark the grammar ideas a form needs to open it.';
}

function ParadigmTable({ table, mode, levels }: { table: Paradigm; mode: 'study' | 'review'; levels: Levels | undefined }) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => revealedOf(table.id));
  const switchTo = mode === 'study' ? 'review' : 'study';
  // the mode button and Hide all take the place of each other as the first tap lands, so they share a key; a cell has its own (mw-svw421.41)
  const ai = useAiAllowed();
  // whether the table is on the back-off schedule: 'Drill this table' puts it there (mw-svw421.6), and it reads 'In Review' once it is
  const inReview = useLiveQuery(async () => (await reviewsOf([{ kind: PARADIGM_KIND, id: table.id }])).length > 0, [table.id]);
  // opening a table is what lets Review ask the endings in it (mw-svw421.5)
  useEffect(() => {
    void markParadigmOpened(table.id).catch((error: unknown) => console.error('could not keep that the table was opened', error));
  }, [table.id]);
  // a table with no form available has nothing to ask: it is not offered to Review until a form opens (mw-svw421.28)
  const canDrill = levels !== undefined && availableCount(table, levels).available > 0;
  const ask = () => {
    if (!levels) return;
    const { book, chapter } = getOpenChapter();
    askAboutParadigm(book, chapter, table.name, shownForms(table, levels, mode, revealed));
  };
  return (
    <>
      <ScreenHeader title={table.name} back={<HeaderButton onClick={() => backTo('paradigms')}>‹ Paradigms</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pt-3">
        <p data-testid="table-available" className="text-lg font-semibold">
          {levels ? availableText(availableCount(table, levels)) : '…'}
        </p>
        <p data-testid="mode-help" className="text-base text-muted">
          {modeHelp(mode, levels ? availableCount(table, levels).available : undefined)}
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => oneTap('paradigms:header', () => replaceHash(paradigmHash({ table: table.id, mode: switchTo })))} className={BUTTON}>
            {switchTo === 'review' ? 'Review mode' : 'Study mode'}
          </button>
          {mode === 'study' && revealed.size > 0 ? (
            <button
              type="button"
              onClick={() =>
                oneTap('paradigms:header', () => {
                  hideAll(table.id);
                  setRevealed(new Set());
                })
              }
              className={BUTTON}
            >
              Hide all
            </button>
          ) : null}
        </div>
        {levels ? (
          <Table table={table} levels={levels} mode={mode} revealed={revealed} onToggle={(place) => oneTap(`paradigms:${place}`, () => setRevealed(toggleRevealed(table.id, place)))} />
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={inReview !== false || !canDrill}
            onClick={() => void ensureScheduled(PARADIGM_KIND, [table.id])}
            className={`${BUTTON} text-accent disabled:text-muted`}
          >
            {inReview ? 'In Review' : 'Drill this table'}
          </button>
          {ai ? (
            <button type="button" onClick={ask} className={`${BUTTON} text-accent`}>
              Ask the tutor
            </button>
          ) : null}
        </div>
        {levels && !canDrill && inReview === false ? (
          <p data-testid="drill-locked" className="mt-2 text-base text-muted">
            Unlock a form first: Review has nothing to ask of this table yet.
          </p>
        ) : null}
      </main>
    </>
  );
}

export function ParadigmsScreen() {
  const levels = useLiveQuery(listLevels, []);
  const { table: id, mode = 'study' } = paradigmOf(useAddress());
  const table = paradigmById(id);
  return table ? <ParadigmTable key={table.id} table={table} mode={mode} levels={levels} /> : <ParadigmList levels={levels} />;
}
