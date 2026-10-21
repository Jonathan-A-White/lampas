// src/ParadigmsScreen.tsx — Paradigms (mw-5r3p30.82, #/paradigms, reached from Settings > More beside Review; docs/paradigms.md): the list of
// tables (twenty, listed in data/paradigms/index.ts) with 'Available forms: N of M' and a bar, and a table (#/paradigms?t=article&mode=drill).
// The list groups the tables by the ladder's tier, under the tier's title. A form is his once every grammar idea it needs is at the frontier or solid
// (grammarLevels); How much of a table (the setting 'paradigmExtent', src/settings/definitions/grammarExtent.ts, mw-irpgqi.2, with a switch in this
// screen's header) says which cells are shown: Any (every cell, the ones not his marked not yet), Solid and frontier (his cells; a locked form shows as
// locked, not hidden, so the table keeps its shape) or Solid only (the frontier cells hidden, the locked ones locked). Two modes, Learn | Drill (mw-irpgqi.2):
// Learn shows every shown cell's form; Drill leaves them blank, a tap shows one with Had it / Missed under its row, after the last 'N of M' and Drill the
// missed again (data/paradigms/drill.ts keeps the run while the page lives); a miss puts the table in Review due now (recordDrillMiss). Ask the tutor (the list's and
// each table's, mw-irpgqi.3) opens the round control's sheet over the screen (src/tutor/askNow.ts): the screen reports the table, the mode, the cell in focus and the word he came
// from (paradigmTalk), and the talk is kept per table. The parts this screen shares are listed in docs/paradigm-components.md.
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { TIER_TITLES } from './approaches/ladder';
import type { Chapter, GreekWord } from './data/chapter';
import type { GrammarExtent } from './data/grammar/extent';
import { ideaOf, TIERS } from './data/grammar/ladder';
import {
  availableCount,
  availableText,
  cellName,
  paradigmById,
  PARADIGMS,
  standingOf,
  type CellStanding,
  type Levels,
  type Paradigm,
  type ParadigmCell,
  type ParadigmColumn,
} from './data/paradigms';
import { needsOf, needsText } from './data/paradigms/needs';
import { blocksOf, columnsThatFit, greekRemOf } from './data/paradigms/layout';
import { drillMissed, drillOf, forgetDrill, gradeCell, markMissWritten, revealCell, scoreOf, startRun, type Drill } from './data/paradigms/drill';
import { cellPrompt, PARADIGM_KIND } from './data/paradigms/cells';
import { ensureScheduled, listLevels, markParadigmOpened, recordDrillMiss, reviewsOf, screenRef } from './data/repositories';
import { useAiAllowed } from './gate/licenceContext';
import { backTo, openParadigm, paradigmHash, paradigmOf, replaceHash, useAddress, type ParadigmMode } from './nav/route';
import { decodeParse } from './data/parseCode';
import { ExtentChips } from './settings/controls/grammarExtent';
import { useParadigmExtent } from './settings/useExtent';
import { bringIntoScrollBox } from './ui/reveal';
import { heldWord, leaveToWord } from './wordReturn';
import { oneTap } from './ui/settle';
import { Chips } from './ui/Chips';
import { Grades } from './ui/SelfGrade';
import { MAX_REVEALED, paradigmQuestion, type ParadigmFocus, type ParadigmPlace } from './services/talk';
import { askTheTutor } from './tutor/askNow';
import { useReportScreen } from './tutor/screenContext';
import type { ScreenFact } from './tutor/screen';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { GREEK_LANG, greekLang } from './script/greekLang';
import { IdeaSheet } from './IdeaSheet';
import { WordSheet, type Lookup } from './WordSheet';

/** The word's own cell: a ring inside its box, so the cell next to it is not touched and the table keeps its shape. */
const LIT = 'ring-2 ring-inset ring-accent';

const BUTTON = 'min-h-12 w-full rounded-xl border border-line px-4 text-lg font-medium';

