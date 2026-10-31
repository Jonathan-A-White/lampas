// src/diagram/DiagramPane.tsx — the Verse view's Diagram action (mw-souyao.3): the sentence diagram of the verse or the passage in the Reader's current mode.
// It asks fetchDiagram (the kept diagram, else the tutor), says 'Working it out…' while the tutor thinks, draws the answer with ReedKellogg (a box that scrolls sideways) and
// offers Redraw under it with one line saying the tutor drew it and a quiet link, 'How to read this', to the lesson (#/diagram-lesson; mw-q6t5tvn.2), and above a drawn diagram one line inviting him to the lesson
// (Learn, Not now) until he has finished it or dismissed it. A tap on a word reports the Lookup the Reader's own WordSheet opens (English: the word's chunk, fromEnglish;
// Greek: that Greek word). When the tutor could not (no answer, or a tree that broke THE RULE twice) it says so and why and offers Try again. The pane is keyed by the
// unit and the mode (src/VerseView.tsx), so a switch of the Reader's view is a new pane that asks for the new mode; a Redraw keeps the picture beneath it until the new one comes.
// BY SENTENCE (mw-5r3p30.897): Diagram on a verse draws the sentence the verse belongs to (src/diagram/sentence.ts): Ephesians 1:5 draws 1:3-14 as one, a verse of two sentences draws two, stacked, each
// with its own kept diagram, Redraw and caption ('Ephesians 1:3-14, one sentence'). The pane is the stack; SentenceDiagram is one sentence's.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { isOneVerse } from '../data/passage';
import type { Chapter, Verse } from '../data/chapter';
import { getStudyResources } from '../data/repositories';
import type { WovenVerse } from '../data/weave';
import type { Lookup } from '../WordSheet';
import { navigate } from '../nav/route';
import { armFallback } from '../resources/openApp';
import { TutorError } from '../services/tutor';
import { useElapsed } from '../ui/useElapsed';
import { ReedKellogg } from './ReedKellogg';
import { diagramReference, sentenceVerses } from './request';
import { isWholeVerses, loadSentenceTable, sentenceEnds, sentencesAt, type Sentence } from './sentence';
import { fetchDiagram, type DiagramResult } from './fetchDiagram';
import { keepInviteDismissed, lessonInvited } from './lesson';
import { diagramLogosLinks } from './logosLinks';
import type { DiagramMode, DiagramWord } from './types';
import { weaveDiagramWords } from './weave';

const WORKING_LINE = 'Working it out…';
const FAILED_LINE = 'The tutor could not diagram this verse';
const DRAWN_BY_LINE = 'Drawn by the tutor; Redraw if a word sits wrong';
const INVITATION_LINE = 'New to diagrams? Learn to read one, about 3 minutes';
const INVITE_BUTTON = 'min-h-12 rounded-xl border border-line px-4 text-base font-medium text-accent active:bg-line';

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

const LOGOS_LINK = 'inline-flex min-h-12 items-center rounded-lg border border-line px-3 text-base font-medium text-accent active:bg-line';

