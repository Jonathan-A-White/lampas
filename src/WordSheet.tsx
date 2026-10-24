// src/WordSheet.tsx — the bottom sheet a tapped word opens: the Greek word as it stands, how to say it (a respelling
// in the pronunciation chosen in Settings), lemma, parsing in plain words, gloss and Strong's. Closes by a tap
// outside, a swipe down on its handle, the Done button, Escape or the phone's Back (src/ui/sheetBack.ts). Each word has a Help with this word row (Grammar, Sound it out)
// when the screen gives it somewhere to send them: the Talk sheet on the word's verse with the first question sent. Every grammar
// word of the Parsing is a link to its Grammar sheet (src/GrammarSheet.tsx), which opens over this one: underlined until he marks
// the term I know this, plain after. With many lexicons On the Logos group draws the pinned ones, Bible Word Study and a door, All N lexicons, to a sheet that lists every one with a search (src/library/AllLexiconsSheet.tsx). A Study link whose app did not open (src/resources/openApp.ts) opens the sheet that says the app is not on this phone: Get it, or Turn off its resource. A Study row holds the links of the study resources he switched on in Settings (src/resources/),
// and is not drawn when none is on.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { bareEnglish, type Chapter, type GreekWord, wordGloss, wordLemma, wordParse } from './data/chapter';
import { parseSegments } from './data/parseCode';
import { getStudyResources, setResourceOn, type StudyResources } from './data/repositories';
import { publish, useLatest } from './events/bus';
import { useAiAllowed } from './gate/licenceContext';
import { EnglishDictionaryRow, EnglishWordSheet } from './EnglishWordSheet';
import { GrammarSheet } from './GrammarSheet';
import { IdeaSheet } from './IdeaSheet';
import { ideaOf, ideaOfTerm, ownIdeaOfWord, type GrammarIdea } from './data/grammar/ladder';
import { paradigmOfWord } from './data/paradigms';
import { openLibrary, openParadigm } from './nav/route';
import { holdWord } from './wordReturn';
import { oneTap } from './ui/settle';
import { resourcesForLevel } from './resources/resourcesForLevel';
import { optionOf, RESOURCES, type StudyLink, type StudyRef, type StudyResource } from './resources';
import { storeUrl } from './resources/appStore';
import { logos, logosStudy, type LogosStudy } from './resources/logos';
import { armFallback } from './resources/openApp';
import { topicOf } from './resources/topic';
import { pronunciationOf, type GreekPronunciation } from './speech/pronunciation';
import { SpeakButton } from './speech/SpeakButton';
import { focusOnMount } from './ui/focus';
import { pushSheetStep, sheetsAbove, useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import { wordUrl } from './nav/links';
import { LinkActions } from './ui/LinkActions';
import { AllLexiconsSheet } from './library/AllLexiconsSheet';
import { GREEK_VIEW_FROM, type GreekLevel } from './settings/definitions/greekInterest';
import { useGreekInterest } from './settings/useGreekInterest';
import { useKnownTerms } from './useKnownTerms';
import { BarSlot } from './speech/SpeakingBarSlot';
import { HintCard } from './tips/HintCard';
import { WORD_SHEET_OPENED } from './tips/hints';
import { GREEK_LANG, greekLang } from './script/greekLang';
import { HeartOfWord } from './HeartOfWord';

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

function Fact({ label, children, testId, greek }: { label: string; children: ReactNode; testId: string; greek?: boolean }) {
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-20 shrink-0 text-sm text-muted">{label}</dt>
      <dd data-testid={testId} {...greekLang(greek === true)} className={`min-w-0 break-words ${greek ? 'font-greek text-xl' : 'text-base'}`}>
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
  /** Logos only, when more lexicons are On than the row draws: the door to the sheet that lists them all (mw-rfjjzd.8) */
  door?: LogosStudy['door'];
}

/** The links of every study resource he switched on (Settings > Study resources) that the Greek dial shows, for this word, a group per resource, English resources first (resourcesForLevel). */
function studyGroups(chosen: StudyResources | undefined, level: GreekLevel | undefined, word: GreekWord, ref: StudyRef | undefined, gloss: string): StudyGroup[] {
  if (!chosen || level === undefined) return [];
  const study = { form: word.t, lemma: wordLemma(word), strongs: word.s, topic: topicOf(gloss), ref };
  return resourcesForLevel(RESOURCES, level)
    .filter((r) => chosen.on.includes(r.id))
    .map((resource): StudyGroup => {
      const option = optionOf(resource, chosen.options[resource.id]);
      // Logos draws the lexicons he pinned, Bible Word Study and a door to the rest once more than a few are On
      if (resource.id === 'logos') return { resource, ...logosStudy(study, option.split(','), chosen.pinnedLexicons ?? []) };
      return { resource, links: resource.linksFor(study, option) };
    })
    .filter((g) => g.links.length > 0);
}

/** The Study groups of a word as the sheet draws them: the verse it stands in is the chapter's, which a link may name. */
function studyGroupsOf(chapter: Chapter, word: GreekWord, study: StudyResources | undefined, level: GreekLevel | undefined): StudyGroup[] {
  const verse = chapter.verses.find((v) => v.g.includes(word))?.n;
  const ref = verse === undefined ? undefined : { book: chapter.code, chapter: chapter.chapter, verse };
  return studyGroups(study, level, word, ref, wordGloss(chapter, word));
}

/** More tiles than this and the sheet is a long one: a Close button sits under its scroll box and a fade says there is more below. 5 since the list lost its third app (mw-5r3p30.738): Strong's, three pinned lexicons, Bible Word Study and the door (6) is still a long sheet. */
const MANY_TILES = 5;

/** The facts' box's height and foot: the heading above it (a line and its padding) takes its room out of the box, so the sheet stays as tall as before. A short sheet
 * whose word has a Paradigm row (a row of its own, 44 px and its padding) gets that much more room, so Help with this word and Ask the tutor stay where they were
 * (mw-irpgqi.1; tests/e2e/word-tip.spec.ts holds Ask the tutor in reach, so the row's 52 px are added and not taken from what was there); a long sheet (many tiles) scrolls and keeps its height. */
function scrollHeight(many: boolean, heading: unknown, paradigm: boolean): string {
  // whole class names, as tailwind finds them in the source
  if (many) return heading ? 'max-h-[calc(50dvh-2.75rem)] pb-4' : 'max-h-[50dvh] pb-4';
  const foot = 'pb-[calc(1rem+var(--lp-end-inset))]';
  if (paradigm) return heading ? `max-h-[calc(58dvh-2.75rem+3.25rem)] ${foot}` : `max-h-[calc(58dvh+3.25rem)] ${foot}`;
  return heading ? `max-h-[calc(58dvh-2.75rem)] ${foot}` : `max-h-[58dvh] ${foot}`;
}

/** true while the box has more to show below what is in view (a few pixels of slack for rounding). */
function useMoreBelow(box: { current: HTMLElement | null }, remeasure: unknown): boolean {
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = (): void => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    resize?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      resize?.disconnect();
    };
  }, [box, remeasure]);
  return more;
}