/** The lock of a locked cell; `small` is the mark of a not-yet cell shown under Any (beside its form, or in its blank). */
function LockIcon({ small }: { small?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${small ? 'size-3.5' : 'size-5'} shrink-0 text-muted`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

/** The two words of the switch that chooses the mode (mw-irpgqi.2). */
const MODES: readonly (readonly [ParadigmMode, string])[] = [
  ['learn', 'Learn'],
  ['drill', 'Drill'],
];

/** How much of a table, in the header of a table: the one setting's chips (src/settings/controls/grammarExtent.tsx), smaller, as the header's own. */
const EXTENT_SWITCH_NAME = 'How much of a table';

/** What the tutor is told on the list (the screen's name is Paradigms, as on the round control). */
const LIST_FACTS: ScreenFact[] = [{ label: 'Showing', value: 'The list of the paradigm tables' }];

function ParadigmList({ levels, extent }: { levels: Levels | undefined; extent: GrammarExtent | undefined }) {
  const ai = useAiAllowed();
  useReportScreen({ name: 'Paradigms', facts: LIST_FACTS });
  return (
    <>
      <ScreenHeader title="Paradigms" back={<HeaderButton onClick={() => backTo('home')}>‹ Reader</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pt-4">
        <p className="text-base text-muted">Tables to learn by heart. A form unlocks when you have the grammar it needs.</p>
        {ai ? (
          <button type="button" onClick={() => askTheTutor()} className={`${BUTTON} mt-3 text-accent`}>
            Ask the tutor
          </button>
        ) : null}
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
                  const count = levels && extent ? availableCount(table, levels, extent) : undefined;
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
                          {count ? availableText(count, extent) : '…'}
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
// Each cell is drawn by its standing under How much of a table (data/paradigms standingOf) and the mode: locked (a lock; a tap says what it needs),
// outside (an empty cell: Solid only hides a frontier form), open or notYet (Learn: the form; Drill: blank until tapped, then the form with Had it / Missed
// under its row; a notYet cell carries a small lock and, once tapped, what it needs).
function Table({ table, levels, extent, mode, drill, lit, onReveal, onGrade, onFocus }: {
  table: Paradigm;
  /** the name of the cell that is a tapped word's own: outlined and brought into view, and for a locked one its Needs line is open (mw-irpgqi.1) */
  lit?: string;
  levels: Levels;
  extent: GrammarExtent;
  mode: ParadigmMode;
  /** the Drill's run, when one has started */
  drill: Drill | undefined;
  onReveal: (place: string) => void;
  onGrade: (place: string, right: boolean) => void;
  /** he tapped the cell `place` (a locked or not-yet one in Learn): the cell the tutor is told he is on */
  onFocus: (place: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const fit = useColumnsThatFit(table, box);
  // the locked or not-yet form he tapped in Learn: the line saying what it needs is drawn under its row (mw-svw421.18)
  const [asked, setAsked] = useState<string | null>(() => lit ?? null);
  // the idea he opened from that line, and the word he tapped in its examples: both sheets open over the table, which stays (mw-svw421.25)
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [word, setWord] = useState<{ chapter: Chapter; lookup: Lookup } | null>(null);
  // the word's own cell is brought into view in the screen's scroll box once the table is drawn in the blocks that fit (a change of blocks moves it)
  useLayoutEffect(() => {
    if (lit) bringIntoScrollBox(box.current?.querySelector<HTMLElement>('[data-lit]') ?? null);
  }, [lit, fit, table]);
  const size = greekRemOf(table) > 1.25 ? 'text-2xl' : 'text-xl';
  const label = 'text-xs';
  const toggleAsked = (place: string) =>
    oneTap(`paradigms:${place}`, () => {
      setAsked(asked === place ? null : place);
      onFocus(place);
    });
  /** What a shown Drill cell has been graded, if it has: had (this run or an earlier one) or missed. */
  const gradeOf = (place: string): 'had' | 'missed' | undefined => {
    if (!drill) return undefined;
    const graded = drill.graded.get(place);
    return graded === true || drill.kept.has(place) ? 'had' : graded === false ? 'missed' : undefined;
  };
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
                  const standings = cols.map((c) => standingOf(row.cells[c], levels, extent));
                  // the Needs line of a locked cell, or of a not-yet cell in Learn, that he tapped
                  const askedCol = asked === null ? undefined : cols.find((c, i) => cellName(table, row, c) === asked && (standings[i] === 'locked' || (standings[i] === 'notYet' && mode === 'learn')));
                  // the open cell of the Drill, when it is in this row: Had it / Missed go under the row
                  const openCol = mode === 'drill' && drill?.open !== null && drill !== undefined ? cols.find((c) => cellName(table, row, c) === drill.open) : undefined;
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
                        {cols.map((c, i) => {
                          const cell = row.cells[c];
                          const place = cellName(table, row, c);
                          const standing = standings[i];
                          const lang = greekLang(cell.lang === 'el');
                          const font = cell.lang === 'el' ? `font-greek ${size}` : 'text-sm';
                          const frame = 'flex min-h-14 w-full min-w-0 items-center justify-center px-0.5';
                          const cellBox = `${frame} ${font}`;
                          const ring = place === lit ? LIT : '';
                          if (standing === 'locked') {
                            return (
                              <td key={c} className="border-b border-l border-line p-0.5">
                                <button
                                  type="button"
                                  data-cell={place}
                                  data-lit={place === lit || undefined}
                                  data-state="locked"
                                  aria-expanded={asked === place}
                                  aria-label={`${place}: locked. ${needsText(cell, levels)}`}
                                  onClick={() => toggleAsked(place)}
                                  className={`${cellBox} rounded-lg border border-dashed border-line active:bg-line ${ring}`}
                                >
                                  <LockIcon />
                                </button>
                              </td>
                            );
                          }
                          if (standing === 'outside') {
                            // Solid only hides a frontier form: the cell stays, empty, so the table keeps its shape
                            return (
                              <td key={c} className="border-b border-l border-line p-0.5">
                                <div data-cell={place} data-lit={place === lit || undefined} data-state="outside" className={`${frame} ${ring ? `rounded-lg ${ring}` : ''}`}>
                                  <span className="sr-only">{place}: at the frontier, hidden by Solid only</span>
                                </div>
                              </td>
                            );
                          }
                          const notYet = standing === 'notYet';
                          const mark = notYet ? { 'data-standing': 'notYet' as const } : {};
                          const tone = notYet ? 'text-muted' : '';
                          if (mode === 'learn') {
                            if (notYet) {
                              // under Any: the form is shown, marked not yet; a tap says what it needs (as a lock's does)
                              return (
                                <td key={c} className="border-b border-l border-line p-0.5">
                                  <button
                                    type="button"
                                    data-cell={place}
                                    data-lit={place === lit || undefined}
                                    data-state="shown"
                                    {...mark}
                                    aria-expanded={asked === place}
                                    aria-label={`${place}: ${cell.form}, not yet. ${needsText(cell, levels)}`}
                                    onClick={() => toggleAsked(place)}
                                    className={`${cellBox} ${tone} gap-1 rounded-lg active:bg-line ${ring}`}
                                  >
                                    <span {...lang}>{cell.form}</span>
                                    <LockIcon small />
                                  </button>
                                </td>
                              );
                            }
                            return (
                              <td key={c} className="border-b border-l border-line p-0.5">
                                <div data-cell={place} data-lit={place === lit || undefined} data-state="shown" {...lang} aria-label={`${place}: ${cell.form}`} className={`${cellBox} ${ring ? `rounded-lg ${ring}` : ''}`}>
                                  {cell.form}
                                </div>
                              </td>
                            );
                          }
                          // Drill
                          const grade = gradeOf(place);
                          const open = drill?.open === place;
                          if (!open && grade === undefined) {
                            return (
                              <td key={c} className="border-b border-l border-line p-0.5">
                                <button
                                  type="button"
                                  data-cell={place}
                                  data-lit={place === lit || undefined}
                                  data-state="hidden"
                                  {...mark}
                                  aria-label={`Reveal ${place}${notYet ? ' (not yet)' : ''}`}
                                  onClick={() => oneTap(`paradigms:${place}`, () => onReveal(place))}
                                  className={`${frame} rounded-lg bg-accent/15 active:bg-accent/30 ${ring}`}
                                >
                                  {notYet ? <LockIcon small /> : null}
                                </button>
                              </td>
                            );
                          }
                          const graded = grade === 'had' ? 'bg-good/15' : grade === 'missed' ? 'bg-bad/15' : '';
                          const said = grade === 'had' ? ', had it' : grade === 'missed' ? ', missed' : '';
                          return (
                            <td key={c} className="border-b border-l border-line p-0.5">
                              <div
                                data-cell={place}
                                data-lit={place === lit || undefined}
                                data-state="shown"
                                data-open={open || undefined}
                                data-grade={grade}
                                {...mark}
                                {...(notYet ? {} : lang)}
                                aria-label={`${place}: ${cell.form}${notYet ? ', not yet' : ''}${said}`}
                                className={`${cellBox} ${tone} gap-1 rounded-lg ${graded} ${ring}`}
                              >
                                {notYet ? <span {...lang}>{cell.form}</span> : cell.form}
                                {notYet ? <LockIcon small /> : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      {askedCol !== undefined ? (
                        <tr>
                          <td colSpan={cols.length + 1} className="border-b border-line bg-surface px-2 py-2">
                            <NeedsNote cell={row.cells[askedCol]} levels={levels} onIdea={setIdeaId} />
                          </td>
                        </tr>
                      ) : null}
                      {openCol !== undefined ? (
                        <tr>
                          <td colSpan={cols.length + 1} data-testid="grade-row" className="border-b border-line bg-surface px-2 py-2 text-left">
                            <p className="text-base text-muted">{cellPrompt(table, row, openCol)}</p>
                            {standings[cols.indexOf(openCol)] === 'notYet' ? <NeedsNote cell={row.cells[openCol]} levels={levels} onIdea={setIdeaId} /> : null}
                            <Grades right={HAD_IT} wrong={MISSED} picked={null} onPick={(grade) => onGrade(cellName(table, row, openCol), grade === HAD_IT)} settleKey={drill?.open} className="mt-2" />
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

/** The two words of the Drill's grade (mw-irpgqi.2). */
const HAD_IT = 'Had it';
const MISSED = 'Missed';

/** What a locked or not-yet form needs, in words, and a Go to button for each idea (mw-svw421.25): under a lock he tapped, or in the grade line of a not-yet cell. */
function NeedsNote({ cell, levels, onIdea }: { cell: ParadigmCell; levels: Levels; onIdea: (id: string) => void }) {
  return (
    <div data-testid="lock-needs" role="status" className="text-left text-base">
      {needsText(cell, levels)}
      <ul aria-label="Ideas it needs" className="mt-2 flex flex-wrap gap-2">
        {needsOf(cell, levels).map((idea) => (
          <li key={idea.id}>
            <button type="button" data-idea={idea.id} onClick={() => onIdea(idea.id)} className="min-h-11 rounded-lg border border-line px-3 text-base font-medium text-accent active:bg-line">
              Go to {idea.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The cells the table shows, in its order, each with its name and standing: open and notYet are shown (and asked by the Drill); outside and locked are not. */
function shownCells(table: Paradigm, levels: Levels, extent: GrammarExtent): { place: string; cell: ParadigmCell; standing: CellStanding }[] {
  return table.rows.flatMap((row) => row.cells.map((cell, c) => ({ place: cellName(table, row, c), cell, standing: standingOf(cell, levels, extent) }))).filter(({ standing }) => standing === 'open' || standing === 'notYet');
}

/** Whether a Drill cell shows its form: it is the open one, graded, or kept from an earlier run. */
const revealedIn = (drill: Drill | undefined, place: string): boolean => drill !== undefined && (drill.open === place || drill.graded.has(place) || drill.kept.has(place));

/** The forms showing now, each with its place ('Genitive Singular Masculine: τοῦ'), in the table's order: in Learn every shown cell, in Drill the ones he has tapped. */
function shownForms(table: Paradigm, levels: Levels, extent: GrammarExtent, mode: ParadigmMode, drill: Drill | undefined): string[] {
  return shownCells(table, levels, extent)
    .filter(({ place }) => mode === 'learn' || revealedIn(drill, place))
    .map(({ place, cell }) => `${place}: ${cell.form}`)
    .slice(0, MAX_REVEALED);
}

/**
 * The line under the title. Learn says every form is shown (under Any, that the ones not his are marked). Drill says to tap a blank cell only while there is one;
 * with none it says what would open one: every form locked (mw-svw421.23), or, under Solid only with his forms all at the frontier, that Solid only hides them.
 */
function modeHelp(mode: ParadigmMode, extent: GrammarExtent, shown: number, his: number): string {
  if (mode === 'learn') return extent === 'any' ? 'Learn: every form is shown, the ones you do not have yet marked not yet.' : 'Learn: every available form is shown.';
  if (shown > 0) return 'Drill: tap a blank cell to see its form, then say whether you had it.';
  if (extent === 'solid' && his > 0) return 'No form is solid yet. Solid only hides the forms at the frontier.';
  return 'Every form is locked. Mark the grammar ideas a form needs to open it.';
}

/** A parsing code in plain words; the code itself when it is not one (an address is typed or kept). */
function plainParse(code: string): string {
  try {
    return decodeParse(code);
  } catch {
    return code;
  }
}

/** The word a tap on it sent him here from, with its parsing in plain words ('ἀγαπῶ: present active indicative, 1st person singular'), and what is lit in the table. */
function WordLine({ word, parse, lit }: { word: string; parse: string; lit: boolean }) {
  return (
    <div data-testid="word-line" className="mb-2 rounded-xl border border-line px-3 py-2">
      <p className="text-lg">
        <span {...GREEK_LANG} className="font-greek text-xl font-bold">
          {word}
        </span>
        : {plainParse(parse)}
      </p>
      <p data-testid="word-lit" className="text-base text-muted">
        {lit ? 'Its form is outlined in the table.' : 'The table has no cell for this form yet.'}
      </p>
    </div>
  );
}

/** The end of a Drill run: 'N of M', and Drill the missed again while any was missed. */
function DrillEnd({ drill, onMissedAgain }: { drill: Drill; onMissedAgain: () => void }) {
  const { had, of, missed } = scoreOf(drill);
  return (
    <div data-testid="drill-end" className="mt-3 flex flex-wrap items-center gap-3">
      <p data-testid="drill-score" role="status" className="text-lg font-semibold">
        {had} of {of}
      </p>
      {missed.length > 0 ? (
        <button type="button" onClick={onMissedAgain} className={`${BUTTON} flex-1 text-accent`}>
          Drill the missed again
        </button>
      ) : null}
    </div>
  );
}

/** The Drill's run as the table stands now: a cell the run asks that his levels no longer show is left out of the count. */
function runOf(drill: Drill | undefined, shown: ReadonlySet<string>): Drill | undefined {
  if (!drill) return undefined;
  const asking = drill.asking.filter((place) => shown.has(place));
  return asking.length === drill.asking.length ? drill : { ...drill, asking };
}

/** The cell `place` of the table as the tutor is told it: its place in plain words, and its form when the table shows it (Drill shows only the ones he has tapped; a locked or hidden one is never told). */
function placeOf(table: Paradigm, place: string, levels: Levels, extent: GrammarExtent, mode: ParadigmMode, drill: Drill | undefined): ParadigmPlace | undefined {
  for (const row of table.rows) {
    for (let c = 0; c < row.cells.length; c++) {
      if (cellName(table, row, c) !== place) continue;
      const standing = standingOf(row.cells[c], levels, extent);
      const shown = (standing === 'open' || standing === 'notYet') && (mode === 'learn' || revealedIn(drill, place));
      return { parse: place, ...(shown ? { form: row.cells[c].form } : {}) };
    }
  }
  return undefined;
}

/**
 * What the tutor is told on a table (mw-irpgqi.3): the focus the first question carries (the table, the mode, the forms showing, the cell in focus and the word he came from) and the facts
 * every question of the table's talk carries, so a question asked after he moved to another cell is about that one. `cell` is the last cell he tapped, or the word's own.
 */
function paradigmTalk(table: Paradigm, mode: ParadigmMode, state: { levels: Levels; extent: GrammarExtent; drill: Drill | undefined; cell: string | undefined; word: string | undefined; parse: string | undefined } | undefined): { focus: ParadigmFocus; facts: ScreenFact[] } {
  const here = state?.cell !== undefined ? placeOf(table, state.cell, state.levels, state.extent, mode, state.drill) : undefined;
  const word = state?.word && state.parse ? { form: state.word, parse: plainParse(state.parse) } : undefined;
  const facts: ScreenFact[] = [
    { label: 'Table', value: table.name },
    { label: 'Mode', value: mode === 'learn' ? 'Learn' : 'Drill' },
    ...(here ? [{ label: 'Cell in focus', value: here.form ? `${here.parse}: ${here.form}` : `${here.parse} (its form is not shown)` }] : []),
    ...(word ? [{ label: 'Word he came from', value: `${word.form} (${word.parse})` }] : []),
  ];
  const revealed = state ? shownForms(table, state.levels, state.extent, mode, state.drill) : [];
  return { focus: { table: table.name, revealed, kind: 'paradigm', mode, ...(here ? { cell: here } : {}), ...(word ? { word } : {}) }, facts };
}

function ParadigmTable({ table, mode, levels, extent, cell, word, parse }: { table: Paradigm; mode: ParadigmMode; levels: Levels | undefined; extent: GrammarExtent | undefined; cell?: string; word?: string; parse?: string }) {
  const [drill, setDrill] = useState<Drill | undefined>(() => drillOf(table.id));
  // the last cell he tapped (Learn: a locked or not-yet one; Drill: a blank one he showed): the tutor is told he is on it, else on the word's own
  const [tapped, setTapped] = useState<string | null>(null);
  const ai = useAiAllowed();
  // from a word's sheet the way back is to the sheet (src/wordReturn.ts); with the sheet gone (a reload) it is the list
  const toWord = word !== undefined && heldWord() !== undefined;
  // the word's cell, when the table has a cell by that name (an address kept from an older table may not)
  const lit = cell !== undefined && table.rows.some((row) => row.cells.some((_, c) => cellName(table, row, c) === cell)) ? cell : undefined;
  const back = toWord ? (
    <HeaderButton onClick={() => leaveToWord(() => backTo('paradigms'))}>‹ Word</HeaderButton>
  ) : (
    <HeaderButton onClick={() => backTo('paradigms')}>‹ Paradigms</HeaderButton>
  );
  // whether the table is on the back-off schedule: 'Drill this table' puts it there (mw-svw421.6), and it reads 'In Review' once it is
  const inReview = useLiveQuery(async () => (await reviewsOf([{ kind: PARADIGM_KIND, id: table.id }])).length > 0, [table.id]);
  // opening a table is what lets Review ask the endings in it (mw-svw421.5)
  useEffect(() => {
    void markParadigmOpened(table.id).catch((error: unknown) => console.error('could not keep that the table was opened', error));
  }, [table.id]);
  // a change of How much of a table starts the Drill over: the cells it asked are no longer the blank ones
  const extentSeen = useRef(extent);
  useEffect(() => {
    if (extent === undefined || extentSeen.current === undefined) {
      extentSeen.current = extent;
      return;
    }
    if (extentSeen.current === extent) return;
    extentSeen.current = extent;
    forgetDrill(table.id);
    setDrill(undefined);
  }, [extent, table.id]);
  // a table with no form his has nothing for Review to ask: it is not offered until a form opens (mw-svw421.28), whatever the extent shows
  const his = levels ? availableCount(table, levels).available : 0;
  const canDrill = levels !== undefined && his > 0;
  const cells = levels && extent ? shownCells(table, levels, extent) : [];
  const shown = new Set(cells.map(({ place }) => place));
  const run = runOf(drill, shown);
  const score = run && mode === 'drill' ? scoreOf(run) : undefined;
  const started = run !== undefined && (run.open !== null || run.graded.size > 0 || run.kept.size > 0);
  const reveal = (place: string) => {
    setTapped(place);
    if (!drillOf(table.id)) startRun(table.id, [...shown]);
    setDrill(revealCell(table.id, place));
  };
  const grade = (place: string, right: boolean) => {
    let next = gradeCell(table.id, place, right);
    // the run's first miss puts the table in Review, due now, as a missed Review cell would (one write a run, as a round's row takes one outcome)
    if (!right && !next.missWritten) {
      next = markMissWritten(table.id);
      void recordDrillMiss(PARADIGM_KIND, table.id).catch((error: unknown) => console.error('could not record the miss', error));
    }
    setDrill(next);
  };
  // the tutor is told the table, the mode, the cell in focus and the word (paradigmTalk); the talk is the table's own
  const talk = paradigmTalk(table, mode, levels && extent ? { levels, extent, drill: run, cell: tapped ?? lit, word, parse } : undefined);
  useReportScreen({ name: 'Paradigms', facts: talk.facts, kept: screenRef(`paradigms.${table.id}`) });
  const ask = () => askTheTutor({ question: paradigmQuestion(table.name, talk.focus.revealed.length, talk.focus), focus: talk.focus });
  return (
    <>
      <ScreenHeader title={table.name} back={back} action={<ExtentChips settingKey="paradigmExtent" name={EXTENT_SWITCH_NAME} current={extent} size="header" />} />
      <main className="screen min-h-0 flex-1 px-4 pt-3">
        {word && parse ? <WordLine word={word} parse={parse} lit={lit !== undefined} /> : null}
        <p data-testid="table-available" className="text-lg font-semibold">
          {levels && extent ? availableText(availableCount(table, levels, extent), extent) : '…'}
        </p>
        <p data-testid="mode-help" className="text-base text-muted">
          {levels && extent ? modeHelp(mode, extent, cells.length, his) : '…'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chips name="Mode" current={mode} options={MODES} onChoose={(next) => next !== mode && replaceHash(paradigmHash({ table: table.id, mode: next as ParadigmMode, cell, word, parse }))} />
          {mode === 'drill' && started ? (
            <button
              type="button"
              onClick={() =>
                oneTap('paradigms:header', () => {
                  forgetDrill(table.id);
                  setDrill(undefined);
                })
              }
              className={`${BUTTON} flex-1`}
            >
              Start again
            </button>
          ) : null}
        </div>
        {levels && extent ? <Table table={table} levels={levels} extent={extent} mode={mode} drill={run} lit={lit} onReveal={reveal} onGrade={grade} onFocus={setTapped} /> : null}
        {score?.done && run ? <DrillEnd drill={run} onMissedAgain={() => oneTap('paradigms:end', () => setDrill(drillMissed(table.id)))} /> : null}
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
  const extent = useParadigmExtent();
  const { table: id, mode = 'drill', cell, word, parse } = paradigmOf(useAddress());
  const table = paradigmById(id);
  return table ? <ParadigmTable key={table.id} table={table} mode={mode} levels={levels} extent={extent} cell={cell} word={word} parse={parse} /> : <ParadigmList levels={levels} extent={extent} />;
}
