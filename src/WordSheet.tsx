// src/WordSheet.tsx — the bottom sheet a tapped word opens: the Greek word as it stands, how to say it (a respelling
// in the pronunciation chosen in Settings), lemma, parsing in plain words, gloss and Strong's. Closes by a tap
// outside, a swipe down on its handle, the Done button, Escape or the phone's Back (src/ui/sheetBack.ts). Each word has a Help with this word row (Grammar, Sound it out)
// when the screen gives it somewhere to send them: the Talk sheet on the word's verse with the first question sent. Every grammar
// word of the Parsing is a link to its Grammar sheet (src/GrammarSheet.tsx), which opens over this one: underlined until he marks
// the term I know this, plain after. A Study row holds the links of the study resources he switched on in Settings (src/resources/),
// and is not drawn when none is on.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { type Chapter, type GreekWord, wordGloss, wordLemma, wordParse } from './data/chapter';
import { parseSegments } from './data/parseCode';
import { getStudyResources, type StudyResources } from './data/repositories';
import { publish, useLatest } from './events/bus';
import { GrammarSheet } from './GrammarSheet';
import { optionOf, RESOURCES, type StudyLink, type StudyRef } from './resources';
import { armFallback } from './resources/openApp';
import { pronunciationOf, type GreekPronunciation } from './speech/pronunciation';
import { SpeakButton } from './speech/SpeakButton';
import { focusOnMount } from './ui/focus';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import { useKnownTerms } from './useKnownTerms';

/** What was tapped: Greek words, and the English they stand for. `english` is the tapped chunk, or a Greek word's own chunk. */
export interface Lookup {
  words: GreekWord[];
  english?: string;
  /** true when the English was what he tapped (the sheet then heads with it) */
  fromEnglish: boolean;
}

/** What a tap on Grammar or Sound it out asks for: the word as it stands, its lemma, its parsing as the sheet shows it, and
 * the verse it stands in. */
export interface WordHelp {
  kind: 'grammar' | 'sound';
  form: string;
  lemma: string;
  parse: string;
  verse: number;
}

/** What a tap on Ask the tutor, on the Grammar sheet of `term`, asks for: the term and the verse of the word whose sheet it was opened from. */
export interface TermAsk {
  term: string;
  verse: number;
}

function Fact({ label, children, testId, lang }: { label: string; children: ReactNode; testId: string; lang?: string }) {
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-20 shrink-0 text-sm text-muted">{label}</dt>
      <dd data-testid={testId} lang={lang} className={`min-w-0 break-words ${lang ? 'font-greek text-xl' : 'text-base'}`}>
        {children}
      </dd>
    </div>
  );
}

/** The Parsing in plain words with each grammar word a link (a 44 px tap target): underlined, or plain once he knows it. */
function ParseTerms({ parse, known, open }: { parse: string; known: ReadonlySet<string>; open: (term: string) => void }) {
  return (
    <>
      {parseSegments(parse).map((segment, i) => {
        const term = segment.term;
        if (term === undefined) return segment.text;
        const isKnown = known.has(term);
        return (
          <button
            key={i}
            type="button"
            data-term={term}
            data-known={isKnown}
            onClick={() => open(term)}
            className={`inline-flex min-h-11 items-center px-0.5 align-middle text-left ${isKnown ? '' : 'text-accent underline underline-offset-4'}`}
          >
            {term}
          </button>
        );
      })}
    </>
  );
}

/** The links of every study resource he switched on (Settings > Study resources) for this word. */
function studyLinks(chosen: StudyResources | undefined, word: GreekWord, ref: StudyRef | undefined): StudyLink[] {
  if (!chosen) return [];
  const study = { form: word.t, lemma: wordLemma(word), strongs: word.s, ref };
  return RESOURCES.filter((r) => chosen.on.includes(r.id)).flatMap((r) => r.linksFor(study, optionOf(r, chosen.options[r.id])));
}