/** A title longer than this is set a size smaller, so it fits two lines in half a row at 360 px. */
const LONG_TILE = 18;

const TILE_BASE = 'flex min-h-12 min-w-0 items-center justify-center rounded-xl px-2 text-base font-medium';
const TILE = `${TILE_BASE} border border-line py-1 text-center leading-tight text-accent active:bg-line`;

/** The Study row: the links of each switched-on resource as equal tiles, two to a row, an app's under its name; nothing at all when none is on.
 *  A tile's words wrap to a second line rather than being cut. A tap on an app's link also arms the wait for the app to open (openApp.ts); `onMissing` hears of an app that did not. */
function StudyRow({ groups, onMissing, onAll }: { groups: StudyGroup[]; onMissing: (resource: StudyResource) => void; onAll: (door: NonNullable<StudyGroup['door']>) => void }) {
  if (groups.length === 0) return null;
  return (
    <div role="group" aria-label="Study" className="mt-3">
      <p className="mb-1 text-sm text-muted">Study</p>
      {groups.map(({ resource, links, door }) => (
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
                <span className={`min-w-0 break-words ${(link.tile ?? link.label).length > LONG_TILE ? 'text-sm' : ''}`}>{link.tile ?? link.label}</span>
              </a>
            ))}
            {door ? (
              <button type="button" onClick={() => onAll(door)} className={TILE}>
                <span className="min-w-0 break-words">{`All ${door.count} lexicons ›`}</span>
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Over the word sheet when a Study link's app did not open: Get it from the phone's store, or Turn off its resource in Settings. */
export function AppMissingSheet({ app, onClose, onTurnOff }: { app: string; onClose: () => void; onTurnOff: () => void }) {
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

function WordCard({ chapter, word, english, pronunciation, known, study, level, onHelp, onTerm, onParadigm, onMissing, onAll }: {
  chapter: Chapter;
  word: GreekWord;
  english?: string;
  pronunciation: GreekPronunciation | undefined;
  known: ReadonlySet<string>;
  study: StudyResources | undefined;
  /** the Greek dial's step, which decides the Study links drawn and their order (undefined while it is read) */
  level: GreekLevel | undefined;
  onHelp?: (help: WordHelp) => void;
  /** a grammar word of the Parsing was tapped: the term, and the verse the word stands in */
  onTerm: (term: string, word: GreekWord, verse: number | undefined) => void;
  /** the Paradigm row was tapped: the word, to open its table */
  onParadigm: (word: GreekWord) => void;
  /** a Study link's app did not open */
  onMissing: (resource: StudyResource) => void;
  /** the door to every lexicon was tapped: the word, and the lexicons On with their links for it */
  onAll: (word: GreekWord, door: NonNullable<StudyGroup['door']>) => void;
}) {
  const verse = chapter.verses.find((v) => v.g.includes(word))?.n;
  // The Strong's resource shows the number as its link in the Study row; the plain fact would say it twice.
  const strongsOn = study?.on.includes('strongs') ?? false;
  // the table that holds the word's form (a conjunction or a particle has none): the row names it and a tap opens it with the word's own cell lit
  const table = paradigmOfWord(word)?.table;
  return (
    <section className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <h2 data-testid="sheet-word" {...GREEK_LANG} className="min-w-0 break-words font-greek text-4xl font-bold">
          {word.t}
        </h2>
        <SpeakButton text={word.t} id={`word:${word.t}`} label="Hear it" kind="speaker" className="shrink-0" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <p data-testid="sheet-respelling" className="min-w-0 break-words text-xl text-muted">
          {pronunciationOf(pronunciation).respell(word.t)}
        </p>
        <LinkActions url={wordUrl(word.s)} title={wordLemma(word)} className="-mr-3" />
      </div>
      <dl className="mt-2">
        <Fact label="Lemma" testId="sheet-lemma" greek>
          {wordLemma(word)}
        </Fact>
        {wordParse(chapter, word) ? (
          <Fact label="Parsing" testId="sheet-parse">
            <ParseTerms parse={wordParse(chapter, word)} known={known} open={(term) => onTerm(term, word, verse)} />
          </Fact>
        ) : null}
        {table ? (
          <Fact label="Paradigm" testId="sheet-paradigm">
            <button
              type="button"
              data-table={table.id}
              onClick={() => oneTap('word:paradigm', () => onParadigm(word))}
              {...greekLang(table.id === 'eimi' || table.id === 'oida')}
              className="inline-flex min-h-11 items-center px-0.5 text-left text-accent underline underline-offset-4"
            >
              {table.name}
            </button>
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
            {bareEnglish(english)}
          </Fact>
        ) : null}
      </dl>
      {/* the note kept for a word that earns one: the thread behind its senses, always here to go back to (mw-bsf54t.14) */}
      <HeartOfWord lemma={wordLemma(word)} className="mt-3" />
      <StudyRow groups={studyGroupsOf(chapter, word, study, level)} onMissing={onMissing} onAll={(door) => onAll(word, door)} />
      {onHelp && verse !== undefined ? (
        <HelpRow help={(kind) => onHelp({ kind, form: word.t, lemma: wordLemma(word), parse: wordParse(chapter, word), verse })} />
      ) : null}
    </section>
  );
}

/** `onHelp`, when given, adds the Help with this word row to each word; the sheet closes itself before it is called. `onAskTerm`,
 * when given, adds Ask the tutor to a Grammar sheet; the sheet closes itself (and the Grammar sheet with it) before it is called. */
interface WordSheetProps {
  chapter: Chapter;
  lookup: Lookup;
  onClose: () => void;
  onHelp?: (help: WordHelp) => void;
  onAskTerm?: (ask: TermAsk) => void;
}

/** The word's sheet is Greek (its word, lemma, parsing and Strong's number), so the Greek dial draws it from Curious up (mw-3ased2.2); at Just English an English word opens EnglishWordSheet. */
export function WordSheet(props: WordSheetProps) {
  const level = useGreekInterest();
  if (level === undefined || level >= GREEK_VIEW_FROM) return <WordSheetBody {...props} />;
  // at Just English an English word he taps opens the small English sheet instead (mw-5r3p30.707); a Greek word has no sheet
  const { lookup, onClose } = props;
  return lookup.fromEnglish && lookup.english ? <EnglishWordSheet english={lookup.english} onClose={onClose} /> : null;
}

function WordSheetBody({ chapter, lookup: opened, onClose, onHelp, onAskTerm }: WordSheetProps) {
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
  // The sheet that lists every lexicon On, over this one, after the door of the Logos group was tapped.
  const [allLexicons, setAllLexicons] = useState<{ word: GreekWord; door: NonNullable<StudyGroup['door']> } | null>(null);
  useEscapeToClose(onClose, grammar === null && missing === null && allLexicons === null);
  const levelNow = useSheetBack(onClose);
  // Every move he makes inside this sheet (a Related term, an example word) is one Back step (mw-5r3p30.239): Back puts the
  // Grammar sheet, the idea sheet and the word back as they were. `closing` moves close the sheets over this one; their entries
  // stay for that Back. A sheet opened over the idea sheet is not rebuilt by it, so a move made then is not a step.
  const move = (apply: () => void, closing = false): void => {
    const before = { shown, grammar, idea };
    const rebuildable = !closing || sheetsAbove(levelNow()) === (grammar ? 1 : 0) + (idea ? 1 : 0);
    if (rebuildable) {
      pushSheetStep(
        () => {
          setShown(before.shown);
          setGrammar(before.grammar);
          setIdea(before.idea);
        },
        levelNow(),
        closing,
      );
    }
    apply();
  };
  const pronunciation = useLatest('pronunciation-changed')?.pronunciation;
  const known = useKnownTerms();
  const study = useLiveQuery(getStudyResources, []);
  const level = useGreekInterest();
  const tiles = lookup.words.reduce((n, w) => n + studyGroupsOf(sheetChapter, w, study, level).reduce((m, g) => m + g.links.length + (g.door ? 1 : 0), 0), 0);
  const many = tiles > MANY_TILES;
  const heading = lookup.fromEnglish && lookup.english;
  const scroll = useRef<HTMLDivElement>(null);
  const moreBelow = useMoreBelow(scroll, `${tiles}:${lookup.words.length}`);
  // A word of another chapter has no verse in the Reader's chapter to help with or ask about.
  // Help with this word and Ask the tutor are the AI: left out without a licence (mw-8m9dyu.2).
  const ai = useAiAllowed();
  const help = ai && onHelp && !elsewhere
    ? (asked: WordHelp): void => {
        onClose();
        onHelp(asked);
      }
    : undefined;
  const openTerm = (term: string, word: GreekWord, verse: number | undefined): void => {
    setGrammar({ term, word, verse });
    publish({ kind: 'grammar-term-opened', term });
  };
  // the word's table is a page of its own: the sheet is held, with what it showed, and Back brings it back (src/wordReturn.ts)
  const openTable = (word: GreekWord): void => {
    const found = paradigmOfWord(word);
    if (!found) return;
    holdWord(sheetChapter, lookup);
    openParadigm({ table: found.table.id, cell: found.cell, word: word.t, parse: word.p, lemma: word.l });
  };
  const askVerse = grammar?.verse;
  const ask =
    ai && onAskTerm && askVerse !== undefined && !elsewhere
      ? (term: string): void => {
          setIdea(null);
          setGrammar(null);
          onClose();
          onAskTerm({ term, verse: askVerse });
        }
      : undefined;

  return (
    // z-35: above every sheet it opens over (idea z-30, grammar/teach/Hebrew/pictures z-20, the rest z-10), below the full-screen dialogs (z-40) and the shell bars (z-60)
    <div className="fixed inset-0 z-35 flex flex-col justify-end">
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
            onClick={onClose}
            className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent"
          >
            Done
          </button>
        </div>
        {/* the tip stays above the scrolling facts, so it is seen without a scroll; the facts' box is 2 dvh shorter to make room, so the sheet stays below 30% of the screen (a word with a Paradigm row has that row's 52 px more: scrollHeight) */}
        <HintCard event={WORD_SHEET_OPENED} className="mx-4 mt-1" />
        {/* a reading or answer paused by the word he tapped keeps its Resume in view (the sheet is over the screen's own bar) */}
        <BarSlot level={4} />
        {/* the English he tapped is a heading of its own under the tip, outside the scrolling facts: it never slides half under the tip's edge */}
        {heading ? (
          <h2 data-testid="sheet-heading" className="pl-4 pr-14 pt-3 text-lg font-normal text-muted">
            <span className="sr-only">English: </span>“{bareEnglish(heading)}”
          </h2>
        ) : null}
        <div className="relative">
          <div
            ref={scroll}
            data-testid="sheet-scroll"
            className={`overflow-y-auto overscroll-contain px-4 pt-3 ${scrollHeight(many, heading, lookup.words.some((w) => paradigmOfWord(w) !== undefined))}`}
          >
            {lookup.words.map((w, i) => (
              <WordCard
                key={i}
                chapter={sheetChapter}
                word={w}
                english={lookup.fromEnglish ? undefined : lookup.english}
                pronunciation={pronunciation}
                known={known}
                study={study}
                level={level}
                onHelp={help}
                onTerm={openTerm}
                onParadigm={openTable}
                onMissing={setMissing}
                onAll={(word, door) => setAllLexicons({ word, door })}
              />
            ))}
            {heading ? <EnglishDictionaryRow text={bareEnglish(heading)} english /> : null}
          </div>
          {many && moreBelow ? (
            <div
              data-testid="sheet-scroll-fade"
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-end justify-center bg-gradient-to-t from-surface via-surface/90 to-transparent pb-1 text-sm text-muted"
            >
              ▾ More below
            </div>
          ) : null}
        </div>
        {many ? (
          <div className="border-t border-line px-4 pb-[calc(0.5rem+var(--lp-end-inset))] pt-2">
            <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl border border-line text-base font-medium text-accent active:bg-line">
              Close
            </button>
          </div>
        ) : null}
      </div>
      {grammar ? (
        <GrammarSheet
          chapter={sheetChapter}
          term={grammar.term}
          word={grammar.word}
          known={known.has(grammar.term)}
          covered={idea !== null}
          onClose={() => setGrammar(null)}
          onDismiss={onClose}
          onTerm={(term) => move(() => openTerm(term, grammar.word, grammar.verse))}
          onWord={(word) =>
            move(() => {
              setShown({ base: opened, lookup: { words: [word], fromEnglish: false }, chapter: elsewhere });
              setGrammar(null);
            }, true)
          }
          onAsk={ask}
          onLearn={(term) => {
            // the term of the word's own part of speech teaches the word's own idea when it has one (περί: "The preposition περί")
            const id = ideaOfTerm(term);
            const own = ownIdeaOfWord(grammar.word);
            if (id) setIdea(ideaOf(own && id === 'preposition' ? own : id));
          }}
        />
      ) : null}
      {idea ? (
        <IdeaSheet
          idea={idea}
          onClose={() => setIdea(null)}
          onDismiss={onClose}
          onWord={(from, word) =>
            move(() => {
              setShown({ base: opened, lookup: { words: [word], fromEnglish: false }, chapter: from === chapter ? undefined : from });
              setIdea(null);
              setGrammar(null);
            }, true)
          }
          onAsk={ask}
        />
      ) : null}
      {allLexicons ? (
        <AllLexiconsSheet
          word={wordLemma(allLexicons.word)}
          entries={allLexicons.door.entries}
          onClose={() => setAllLexicons(null)}
          onMissing={() => setMissing(logos)}
          onManage={() => {
            // the Lexicons page is a page of its own: the sheet is held with what it showed, and Back brings it back (src/wordReturn.ts)
            holdWord(sheetChapter, lookup);
            openLibrary({ kind: 'lexicon' });
          }}
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
