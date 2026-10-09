// src/ParadigmsScreen.tsx — Paradigms (mw-5r3p30.82, #/paradigms, reached from Settings > More beside Review; docs/paradigms.md): the list of
// tables (The article, Noun endings, εἰμί, Verb endings) with 'Available forms: N of M' and a bar, and a table (#/paradigms?t=article&mode=study).
// A form is available once every grammar idea it needs is at the frontier or solid (grammarLevels); a locked form shows as locked, not hidden, so the
// table keeps its shape. Study mode: an available cell says 'reveal' and a tap shows its form (a tap on a shown one hides it); Review mode: every
// available cell shows its form. One button switches modes; Ask the tutor opens the Reader's Talk sheet on the open chapter with the table's name
// and the forms shown. Names are PROVISIONAL, the Governor to confirm.
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, useState } from 'react';
import { ideaOf } from './data/grammar/ladder';
import {
  availableCount,
  availableText,
  cellName,
  isAvailable,
  missingIdeas,
  paradigmById,
  PARADIGMS,
  type Levels,
  type Paradigm,
  type ParadigmColumn,
} from './data/paradigms';
import { hideAll, revealedOf, toggleRevealed } from './data/paradigms/revealed';
import { getOpenChapter } from './data/readerChapter';
import { listLevels } from './data/repositories';
import { askAboutParadigm } from './nav/readerRequest';
import { navigate, openParadigm, paradigmHash, paradigmOf, replaceHash, useAddress } from './nav/route';
import { MAX_REVEALED } from './services/talk';
import { HeaderButton, ScreenHeader } from './ScreenHeader';

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
      <ScreenHeader title="Paradigms" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pt-4">
        <p className="text-base text-muted">Tables to learn by heart. A form unlocks when you have the grammar it needs.</p>
        <ul className="mt-3 grid gap-3">
          {PARADIGMS.map((table) => {
            const count = levels ? availableCount(table, levels) : undefined;
            return (
              <li key={table.id}>
                <button
                  type="button"
                  data-paradigm={table.id}
                  onClick={() => openParadigm({ table: table.id })}
                  className="block min-h-16 w-full rounded-xl border border-line px-4 py-3 text-left active:bg-line"
                >
                  <span data-testid="paradigm-name" lang={table.id === 'eimi' ? 'grc' : undefined} className="block text-xl font-semibold">
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
      </main>
    </>
  );
}

/** The first header row, when some columns share a heading: [{label, span}]; null when none do. */
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

// The Greek's size follows the columns the phone has to share (390 px): 6 columns of the article, 4 of the verb endings, or 2.
const formSize = (columns: number): string => (columns >= 6 ? 'text-xl' : columns >= 4 ? 'text-lg' : 'text-2xl');
// The labels around the cells shrink in the six-column table, where a column is 45 px.
const labelSize = (columns: number): string => (columns >= 6 ? 'text-xs' : 'text-sm');

function Table({ table, levels, mode, revealed, onToggle }: {
  table: Paradigm;
  levels: Levels;
  mode: 'study' | 'review';
  revealed: ReadonlySet<string>;
  onToggle: (place: string) => void;
}) {
  const groups = groupsOf(table.columns);
  const size = formSize(table.columns.length);
  const label = labelSize(table.columns.length);
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table data-testid="paradigm-table" className="w-full table-fixed border-collapse text-center">
        <caption className="sr-only">{table.name}</caption>
        <thead>
          {groups ? (
            <tr>
              <td className="w-22" />
              {groups.map((g, i) => (
                <th key={i} colSpan={g.span} scope="colgroup" className="border-b border-l border-line px-1 py-1 text-sm font-semibold text-muted">
                  {g.label}
                </th>
              ))}
            </tr>
          ) : null}
          <tr>
            <td className="w-22" />
            {table.columns.map((c, i) => (
              <th key={i} scope="col" className={`border-b border-l border-line px-0.5 py-1 font-semibold text-muted ${label}`} aria-label={c.group ? `${c.group} ${c.label}` : c.label}>
                {c.short ?? c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <Fragment key={r}>
              {row.group && row.group !== table.rows[r - 1]?.group ? (
                <tr>
                  <th colSpan={table.columns.length + 1} scope="rowgroup" className="border-b border-line bg-surface px-2 py-1 text-left text-base font-semibold">
                    {row.group}
                  </th>
                </tr>
              ) : null}
              <tr>
                <th scope="row" className={`w-22 break-words border-b border-line px-1 py-1 text-left font-medium text-muted ${label}`}>
                  {row.label}
                </th>
                {row.cells.map((cell, c) => {
                  const place = cellName(table, row, c);
                  const lang = cell.lang === 'el' ? 'grc' : undefined;
                  const font = cell.lang === 'el' ? `font-greek ${size}` : 'text-sm';
                  const frame = 'flex min-h-14 w-full min-w-0 items-center justify-center break-words px-0.5';
                  const box = `${frame} ${font}`;
                  if (!isAvailable(cell, levels)) {
                    const needs = missingIdeas(cell, levels).map((id) => ideaOf(id).title.toLowerCase()).join(', ');
                    return (
                      <td key={c} className="border-b border-l border-line p-0.5">
                        <div data-cell={place} data-state="locked" role="img" aria-label={`${place}: locked. Needs ${needs}`} className={`${box} rounded-lg border border-dashed border-line`}>
                          <LockIcon />
                        </div>
                      </td>
                    );
                  }
                  const shown = mode === 'review' || revealed.has(place);
                  if (mode === 'review') {
                    return (
                      <td key={c} className="border-b border-l border-line p-0.5">
                        <div data-cell={place} data-state="shown" lang={lang} aria-label={`${place}: ${cell.form}`} className={box}>
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
                        lang={shown ? lang : undefined}
                        onClick={() => onToggle(place)}
                        className={`${shown ? box : `${frame} ${label} font-medium text-accent active:bg-accent/30 bg-accent/15`} rounded-lg`}
                      >
                        {shown ? cell.form : 'reveal'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
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

function ParadigmTable({ table, mode, levels }: { table: Paradigm; mode: 'study' | 'review'; levels: Levels | undefined }) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => revealedOf(table.id));
  const switchTo = mode === 'study' ? 'review' : 'study';
  const ask = () => {
    if (!levels) return;
    const { book, chapter } = getOpenChapter();
    askAboutParadigm(book, chapter, table.name, shownForms(table, levels, mode, revealed));
  };
  return (
    <>
      <ScreenHeader title={table.name} back={<HeaderButton onClick={() => openParadigm({})}>‹ Paradigms</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pt-3">
        <p data-testid="table-available" className="text-lg font-semibold">
          {levels ? availableText(availableCount(table, levels)) : '…'}
        </p>
        <p data-testid="mode-help" className="text-base text-muted">
          {mode === 'study' ? 'Study mode: tap a cell to reveal it.' : 'Review mode: every available form is shown.'}
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => replaceHash(paradigmHash({ table: table.id, mode: switchTo }))} className={BUTTON}>
            {switchTo === 'review' ? 'Review mode' : 'Study mode'}
          </button>
          {mode === 'study' && revealed.size > 0 ? (
            <button
              type="button"
              onClick={() => {
                hideAll(table.id);
                setRevealed(new Set());
              }}
              className={BUTTON}
            >
              Hide all
            </button>
          ) : null}
        </div>
        {levels ? (
          <Table table={table} levels={levels} mode={mode} revealed={revealed} onToggle={(place) => setRevealed(toggleRevealed(table.id, place))} />
        ) : null}
        <button type="button" onClick={ask} className={`${BUTTON} mt-4 text-accent`}>
          Ask the tutor
        </button>
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
