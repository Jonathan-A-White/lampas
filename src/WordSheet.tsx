// src/WordSheet.tsx — the bottom sheet a tapped word opens: the Greek word as it stands, how to say it (a respelling
// in the pronunciation chosen in Settings), lemma, parsing in plain words, gloss and Strong's. Closes by a tap
// outside, a swipe down on its handle, the Done button, Escape or the phone's Back (src/ui/sheetBack.ts). Each word has a Help with this word row (Grammar, Sound it out)
// when the screen gives it somewhere to send them: the Talk sheet on the word's verse with the first question sent. Every grammar
// word of the Parsing is a link to its Grammar sheet (src/GrammarSheet.tsx), which opens over this one: underlined until he marks
// the term I know this, plain after. A Study link whose app did not open (src/resources/openApp.ts) opens the sheet that says the app is not on this phone: Get it, or Turn off its resource. A Study row holds the links of the study resources he switched on in Settings (src/resources/),
// and is not drawn when none is on.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { type Chapter, type GreekWord, wordGloss, wordLemma, wordParse } from './data/chapter';
import { parseSegments } from './data/parseCode';
import { getStudyResources, setResourceOn, type StudyResources } from './data/repositories';
import { publish, useLatest } from './events/bus';
import { GrammarSheet } from './GrammarSheet';
import { IdeaSheet } from './IdeaSheet';
import { ideaOf, ideaOfTerm, type GrammarIdea } from './data/grammar/ladder';
import { optionOf, RESOURCES, type StudyLink, type StudyRef, type StudyResource } from './resources';
import { storeUrl } from './resources/appStore';
import { armFallback } from './resources/openApp';
import { pronunciationOf, type GreekPronunciation } from './speech/pronunciation';
import { SpeakButton } from './speech/SpeakButton';
import { focusOnMount } from './ui/focus';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import { wordUrl } from './nav/links';
import { LinkActions } from './ui/LinkActions';
import { useKnownTerms } from './useKnownTerms';
import { HintCard } from './tips/HintCard';
import { WORD_SHEET_OPENED } from './tips/hints';

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
  /** Grammar and Sound it out are the Help row's; 'word' is the sheet's Ask the tutor (the word, its lemma and its parsing, no particular help asked) */
  kind: 'grammar' | 'sound' | 'word';
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

/** One switched-on study resource and its links for a word. */
interface StudyGroup {
  resource: StudyResource;
  links: StudyLink[];
}

/** The links of every study resource he switched on (Settings > Study resources) for this word, a group per resource. */
function studyGroups(chosen: StudyResources | undefined, word: GreekWord, ref: StudyRef | undefined): StudyGroup[] {
  if (!chosen) return [];
  const study = { form: word.t, lemma: wordLemma(word), strongs: word.s, ref };
  return RESOURCES.filter((r) => chosen.on.includes(r.id))
    .map((resource) => ({ resource, links: resource.linksFor(study, optionOf(resource, chosen.options[resource.id])) }))
    .filter((g) => g.links.length > 0);
}

const TILE_BASE = 'flex min-h-12 min-w-0 items-center justify-center rounded-xl px-2 text-base font-medium';
const TILE = `${TILE_BASE} border border-line text-accent active:bg-line`;

/** The Study row: the links of each switched-on resource as equal tiles, two to a row, an app's under its name; nothing at all when none is on.
 *  A tap on an app's link also arms the wait for the app to open (openApp.ts); `onMissing` hears of an app that did not. */