/** 'See it in Logos': the books of his library that show this verse's syntax (logosLinks.ts), for the unit's first verse; nothing while Logos is Off in Settings > Study resources. */
function SeeItInLogos({ chapter, n }: { chapter: Chapter; n: number }) {
  const logos = useLiveQuery(async () => (await getStudyResources()).on.includes('logos'), []);
  if (!logos) return null;
  const links = diagramLogosLinks({ book: chapter.code, chapter: chapter.chapter, verse: n }, chapter.lang === 'hbo' ? 'hbo' : 'grc');
  return (
    <div role="group" aria-label="See it in Logos" data-diagram-logos className="flex flex-col gap-1 px-1">
      <p className="text-sm text-muted">See it in Logos</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a key={link.label} href={link.url} data-fallback={link.fallback} onClick={() => armFallback(link.fallback)} className={LOGOS_LINK}>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
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
  /** the Verse view's verse (a passage, `to` set, is drawn whole: nothing offers Diagram on one now, mw-5r3p30.895) */
  verse: Verse;
  view: DiagramMode;
  /** the Reader's Weave of each verse of the chapter, in step with `chapter.verses`; an English diagram draws the words it shows in Greek in Greek. null: not woven (off, or the Greek view) */
  woven?: readonly WovenVerse[] | null;
  /** a tapped word's Lookup: the Reader opens its WordSheet on it */
  onLook: (lookup: Lookup) => void;
}

/** The line that names a sentence: its verses and that it is one sentence, and, in a verse of several, which it is ('John 2:4, one sentence (1 of 2 in verse 4)'). Nothing for a sentence that is one whole verse. */
export function sentenceCaption(chapter: Chapter, sentence: Sentence, index: number, count: number, verse: number): string | null {
  const verses = sentenceVerses(chapter, sentence);
  if (verses.length === 1 && isWholeVerses(chapter, sentence)) return null;
  return `${diagramReference(chapter, verses)}, one sentence${count > 1 ? ` (${index + 1} of ${count} in verse ${verse})` : ''}`;
}

/** The pane: the sentence(s) the Verse view's verse belongs to, one diagram each, stacked. */
export function DiagramPane({ chapter, verse, view, woven, onLook }: DiagramPaneProps) {
  const { n, to } = verse;
  const [table, setTable] = useState<Awaited<ReturnType<typeof loadSentenceTable>> | null>(null);
  useEffect(() => {
    let live = true;
    void loadSentenceTable().then((t) => live && setTable(t));
    return () => {
      live = false;
    };
  }, []);
  // a passage (nothing offers Diagram on one) is drawn whole, as it was before sentences
  const sentences = useMemo<Sentence[] | null>(() => {
    if (!table) return null;
    if (!isOneVerse({ n, to })) {
      const verses = unitVerses(chapter, { n, to });
      return [{ parts: verses.map((v) => ({ verse: v.n, from: 0, to: v.g.length - 1 })) }];
    }
    return sentencesAt(chapter, n, sentenceEnds(chapter, table));
  }, [table, chapter, n, to]);
  if (!sentences) {
    return (
      <section aria-label="Diagram" data-diagram-pane className="flex flex-col gap-2">
        <Working />
      </section>
    );
  }
  return (
    <section aria-label="Diagram" data-diagram-pane className="flex flex-col gap-6">
      {sentences.map((sentence, k) => (
        <SentenceDiagram
          key={`${sentence.parts[0].verse}.${sentence.parts[0].from}`}
          chapter={chapter}
          sentence={sentence}
          caption={sentenceCaption(chapter, sentence, k, sentences.length, n)}
          first={k === 0}
          view={view}
          woven={woven}
          onLook={onLook}
        />
      ))}
    </section>
  );
}

interface SentenceDiagramProps extends Omit<DiagramPaneProps, 'verse'> {
  sentence: Sentence;
  caption: string | null;
  /** the first of the stack: only it carries the invitation to the lesson */
  first: boolean;
}

/** One sentence: asked for (or kept), worked out, drawn, redrawable. */
function SentenceDiagram({ chapter, sentence, caption, first, view, woven, onLook }: SentenceDiagramProps) {
  // an Old Testament chapter read in its source language (the Reader's 'greek' view) is diagrammed in its Hebrew (mw-5r3p30.887)
  const mode: DiagramMode = chapter.lang === 'hbo' && view === 'greek' ? 'hebrew' : view;
  const verses = useMemo(() => sentenceVerses(chapter, sentence), [chapter, sentence]);
  const n = verses[0].n;
  const reference = caption ?? diagramReference(chapter, verses);
  // each ask is one run: Redraw and Try again start another
  const [run, setRun] = useState({ n: 0, redraw: false });
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(true);
  // the invitation to the lesson (mw-q6t5tvn.2): shown above a drawn diagram until he has finished the lesson or tapped Not now
  const [invited, setInvited] = useState(lessonInvited);
  const again = (redraw: boolean): void => {
    setWorking(true);
    setProblem(null);
    setRun((r) => ({ n: r.n + 1, redraw }));
  };
  useEffect(() => {
    const stop = new AbortController();
    fetchDiagram(chapter, verses, mode, { redraw: run.redraw, signal: stop.signal, sentence }).then(
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
  }, [chapter, verses, mode, run, sentence]);

  // the words as the Weave shows them: the tree is the English one, so a change of Weave redraws with no new ask
  const words = useMemo(
    () => (drawn && mode === 'english' && woven && chapter.lang !== 'hbo' ? weaveDiagramWords(drawn.words, verses, (v) => woven[chapter.verses.indexOf(v)] ?? null) : drawn?.words),
    [drawn, mode, woven, verses, chapter],
  );

  return (
    <div data-diagram-sentence className="flex flex-col gap-2">
      {caption ? <p className="px-1 text-sm text-muted" data-diagram-caption>{caption}</p> : null}
      {working ? <Working /> : null}
      {drawn && words && problem === null && invited && first ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3" data-testid="diagram-invitation">
          <p className="text-base">{INVITATION_LINE}</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate('diagram-lesson')} className={INVITE_BUTTON}>
              Learn
            </button>
            <button
              type="button"
              onClick={() => {
                keepInviteDismissed();
                setInvited(false);
              }}
              className={INVITE_BUTTON}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
      {drawn && words ? (
        <div className={working ? 'opacity-50' : undefined}>
          <ReedKellogg
            diagram={drawn.diagram}
            words={words}
            mode={mode}
            reference={reference}
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
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <p className="px-1 text-sm text-muted">{DRAWN_BY_LINE}</p>
            <button type="button" onClick={() => navigate('diagram-lesson')} className="min-h-12 px-1 text-sm text-accent underline underline-offset-4">
              How to read this
            </button>
          </div>
          <SeeItInLogos chapter={chapter} n={n} />
        </>
      ) : null}
    </div>
  );
}