/** The Study row: one link per switched-on resource, each a 44 px tap target; nothing at all when none is on. */
function StudyRow({ links }: { links: StudyLink[] }) {
  if (links.length === 0) return null;
  return (
    <div role="group" aria-label="Study" className="mt-3">
      <p className="mb-1 text-sm text-muted">Study</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            data-fallback={link.fallback}
            onClick={() => armFallback(link.fallback)}
            {...(link.url.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="inline-flex min-h-12 items-center rounded-xl border border-line px-4 text-base font-medium text-accent active:bg-line"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

const HELP_BUTTON = 'min-h-12 flex-1 rounded-xl border border-line px-3 text-base font-medium text-accent active:bg-line';

/** Help with this word: Grammar and Sound it out, the two ways a word he struggled with can be helped. */
function HelpRow({ help }: { help: (kind: WordHelp['kind']) => void }) {
  return (
    <div role="group" aria-label="Help with this word" className="mt-3">
      <p className="mb-1 text-sm text-muted">Help with this word</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => help('grammar')} className={HELP_BUTTON}>
          Grammar
        </button>
        <button type="button" onClick={() => help('sound')} className={HELP_BUTTON}>
          Sound it out
        </button>
      </div>
    </div>
  );
}

function WordCard({ chapter, word, english, pronunciation, known, study, onHelp, onTerm }: {
  chapter: Chapter;
  word: GreekWord;
  english?: string;
  pronunciation: GreekPronunciation | undefined;
  known: ReadonlySet<string>;
  study: StudyResources | undefined;
  onHelp?: (help: WordHelp) => void;
  /** a grammar word of the Parsing was tapped: the term, and the verse the word stands in */
  onTerm: (term: string, word: GreekWord, verse: number | undefined) => void;
}) {
  const verse = chapter.verses.find((v) => v.g.includes(word))?.n;
  // The Strong's resource shows the number as its link in the Study row; the plain fact would say it twice.
  const strongsOn = study?.on.includes('strongs') ?? false;
  const ref = verse === undefined ? undefined : { book: chapter.code, chapter: chapter.chapter, verse };
  return (
    <section className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <p data-testid="sheet-word" lang="grc" className="min-w-0 break-words font-greek text-4xl font-bold">
          {word.t}
        </p>
        <SpeakButton text={word.t} id={`word:${word.t}`} label="Hear it" kind="speaker" className="shrink-0" />
      </div>
      <p data-testid="sheet-respelling" className="text-xl text-muted">
        {pronunciationOf(pronunciation).respell(word.t)}
      </p>
      <dl className="mt-2">
        <Fact label="Lemma" testId="sheet-lemma" lang="grc">
          {wordLemma(word)}
        </Fact>
        <Fact label="Parsing" testId="sheet-parse">
          <ParseTerms parse={wordParse(chapter, word)} known={known} open={(term) => onTerm(term, word, verse)} />
        </Fact>
        <Fact label="Meaning" testId="sheet-gloss">
          {wordGloss(chapter, word)}
        </Fact>
        {strongsOn ? null : (
          <Fact label="Strong's" testId="sheet-strongs">
            {word.s}
          </Fact>
        )}
        {english ? (
          <Fact label="English" testId="sheet-english">
            {english}
          </Fact>
        ) : null}
      </dl>
      <StudyRow links={studyLinks(study, word, ref)} />
      {onHelp && verse !== undefined ? (
        <HelpRow help={(kind) => onHelp({ kind, form: word.t, lemma: wordLemma(word), parse: wordParse(chapter, word), verse })} />
      ) : null}
    </section>
  );
}

/** `onHelp`, when given, adds the Help with this word row to each word; the sheet closes itself before it is called. `onAskTerm`,
 * when given, adds Ask the tutor to a Grammar sheet; the sheet closes itself (and the Grammar sheet with it) before it is called. */
export function WordSheet({ chapter, lookup: opened, onClose, onHelp, onAskTerm }: {
  chapter: Chapter;
  lookup: Lookup;
  onClose: () => void;
  onHelp?: (help: WordHelp) => void;
  onAskTerm?: (ask: TermAsk) => void;
}) {
  const { drag, handle } = useSheetDrag(onClose);
  // The Grammar sheet takes the Escape while it is open.
  const [grammar, setGrammar] = useState<{ term: string; word: GreekWord; verse: number | undefined } | null>(null);
  // An example on a Grammar sheet shows its own word here, until the sheet is opened on something else.
  const [shown, setShown] = useState<{ base: Lookup; lookup: Lookup } | null>(null);
  const lookup = shown && shown.base === opened ? shown.lookup : opened;
  useEscapeToClose(onClose, grammar === null);
  useSheetBack(onClose);
  const pronunciation = useLatest('pronunciation-changed')?.pronunciation;
  const known = useKnownTerms();
  const study = useLiveQuery(getStudyResources, []);
  const help = onHelp
    ? (asked: WordHelp): void => {
        onClose();
        onHelp(asked);
      }
    : undefined;
  const openTerm = (term: string, word: GreekWord, verse: number | undefined): void => {
    setGrammar({ term, word, verse });
    publish({ kind: 'grammar-term-opened', term });
  };
  const askVerse = grammar?.verse;
  const ask =
    onAskTerm && askVerse !== undefined
      ? (term: string): void => {
          setGrammar(null);
          onClose();
          onAskTerm({ term, verse: askVerse });
        }
      : undefined;

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Word"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative rounded-t-2xl border-t border-line bg-surface"
      >
        <div
          data-testid="sheet-handle"
          {...handle}
          className="flex min-h-12 touch-none items-center justify-between gap-3 px-4 pt-2"
        >
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button
            type="button"
            ref={focusOnMount}
            onClick={onClose}
            className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent"
          >
            Done
          </button>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+var(--lp-end-inset))] pt-3">
          {lookup.fromEnglish && lookup.english ? (
            <p className="mb-3 pr-14 text-lg text-muted">
              <span className="sr-only">English: </span>“{lookup.english}”
            </p>
          ) : null}
          {lookup.words.map((w, i) => (
            <WordCard
              key={i}
              chapter={chapter}
              word={w}
              english={lookup.fromEnglish ? undefined : lookup.english}
              pronunciation={pronunciation}
              known={known}
              study={study}
              onHelp={help}
              onTerm={openTerm}
            />
          ))}
        </div>
      </div>
      {grammar ? (
        <GrammarSheet
          chapter={chapter}
          term={grammar.term}
          word={grammar.word}
          known={known.has(grammar.term)}
          onClose={() => setGrammar(null)}
          onTerm={(term) => openTerm(term, grammar.word, grammar.verse)}
          onWord={(word) => {
            setShown({ base: opened, lookup: { words: [word], fromEnglish: false } });
            setGrammar(null);
          }}
          onAsk={ask}
        />
      ) : null}
    </div>
  );
}