function StudyRow({ groups, onMissing }: { groups: StudyGroup[]; onMissing: (resource: StudyResource) => void }) {
  if (groups.length === 0) return null;
  return (
    <div role="group" aria-label="Study" className="mt-3">
      <p className="mb-1 text-sm text-muted">Study</p>
      {groups.map(({ resource, links }) => (
        <div key={resource.id} role={resource.kind === 'app' ? 'group' : undefined} aria-label={resource.kind === 'app' ? resource.name : undefined} className="mb-2 last:mb-0">
          {resource.kind === 'app' ? <p className="mb-1 text-sm font-medium">{resource.name}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                aria-label={link.tile && link.tile !== link.label ? link.label : undefined}
                data-fallback={link.fallback}
                onClick={resource.kind === 'app' ? () => armFallback(link.fallback, undefined, () => onMissing(resource)) : undefined}
                {...(link.url.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}
                className={TILE}
              >
                <span className="truncate">{link.tile ?? link.label}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Over the word sheet when a Study link's app did not open: Get it from the phone's store, or Turn off its resource in Settings. */
function AppMissingSheet({ app, onClose, onTurnOff }: { app: string; onClose: () => void; onTurnOff: () => void }) {
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="app-missing-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label="App not on this phone" className="relative rounded-t-2xl border-t border-line bg-surface">
        <div className="flex min-h-12 items-center justify-end px-2 pt-2">
          <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="px-4 pb-[calc(1rem+var(--lp-end-inset))]">
          <h2 className="text-xl font-bold">{`${app} isn't on this phone`}</h2>
          <div className="mt-4 flex flex-col gap-2">
            <a href={storeUrl(app)} target="_blank" rel="noreferrer" className={`${TILE_BASE} bg-accent text-accent-fg`}>
              Get {app}
            </a>
            <button type="button" onClick={onTurnOff} className={TILE}>
              Turn off {app}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const HELP_BUTTON = 'min-h-12 flex-1 rounded-xl border border-line px-3 text-base font-medium text-accent active:bg-line';

/** Help with this word: Grammar and Sound it out, the two ways a word he struggled with can be helped; and, under them, Ask the tutor
 * about the word with what the app knows of it already handed over. */
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
      <button type="button" onClick={() => help('word')} className={`${HELP_BUTTON} mt-2 w-full`}>
        Ask the tutor
      </button>
    </div>
  );
}

function WordCard({ chapter, word, english, pronunciation, known, study, onHelp, onTerm, onMissing }: {
  chapter: Chapter;
  word: GreekWord;
  english?: string;
  pronunciation: GreekPronunciation | undefined;
  known: ReadonlySet<string>;
  study: StudyResources | undefined;
  onHelp?: (help: WordHelp) => void;
  /** a grammar word of the Parsing was tapped: the term, and the verse the word stands in */
  onTerm: (term: string, word: GreekWord, verse: number | undefined) => void;
  /** a Study link's app did not open */
  onMissing: (resource: StudyResource) => void;
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
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <p data-testid="sheet-respelling" className="min-w-0 break-words text-xl text-muted">
          {pronunciationOf(pronunciation).respell(word.t)}
        </p>
        <LinkActions url={wordUrl(word.s)} title={wordLemma(word)} className="-mr-3" />
      </div>
      <dl className="mt-2">
        <Fact label="Lemma" testId="sheet-lemma" lang="grc">
          {wordLemma(word)}
        </Fact>
        {wordParse(chapter, word) ? (
          <Fact label="Parsing" testId="sheet-parse">
            <ParseTerms parse={wordParse(chapter, word)} known={known} open={(term) => onTerm(term, word, verse)} />
          </Fact>
        ) : null}
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
      <StudyRow groups={studyGroups(study, word, ref)} onMissing={onMissing} />
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
  // An example on a Grammar sheet or an idea sheet shows its own word here, until the sheet is opened on something else; an idea's
  // example may stand in another chapter than the Reader's (the goal's), which is then the chapter the sheet reads it from.
  const [shown, setShown] = useState<{ base: Lookup; lookup: Lookup; chapter?: Chapter } | null>(null);
  const lookup = shown && shown.base === opened ? shown.lookup : opened;
  const elsewhere = shown && shown.base === opened ? shown.chapter : undefined;
  const sheetChapter = elsewhere ?? chapter;
  // The idea sheet over the Grammar sheet (Learn this idea).
  const [idea, setIdea] = useState<GrammarIdea | null>(null);
  // The sheet that says an app is not on the phone, over this one, after a Study link's app did not open.
  const [missing, setMissing] = useState<StudyResource | null>(null);
  useEscapeToClose(onClose, grammar === null && missing === null);
  useSheetBack(onClose);
  const pronunciation = useLatest('pronunciation-changed')?.pronunciation;
  const known = useKnownTerms();
  const study = useLiveQuery(getStudyResources, []);
  // A word of another chapter has no verse in the Reader's chapter to help with or ask about.
  const help = onHelp && !elsewhere
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
    onAskTerm && askVerse !== undefined && !elsewhere
      ? (term: string): void => {
          setIdea(null);
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
        {/* the tip stays above the scrolling facts, so it is seen without a scroll; the facts' box is 2 dvh shorter to make room, so the sheet stays below 30% of the screen */}
        <HintCard event={WORD_SHEET_OPENED} className="mx-4 mt-1" />
        <div className="max-h-[58dvh] overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+var(--lp-end-inset))] pt-3">
          {lookup.fromEnglish && lookup.english ? (
            <p className="mb-3 pr-14 text-lg text-muted">
              <span className="sr-only">English: </span>“{lookup.english}”
            </p>
          ) : null}
          {lookup.words.map((w, i) => (
            <WordCard
              key={i}
              chapter={sheetChapter}
              word={w}
              english={lookup.fromEnglish ? undefined : lookup.english}
              pronunciation={pronunciation}
              known={known}
              study={study}
              onHelp={help}
              onTerm={openTerm}
              onMissing={setMissing}
            />
          ))}
        </div>
      </div>
      {grammar ? (
        <GrammarSheet
          chapter={sheetChapter}
          term={grammar.term}
          word={grammar.word}
          known={known.has(grammar.term)}
          covered={idea !== null}
          onClose={() => setGrammar(null)}
          onTerm={(term) => openTerm(term, grammar.word, grammar.verse)}
          onWord={(word) => {
            setShown({ base: opened, lookup: { words: [word], fromEnglish: false }, chapter: elsewhere });
            setGrammar(null);
          }}
          onAsk={ask}
          onLearn={(term) => {
            const id = ideaOfTerm(term);
            if (id) setIdea(ideaOf(id));
          }}
        />
      ) : null}
      {idea ? (
        <IdeaSheet
          idea={idea}
          onClose={() => setIdea(null)}
          onWord={(from, word) => {
            setShown({ base: opened, lookup: { words: [word], fromEnglish: false }, chapter: from === chapter ? undefined : from });
            setIdea(null);
            setGrammar(null);
          }}
          onAsk={ask}
        />
      ) : null}
      {missing ? (
        <AppMissingSheet
          app={missing.name}
          onClose={() => setMissing(null)}
          onTurnOff={() => {
            void setResourceOn(missing.id, false);
            setMissing(null);
          }}
        />
      ) : null}
    </div>
  );
}
