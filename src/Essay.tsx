// src/Essay.tsx — Robinson's "The Case for Byzantine Priority" inside the app (mw-5r3p30.138, #/preface/robinson, kept in KEPT_PATHS), reached from
// the Preface's Robinson entry. The text is src/essay/robinson.json (made by scripts/essay-build.ts from the appendix of the 2005 edition), loaded when the page
// opens so the main bundle does not carry it; the worker precaches that chunk, so the page reads offline. A footnote's number opens its note under
// the paragraph and a second tap closes it. The 2001 article stays linked at the foot, marked as the old-format page it is, as the older text.
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { Block, Essay as EssayData, Run } from './essay/types';
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { usePageActions } from './PageActions';
import { ESSAY_CREDIT, ESSAY_ORIGINAL, ESSAY_ORIGINAL_NOTE, ESSAY_RELEASE, ESSAY_SOURCE, ESSAY_TITLE } from './preface';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { useReportScreen } from './tutor/screenContext';

const GREEK = /([Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿ ,-]*[Ͱ-Ͽἀ-῿]|[Ͱ-Ͽἀ-῿])/;

/** A stretch of text with its Greek marked, so the Greek font and the Greek voice find it. */
function greekMarked(text: string): ReactNode {
  return text.split(GREEK).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} lang="grc">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

const NOTE_BUTTON =
  'relative px-1 align-super text-xs font-semibold text-accent underline after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[""]';

function Runs({ runs, open, toggle }: { runs: Run[]; open: ReadonlySet<number>; toggle: (n: number) => void }) {
  return (
    <>
      {runs.map((run, i) => {
        if (run.n !== undefined) {
          const n = run.n;
          return (
            <button key={i} type="button" aria-label={`Footnote ${n}`} aria-expanded={open.has(n)} onClick={() => toggle(n)} className={NOTE_BUTTON}>
              {n}
            </button>
          );
        }
        let node: ReactNode = run.t === '\n' ? <br /> : run.t.includes('\n') ? run.t.split('\n').map((line, j) => <Fragment key={j}>{j > 0 && <br />}{greekMarked(line)}</Fragment>) : greekMarked(run.t);
        if (run.sup) node = <sup>{node}</sup>;
        if (run.u) node = <u>{node}</u>;
        if (run.b) node = <strong>{node}</strong>;
        if (run.i) node = <em>{node}</em>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

function Note({ n, runs }: { n: number; runs: Run[] }) {
  return (
    <aside data-footnote={n} role="note" aria-label={`Footnote ${n}`} className="mt-2 break-words rounded-lg border-l-4 border-accent bg-surface px-3 py-2 text-sm leading-relaxed">
      <span className="font-semibold">{n}. </span>
      <Runs runs={runs} open={new Set()} toggle={() => undefined} />
    </aside>
  );
}

/** The notes a block cites that are open, in the order cited. */
function citedBy(block: Block): number[] {
  if (block.k === 'h') return block.n === undefined ? [] : [block.n];
  return block.runs.flatMap((r) => (r.n === undefined ? [] : [r.n]));
}

function BlockView({ block, notes, open, toggle }: { block: Block; notes: EssayData['notes']; open: ReadonlySet<number>; toggle: (n: number) => void }) {
  const shown = citedBy(block).filter((n) => open.has(n) && notes[String(n)]);
  const below = shown.map((n) => <Note key={n} n={n} runs={notes[String(n)]} />);
  if (block.k === 'h') {
    return (
      <>
        <h2 data-read-block className="pt-6 text-lg font-semibold leading-snug">
          {block.text}
          {block.n !== undefined && <Runs runs={[{ t: String(block.n), n: block.n }]} open={open} toggle={toggle} />}
        </h2>
        {below}
      </>
    );
  }
  const indent = block.depth ? (block.depth > 1 ? 'ml-6' : 'ml-3') : '';
  return (
    <>
      <p
        data-read-block
        data-essay-paragraph
        className={`break-words pt-3 text-base leading-relaxed ${indent} ${block.q ? 'border-l-2 border-line pl-3 text-muted' : ''}`}
      >
        {block.n && <span className="mr-1 font-semibold text-muted">{block.n}.</span>}
        <Runs runs={block.runs} open={open} toggle={toggle} />
      </p>
      {below}
    </>
  );
}

export function Essay() {
  useReportScreen({
    name: ESSAY_TITLE,
    facts: [
      { label: 'Essay', value: `${ESSAY_TITLE}, Maurice A. Robinson, the appendix of the Robinson-Pierpont 2005 edition` },
      { label: 'Release', value: 'the 2005 edition released its appendix into the public domain; the copy is that text, not the 2001 journal article' },
    ],
  });
  const scrollRef = useScrollMemory('essay');
  const { buttons, notice } = usePageActions('#/preface/robinson', ESSAY_TITLE);
  const [essay, setEssay] = useState<EssayData | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => {
    let live = true;
    import('./essay/robinson.json')
      .then((m) => live && setEssay(m.default as EssayData))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  const toggle = (n: number) =>
    setOpen((now) => {
      const next = new Set(now);
      if (!next.delete(n)) next.add(n);
      return next;
    });
  return (
    <>
      <ScreenHeader title={ESSAY_TITLE} back={<HeaderButton onClick={() => navigate('preface')}>‹ Preface</HeaderButton>} action={buttons} />
      {notice}
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div className="pb-6">
          <p data-read-block className="pt-4 text-sm text-muted">{ESSAY_CREDIT}</p>
          {failed && (
            <p role="alert" className="pt-4 text-base">
              The essay could not be loaded. Close this page and open it again.
            </p>
          )}
          {!essay && !failed && <p role="status" className="pt-4 text-base text-muted">Loading the essay…</p>}
          {essay?.blocks.map((block, i) => (
            <BlockView key={i} block={block} notes={essay.notes} open={open} toggle={toggle} />
          ))}
          {essay && (
            <section aria-label="About this copy" className="mt-8 border-t border-line pt-4">
              <h2 data-read-block className="text-lg font-semibold">About this copy</h2>
              <p data-read-block className="break-words pt-3 text-base leading-relaxed">{ESSAY_RELEASE}</p>
              <a href={ESSAY_SOURCE.url} target="_blank" rel="noreferrer" className="mt-3 inline-block min-h-11 text-accent underline">
                {ESSAY_SOURCE.name}
              </a>
              <a href={ESSAY_ORIGINAL.url} target="_blank" rel="noreferrer" className="mt-1 inline-block min-h-11 text-accent underline">
                {ESSAY_ORIGINAL.name}
              </a>
              <p className="text-sm text-muted">{ESSAY_ORIGINAL_NOTE}</p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
