// src/diagram/DiagramPane.tsx — the Verse view's Diagram action (mw-souyao.3): the sentence diagram of the verse or the passage in the Reader's current mode.
// It asks fetchDiagram (the kept diagram, else the tutor), says 'Working it out…' while the tutor thinks, draws the answer with ReedKellogg (a box that scrolls sideways) and
// offers Redraw under it with one line saying the tutor drew it. A tap on a word reports the Lookup the Reader's own WordSheet opens (English: the word's chunk, fromEnglish;
// Greek: that Greek word). When the tutor could not (no answer, or a tree that broke THE RULE twice) it says so and why and offers Try again. The pane is keyed by the
// unit and the mode (src/VerseView.tsx), so a switch of the Reader's view is a new pane that asks for the new mode; a Redraw keeps the picture beneath it until the new one comes.
import { useEffect, useMemo, useState } from 'react';
import type { Chapter, Verse } from '../data/chapter';
import type { WovenVerse } from '../data/weave';
import type { Lookup } from '../WordSheet';
import { TutorError } from '../services/tutor';
import { useElapsed } from '../ui/useElapsed';
import { ReedKellogg } from './ReedKellogg';
import { diagramReference } from './request';
import { fetchDiagram, type DiagramResult } from './fetchDiagram';
import type { DiagramMode, DiagramWord } from './types';
import { weaveDiagramWords } from './weave';

const WORKING_LINE = 'Working it out…';
const FAILED_LINE = 'The tutor could not diagram this verse';
const DRAWN_BY_LINE = 'Drawn by the tutor; Redraw if a word sits wrong';

type Drawn = Extract<DiagramResult, { ok: true }>;

/** The verses of the Verse view's unit: the verse, or a passage's verses in order. */
const unitVerses = (chapter: Chapter, unit: Pick<Verse, 'n' | 'to'>): Verse[] => chapter.verses.filter((v) => v.n >= unit.n && v.n <= (unit.to ?? unit.n));

/** What the Reader's WordSheet opens for a tapped word of the diagram: English, its chunk (the chunk's Greek words, its English); Greek, that Greek word (and the chunk it is in); an English word
 * the Weave shows in Greek, the Greek word(s) drawn there, as a tap on the woven text gives (VerseText). */
function lookupOfWord(verses: readonly Verse[], word: DiagramWord): Lookup | undefined {
  const verse = verses.find((v) => v.n === (word.verse ?? verses[0].n));
  if (!verse) return undefined;
  if ('chunk' in word) {
    const chunk = verse.e[word.chunk];
    if (word.weft && chunk) return { words: word.weft.map((i) => verse.g[i]), english: chunk.t, fromEnglish: false };
    return chunk ? { words: chunk.g.map((i) => verse.g[i]), english: chunk.t, fromEnglish: true } : undefined;
  }
  const greek = verse.g[word.word];
  return greek ? { words: [greek], english: greek.e === undefined ? undefined : verse.e[greek.e]?.t, fromEnglish: false } : undefined;
}

/** Why the tutor could not, in plain words. */
function whyOf(result: Extract<DiagramResult, { ok: false }>): string {
  const n = result.faults.length;
  return `Its drawing did not use every word of the verse exactly once (${n} ${n === 1 ? 'thing' : 'things'} wrong), twice over.`;
}

function Working() {
  const [since] = useState(() => Date.now());
  const seconds = useElapsed(since);
  return (
    <p role="status" className="px-1 text-base text-muted">
      {WORKING_LINE}
      <span className="pl-2">{seconds} s</span>
    </p>
  );
}

export interface DiagramPaneProps {
  chapter: Chapter;
  /** the Verse view's verse, or its passage as one Verse (`to` set) */
  verse: Verse;
  view: DiagramMode;
  /** the Reader's Weave of each verse of the chapter, in step with `chapter.verses`; an English diagram draws the words it shows in Greek in Greek. null: not woven (off, or the Greek view) */
  woven?: readonly WovenVerse[] | null;
  /** a tapped word's Lookup: the Reader opens its WordSheet on it */
  onLook: (lookup: Lookup) => void;
}

export function DiagramPane({ chapter, verse, view, woven, onLook }: DiagramPaneProps) {
  // keyed by the unit's numbers, not the object, so a Reader that rebuilds the Verse does not ask again
  const { n, to } = verse;
  const verses = useMemo(() => unitVerses(chapter, { n, to }), [chapter, n, to]);
  // each ask is one run: Redraw and Try again start another
  const [run, setRun] = useState({ n: 0, redraw: false });
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(true);
  const again = (redraw: boolean): void => {
    setWorking(true);
    setProblem(null);
    setRun((r) => ({ n: r.n + 1, redraw }));
  };
  useEffect(() => {
    const stop = new AbortController();
    fetchDiagram(chapter, verses, view, { redraw: run.redraw, signal: stop.signal }).then(
      (result) => {
        if (stop.signal.aborted) return;
        if (result.ok) setDrawn(result);
        else setProblem(whyOf(result));
        setWorking(false);
      },
      (error: unknown) => {
        if (stop.signal.aborted) return;
        setProblem(error instanceof TutorError ? error.message : 'Something went wrong asking the tutor.');
        setWorking(false);
      },
    );
    return () => stop.abort();
  }, [chapter, verses, view, run]);

  // the words as the Weave shows them: the tree is the English one, so a change of Weave redraws with no new ask
  const words = useMemo(
    () => (drawn && view === 'english' && woven ? weaveDiagramWords(drawn.words, verses, (v) => woven[chapter.verses.indexOf(v)] ?? null) : drawn?.words),
    [drawn, view, woven, verses, chapter],
  );

  return (
    <section aria-label="Diagram" data-diagram-pane className="flex flex-col gap-2">
      {working ? <Working /> : null}
      {drawn && words ? (
        <div className={working ? 'opacity-50' : undefined}>
          <ReedKellogg
            diagram={drawn.diagram}
            words={words}
            mode={view}
            reference={diagramReference(chapter, verses)}
            onWord={(index) => {
              const look = lookupOfWord(verses, words[index]);
              if (look) onLook(look);
            }}
          />
        </div>
      ) : null}
      {problem !== null ? (
        <div role="alert" className="rounded-xl border border-line p-3">
          <p className="text-base font-medium">{FAILED_LINE}</p>
          <p className="pt-1 text-sm text-muted">{problem}</p>
          <button
            type="button"
            onClick={() => again(run.redraw)}
            className="mt-2 min-h-12 w-full rounded-xl border border-line px-5 text-base font-medium active:bg-line"
          >
            Try again
          </button>
        </div>
      ) : null}
      {drawn && problem === null ? (
        <>
          <button
            type="button"
            disabled={working}
            onClick={() => again(true)}
            className="min-h-12 w-full rounded-xl border border-line px-5 text-base font-medium active:bg-line disabled:opacity-40"
          >
            Redraw
          </button>
          <p className="px-1 text-sm text-muted">{DRAWN_BY_LINE}</p>
        </>
      ) : null}
    </section>
  );
}
