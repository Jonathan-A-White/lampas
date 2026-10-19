// src/IdeaSheet.tsx — the sheet that teaches one grammar idea (mw-hqd5bz.7), opened by Learn this idea on a Grammar sheet. It teaches a total
// beginner from the card alone (mw-5r3p30.234, data in src/data/grammar/teach/): What it is, in plain English; How to spot it, in Greek, with a
// table where the idea is a set of endings or forms; How it sounds, for an idea of a sound, in the chosen pronunciation; a Worked example, one
// New Testament word taken apart step by step, from the verse he reads when it has one, with its respelling. Above all of it, under the title,
// up to three examples from the goal passage (or, with no goal, the open chapter) that the card can explain, each with its verse, its one sense
// here and its parsing in the card's own terms (an idea of spelling, such as the alphabet, a pair of vowels or a breathing, shows more words with
// the letters it is about marked), a speaker on each, and a tap opens the word: the first three are in view when the sheet opens, held upright or
// on its side, and the rest wait under 'Show N more' (mw-5r3p30.369); for an idea of the letters, sounds and marks (the alphabet, a pair of vowels,
// a breathing ...), the items as tiles above the text, each to hear (TeachTiles). On its side the foot is a column at the right. At the foot
// the level SLIDER (mw-i7xe0n.3: Not yet · Learning · I know it, resting on the idea's level; Learning is frontier and due tomorrow; I know it opens Drill it
// to prove it, and only a pass keeps it there), 'Mark known without a drill' (solid, the 30-day step), a Drill it button, 'Try it on a verse' (mw-emk3xt.4: the easiest verse of the
// passage at his level that has a form of the idea, three questions on it, then 'Read it'; src/TryItSheet.tsx; left out when no verse has one) and Ask the tutor; the level shows as a chip
// ('Proved by drill' once a run proved it). He learns one idea at a time (mw-i7xe0n.6): sliding to Learning while another idea is Learning asks 'You are learning <other>.
// Switch to <this>?' (Switch | Keep <other>). The sheet teaches only its own idea and takes the ideas under it to be solid: when one is not, it says so above the
// text with a button to go there, and sliding up first asks 'Go to <title> first?'. Learning on The Greek alphabet opens the letter drill at once (src/LetterDrillScreen.tsx).
// A letter or pair with a Hard sounds lesson for his accent (src/hardSounds/, mw-5r3p30.361) has 'Learn to say it (optional)' (or the label the lesson gives, 'Learn to roll your r (optional)' on Rho) under How it sounds; Back from it brings the sheet back.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { loadChapter, loadIndex, type Chapter, type GreekWord } from './data/chapter';
import { unmetNeed } from './data/grammar/drillIt';
import { loadFrequency } from './data/frequency';
import { exampleGloss, exampleNote, hasFormOf, ideaExamples, ideaExamplesFor, ideaPassage, isSentenceIdea, isSoundIdea, isSpellingIdea, passageForms, type ExampleRanking, type IdeaExample, type IdeaExamples, type IdeaPassage, type PairCase } from './data/grammar/ideaSheet';
import { ideaOf, type GrammarIdea } from './data/grammar/ladder';
import { soundLesson } from './data/grammar/lessons';
import { stepsOf, teachOf, workedFor, type Teach, type TeachTable } from './data/grammar/teach';
import { teachTiles } from './data/grammar/teachTiles';
import { paradigmsOf } from './data/paradigms';
import { getOpenChapter } from './data/readerChapter';
import { getGrammarBooks, getGreekPronunciation, getLevel, getSavedGoalText, getStudyResources, listLevels, recordDrill, teachIdea, type DrillMode, type FrontierChoice, type GrammarLevelName, type IdeaOutcome } from './data/repositories';
import { DrillItScreen } from './DrillItScreen';
import { holdIdea } from './ideaReturn';
import { LessonWriteIt } from './handwriting/LessonWriteIt';
import { LetterDrillScreen } from './LetterDrillScreen';
import { learnLabel, lessonsForLetter } from './hardSounds/lessons';
import { openParadigm, openSoundLesson } from './nav/route';
import { GRAMMAR_BOOKS, readMoreFor } from './resources/grammarBooks';
import { armFallback } from './resources/openApp';
import type { GrammarBook } from './resources/types';
import { useAccent } from './speech/accents/useAccent';
import { chosenPronunciation } from './speech/greek';
import { pronunciationOf, type Pronunciation } from './speech/pronunciation';
import { proseOf } from './speech/proseOf';
import { LessonReadAloud } from './speech/ReadAloud';
import { SpeakButton } from './speech/SpeakButton';
import { BarSlot } from './speech/SpeakingBarSlot';
import { TeachTiles } from './TeachTiles';
import { TryItSheet } from './TryItSheet';
import { focusOnMount } from './ui/focus';
import { greekMarked } from './ui/GreekMarked';
import { useSettleAround } from './ui/settle';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import { GREEK_LANG } from './script/greekLang';

// Each button is as wide as its label and shares the rest, so neither wraps at 390 px.
const BUTTON = 'min-h-12 flex-auto whitespace-nowrap rounded-xl border px-2 text-base font-medium';
const LEVEL_NAMES: Record<GrammarLevelName, string> = { solid: 'Solid', frontier: 'Frontier', notYet: 'Not yet' };
/** The slider's three stops, left to right: the level each is and what it is called (PROVISIONAL names). */
const STOPS: { level: GrammarLevelName; label: string }[] = [
  { level: 'notYet', label: 'Not yet' },
  { level: 'frontier', label: 'Learning' },
  { level: 'solid', label: 'I know it' },
];
const OUTCOME_OF_STOP: (IdeaOutcome | null)[] = ['not-yet', 'got-it', null];
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 'today', a weekday for the last six days, else '3 Oct'. */
function sinceText(since: number, now = Date.now()): string {
  const [then, today] = [new Date(since), new Date(now)];
  const days = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())) / DAY_MS);
  if (days <= 0) return 'today';
  return days < 7 ? WEEKDAYS[then.getDay()] : `${then.getDate()} ${MONTHS[then.getMonth()]}`;
}

/**
 * What ranks the examples of a letter or a sound (mw-5r3p30.351): the letters he has met or is learning, and how often each word is used. Read once, when both
 * are in, so the examples do not reorder under his thumb when he moves the slider; undefined until then. A table that cannot be read ranks without it.
 */
function useRanking(): ExampleRanking | undefined {
  const [ranking, setRanking] = useState<ExampleRanking>();
  useEffect(() => {
    let alive = true;
    void Promise.all([listLevels().catch(() => new Map()), loadFrequency().catch(() => [])]).then(([levels, entries]) => {
      if (!alive) return;
      setRanking({
        known: new Set([...levels].filter(([, row]) => row.level !== 'notYet').map(([id]) => id)),
        frequency: new Map(entries.map((e) => [e.lemma.normalize('NFC'), e.count])),
      });
    });
    return () => {
      alive = false;
    };
  }, []);
  return ranking;
}

/**
 * Where the examples of an idea come from beyond the goal's own words (ideaExamplesFor); undefined while it looks, and when there is no passage to widen. A
 * letter or a sound always looks (its examples are ranked, mw-5r3p30.351) and waits for its ranking; the others only when the goal has none.
 */
function useWiderExamples(id: string, passage: IdeaPassage | undefined, scheme: Pronunciation, ranking: ExampleRanking | undefined): IdeaExamples | undefined {
  const [found, setFound] = useState<{ key: string; value: IdeaExamples }>();
  const key = passage && (ranking || !isSoundIdea(id)) ? `${id}|${passage.title}|${scheme.id}` : '';
  useEffect(() => {
    if (!passage || !key) return;
    let alive = true;
    ideaExamplesFor(id, passage, loadChapter, ranking, scheme).then(
      (value) => alive && setFound({ key, value }),
      // offline: the goal's own line, as before
      () => alive && setFound({ key, value: { title: passage.title, examples: [] } }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return found?.key === key ? found.value : undefined;
}

type Loaded = { passage: IdeaPassage } | 'failed' | null;

/** The passage the examples come from: the saved goal's, else the open chapter. */
function usePassage(): Loaded {
  const [loaded, setLoaded] = useState<Loaded>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const text = await getSavedGoalText();
        const index = text ? await loadIndex().catch(() => undefined) : undefined;
        const passage = await ideaPassage(text, getOpenChapter(), loadChapter, index);
        if (alive) setLoaded({ passage });
      } catch {
        if (alive) setLoaded('failed');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return loaded;
}

/** Greek inside a table: the Greek face at the size of the cell, so four columns fit a phone held upright. */
const inTable = (text: string) => greekMarked(text, 'font-greek');

/** An idea's title in a line of the sheet (the heading, a button, a question): its Greek, as in 'The preposition περί', at the reading size, as the examples under it (mw-86e9r1.38). */
const titled = (title: string) => greekMarked(title);

function TableView({ table }: { table: TeachTable }) {
  return (
    <div data-testid="idea-table" className="mt-3">
      <table className="w-full table-fixed border-collapse text-center">
        <caption className="pb-1 text-left text-sm text-muted">{inTable(table.caption)}</caption>
        <colgroup>
          <col className="w-[24%]" />
        </colgroup>
        <thead>
          <tr>
            <td />
            {table.columns.map((column) => (
              <th key={column} scope="col" className="break-words px-1 pb-1 align-bottom text-base font-normal text-muted">
                {inTable(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.label} className="border-t border-line">
              <th scope="row" className="break-words py-2 pr-1 text-left text-sm font-normal text-muted">
                {inTable(row.label)}
              </th>
              {row.cells.map((cell, i) => (
                <td key={table.columns[i]} data-cell={table.columns[i]} className="break-words px-1 py-2 text-lg">
                  {cell ? inTable(cell) : <span aria-label="none" className="text-muted">–</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.note ? <p className="pt-1 text-sm text-muted">{greekMarked(table.note)}</p> : null}
    </div>
  );
}

/** A heading of the card's teaching: What it is, How to spot it, How it sounds, Worked example. */
const Part = ({ children }: { children: string }) => <h3 className="mt-4 text-lg font-semibold">{children}</h3>;

function Worked({ teach, passage, scheme }: { teach: Teach; passage: IdeaPassage | undefined; scheme: Pronunciation }) {
  const { worked, inPassage } = workedFor(teach, passage ? passageForms(passage) : new Set());
  const said = worked.say ?? worked.word;
  return (
    <section data-testid="idea-worked">
      <Part>Worked example</Part>
      <div className="mt-1 flex items-center gap-2">
        <span data-testid="worked-word" {...GREEK_LANG} className="font-greek text-3xl">
          {worked.word}
        </span>
        <SpeakButton text={said} id={`worked:${said}`} label={`Hear ${worked.word}`} kind="speaker" className="shrink-0" />
      </div>
      <p className="text-base">
        “{worked.gloss}”{worked.ref ? <span className="text-muted"> · {worked.ref}{inPassage ? ', the verse you are reading' : ''}</span> : null}
      </p>
      <p data-testid="worked-respelling" className="text-base text-muted">
        Say it: {scheme.respell(said)}
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-6 text-lg">
        {stepsOf(worked, scheme).map((step) => (
          <li key={step}>{greekMarked(step)}</li>
        ))}
      </ol>
    </section>
  );
}

/** A letter said otherwise in a pair, shown on purpose (mw-5r3p30.351; the wording is PROVISIONAL, the Governor to confirm): the word opens the pair's own idea. */
function PairLine({ pairCase, onOpen }: { pairCase: PairCase; onOpen: () => void }) {
  return (
    <p data-testid="pair-line" className="pt-3 text-base text-muted">
      In a pair it sounds different:{' '}
      <button type="button" data-testid="pair-word" onClick={onOpen} className="min-h-11 px-1 text-accent underline underline-offset-4">
        <span {...GREEK_LANG} className="font-greek text-[length:var(--lp-greek-size)]">{pairCase.word.t}</span>
      </button>
      , <span {...GREEK_LANG} className="font-greek text-[length:var(--lp-greek-size)]">{pairCase.pair}</span> = {pairCase.sound}
    </p>
  );
}

function Example({ idea, example, onWord, hidden }: { idea: GrammarIdea; example: IdeaExample; onWord: (chapter: Chapter, word: GreekWord) => void; hidden: boolean }) {
  const { word, chapter, reference } = example;
  const note = exampleNote(idea, example);
  // a sentence idea shows its verse with the use's words marked (data-use), and the speaker says those words
  const sentence = isSentenceIdea(idea.id);
  const said = sentence ? example.parts.filter((p) => p.marked).map((p) => p.text).join(' ') : word.t;
  return (
    <li hidden={hidden} className="flex items-center gap-1">
      <button
        type="button"
        data-testid="idea-example"
        data-form={word.t}
        data-lemma={word.l}
        onClick={() => onWord(chapter, word)}
        className="flex min-h-12 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 rounded-xl border border-line px-3 py-1 text-left active:bg-line"
      >
        <span {...GREEK_LANG} className={sentence ? 'font-greek text-[length:var(--lp-greek-size)] basis-full' : 'font-greek text-2xl'}>
          {example.parts.map((part, i) =>
            part.marked ? (
              <span key={i} data-marked data-use={sentence ? '' : undefined} className="font-bold text-accent underline decoration-2 underline-offset-4">
                {part.text}
              </span>
            ) : (
              part.text
            ),
          )}
        </span>
        <span data-testid="idea-gloss" className="flex-1 break-words text-base text-muted">{exampleGloss(idea, example)}</span>
        <span data-testid="idea-verse" className="shrink-0 text-sm text-muted">
          {reference}
        </span>
        {note ? (
          <span data-testid="idea-example-note" className="basis-full pb-1 text-sm text-muted">
            {greekMarked(note, 'font-greek text-lg')}
          </span>
        ) : null}
      </button>
      <SpeakButton text={said} id={`idea:${said}`} label={`Hear ${said}`} kind="speaker" className="shrink-0" />
    </li>
  );
}

/** How many examples are drawn when the sheet opens: three fit above the slider on a phone held upright or on its side (mw-5r3p30.369). */
const SHOWN_EXAMPLES = 3;

/** The examples, the first SHOWN_EXAMPLES drawn and the rest folded under 'Show N more', so a row is never out of view when the sheet opens. */
function Examples({ idea, examples, onWord }: { idea: GrammarIdea; examples: IdeaExample[]; onWord: (chapter: Chapter, word: GreekWord) => void }) {
  const [all, setAll] = useState(false);
  const folded = all ? 0 : Math.max(0, examples.length - SHOWN_EXAMPLES);
  return (
    <>
      <ul className="space-y-2 pt-1">
        {examples.map((example, i) => (
          <Example key={`${example.reference}:${i}:${example.word.t}`} idea={idea} example={example} onWord={onWord} hidden={i >= examples.length - folded} />
        ))}
      </ul>
      {folded ? (
        <button type="button" onClick={() => setAll(true)} className="mt-1 min-h-11 px-1 text-base font-medium text-accent underline underline-offset-4">
          Show {folded} more
        </button>
      ) : null}
    </>
  );
}

/** How many grammar books Read more draws when the sheet opens; the rest wait under 'More books (N)'. */
const SHOWN_BOOKS = 3;

/**
 * Read more (mw-5r3p30.381, PROVISIONAL): with Logos on, one line for each grammar book he ticked (Settings > Study resources > Logos > Grammar books)
 * that teaches this idea, the book's name over a link to each of its sections; a tap opens Logos there, or the ref.ly page when the phone has no Logos.
 * Nothing is drawn while the store is read, with Logos off, or when no ticked book teaches the idea. `books` is the list; a test hands it its own.
 */
function ReadMore({ ideaId, books }: { ideaId: string; books: readonly GrammarBook[] }) {
  const [all, setAll] = useState(false);
  const headingId = useId();
  const kept = useLiveQuery(async () => ({ logos: (await getStudyResources()).on.includes('logos'), ticked: await getGrammarBooks() }), []);
  const lines = kept?.logos ? readMoreFor(ideaId, kept.ticked, books) : [];
  if (!lines.length) return null;
  const folded = all ? 0 : Math.max(0, lines.length - SHOWN_BOOKS);
  return (
    <section aria-labelledby={headingId} className="mt-4">
      <h3 id={headingId} className="text-lg font-semibold">
        Read more
      </h3>
      <div className="mt-1 space-y-3">
        {lines.map((line, i) => (
          <div key={line.book.id} role="group" aria-label={line.book.short} hidden={i >= lines.length - folded}>
            <p className="text-base font-medium">{line.book.short}</p>
            <div className="mt-1 flex flex-col gap-2">
              {line.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  data-fallback={link.fallback}
                  aria-label={link.label}
                  onClick={() => armFallback(link.fallback)}
                  className="flex min-h-12 items-center rounded-xl border border-line px-4 py-2 text-left text-base font-medium text-accent active:bg-line"
                >
                  {link.tile ?? link.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      {folded ? (
        <button type="button" onClick={() => setAll(true)} className="mt-1 min-h-11 px-1 text-base font-medium text-accent underline underline-offset-4">
          More books ({folded})
        </button>
      ) : null}
    </section>
  );
}

export function IdeaSheet({ idea, onClose, onWord, onAsk, covered = false, books = GRAMMAR_BOOKS }: {
  idea: GrammarIdea;
  onClose: () => void;
  /** a sheet opened over this one is up: it takes the Escape */
  covered?: boolean;
  /** an example was tapped: its chapter, so the word's parsing and meaning can be read */
  onWord: (chapter: Chapter, word: GreekWord) => void;
  /** Ask the tutor, with the idea's first term (its title when it covers none); the button is left out when the screen cannot send it */
  onAsk?: (term: string) => void;
  /** the grammar books Read more may name (GRAMMAR_BOOKS); a test hands it its own */
  books?: readonly GrammarBook[];
}) {
  const { drag, handle } = useSheetDrag(onClose);
  // a tile's own idea sheet opens over this one
  const [opened, setOpened] = useState<GrammarIdea | null>(null);
  // Try it on a verse (mw-emk3xt.4): offered when a verse of the passage has a form of the idea; it takes the Escape while it is up
  const [trying, setTrying] = useState(false);
  useEscapeToClose(onClose, !covered && opened === null && !trying);
  useSheetBack(onClose);
  const loaded = usePassage();
  const level = useLiveQuery(() => getLevel(idea.id), [idea.id]);
  // the lesson of a sound is the chosen pronunciation's (mw-5r3p30.229); until the saved choice is read, the one the speaker already holds
  const chosen = useLiveQuery(getGreekPronunciation, []);
  const scheme = chosen === undefined ? chosenPronunciation() : pronunciationOf(chosen);
  // the writes follow one another: a second move made while the first is being written waits for it, and is not lost
  const writing = useRef<Promise<unknown>>(Promise.resolve());
  const accent = useAccent(); // the hints below are said in the chosen English accent: draw again when it is chosen
  const tiles = teachTiles(idea, scheme);
  const card = teachOf(idea.id);
  const sounds = soundLesson(idea, scheme);
  const passage = loaded && loaded !== 'failed' ? loaded.passage : undefined;
  // what the speaker reads: the lesson as it is drawn, part by part (the tiles, the table and the examples are for the eye and the tap)
  const { worked } = workedFor(card, passage ? passageForms(passage) : new Set());
  const lesson = proseOf([
    idea.title,
    'What it is', card.whatItIs,
    'How to spot it', card.howToSpot,
    sounds ? 'How it sounds' : null, sounds,
    'Worked example', worked.word, worked.gloss, ...stepsOf(worked, scheme),
  ]);
  // the goal's own examples at once; with none, the pericope, chapter and book are looked in (mw-5r3p30.350) and the sheet says which gave them
  const levels = useLiveQuery(listLevels, []);
  const ranking = useRanking();
  const own = passage && !isSoundIdea(idea.id) ? ideaExamples(idea.id, passage.chapters, passage.verse, undefined, scheme) : [];
  const wider = useWiderExamples(idea.id, own.length ? undefined : passage, scheme, ranking);
  const examples = own.length ? own : wider?.examples ?? [];
  const exampleTitle = own.length || !wider ? passage?.title : wider.title;

  // the idea under this one that is not solid yet, the lowest (the sheet teaches only its own idea)
  const builtOn = levels ? unmetNeed(idea.id, new Map([...levels].map(([id, row]) => [id, row.level]))) : null;
  const need = builtOn === null ? null : ideaOf(builtOn);

  const rest = Math.max(0, STOPS.findIndex((stop) => stop.level === level?.level));
  // where he moved the slider to, until the level it moved from changes (the write has landed) or he is sent back
  const [moved, setMoved] = useState<{ to: number; from: number } | null>(null);
  // while the thumb is being dragged the stops it passes are not chosen: only where it is let go is
  const [dragged, setDragged] = useState<number | null>(null);
  const dragging = useRef(false);
  const shown = dragged ?? (moved && moved.from === rest ? moved.to : rest);
  const [drill, setDrill] = useState<DrillMode | null>(null);
  // Got it on The Greek alphabet starts the letter drill at once (mw-86e9r1.11)
  const [letterDrill, setLetterDrill] = useState(false);
  const [asking, setAsking] = useState<{ to: number; need: GrammarIdea } | null>(null);
  // the idea he is learning now, when he slid this one to Learning: one idea at a time, so he chooses (mw-i7xe0n.6)
  const [switching, setSwitching] = useState<GrammarIdea | null>(null);
  // a confirm card takes no tap in the moment it appears, and the sheet none in the moment it goes (src/ui/settle.ts, mw-i7xe0n.26)
  useSettleAround(asking !== null);
  useSettleAround(switching !== null);

  const teach = (outcome: IdeaOutcome, choice?: FrontierChoice): void => {
    writing.current = writing.current
      .then(async () => {
        const result = await teachIdea(idea.id, outcome, undefined, 'sheet', choice);
        if (result.status === 'busy') setSwitching(ideaOf(result.other));
        else if (result.status === 'taught' && outcome === 'got-it' && idea.id === 'alphabet') setLetterDrill(true);
      })
      .catch((error: unknown) => console.error('could not keep the level', error));
  };
  const goOn = (to: number): void => {
    setAsking(null);
    const outcome = OUTCOME_OF_STOP[to];
    if (outcome) teach(outcome);
    else setDrill('prove');
  };
  const slideTo = (to: number): void => {
    if (to === rest) return setMoved(null);
    setMoved({ to, from: rest });
    if (to > 0 && need) setAsking({ to, need });
    else goOn(to);
  };
  const stepBy = (event: KeyboardEvent<HTMLInputElement>): void => {
    const to = { ArrowRight: shown + 1, ArrowUp: shown + 1, ArrowLeft: shown - 1, ArrowDown: shown - 1, Home: 0, End: STOPS.length - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    slideTo(Math.min(STOPS.length - 1, Math.max(0, to)));
  };
  const letGo = (): void => {
    dragging.current = false;
    if (dragged !== null) slideTo(dragged);
    setDragged(null);
  };
  const closeDrill = (): void => {
    setDrill(null);
    setMoved(null);
  };
  const markKnown = (): void => teach('known');
  // the tables that teach this idea (mw-svw421.5): a tap opens one in Study mode, and Back brings this sheet back (src/ideaReturn.ts)
  const tables = paradigmsOf(idea.id);
  const seeTable = (table: string): void => {
    holdIdea(idea.id);
    openParadigm({ table });
  };
  // the Hard sounds lessons on this letter or pair for his accent (mw-5r3p30.361): optional, a tap opens one, and Back brings this sheet back as from a table
  const letter = idea.glyphs?.[0] ?? idea.pair;
  const soundLessons = letter ? lessonsForLetter(letter, scheme.id, accent) : [];
  const learnToSay = (lesson: string): void => {
    holdIdea(idea.id);
    openSoundLesson(lesson);
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="idea-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Idea"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface short:grid short:h-dvh short:max-h-none short:grid-cols-[minmax(0,1fr)_18rem] short:grid-rows-[auto_minmax(0,1fr)_auto]"
      >
        <div data-testid="idea-handle" {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2 short:col-span-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1 short:col-start-1 short:row-start-2 short:pb-[calc(0.75rem+var(--lp-end-inset))]">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 break-words text-2xl font-bold">{titled(idea.title)}</h2>
            <LessonReadAloud id={`idea:${idea.id}`} text={lesson} ready={loaded !== null} />
          </div>
          {level ? (
            <p data-testid="idea-level" className="mt-1 inline-block rounded-full border border-line px-3 py-1 text-sm text-muted">
              {level.level === 'solid' && level.how === 'drill' ? 'Proved by drill' : `${LEVEL_NAMES[level.level]} since`} {sinceText(level.since)}
            </p>
          ) : null}
          {loaded === null || (!own.length && !wider && passage) ? (
            <p data-testid="idea-loading" className="mt-3 text-base text-muted">
              Finding examples…
            </p>
          ) : loaded === 'failed' ? (
            <p className="mt-3 text-base text-muted">Could not load the passage, and you may be offline.</p>
          ) : (
            <div className="mt-3 short:mt-2">
              <p className="text-sm text-muted">Examples from {exampleTitle}</p>
              {examples.length ? (
                <Examples idea={idea} examples={examples} onWord={onWord} />
              ) : (
                <p className="pt-1 text-base text-muted">
                  {isSpellingIdea(idea.id)
                    ? `No word of ${loaded.passage.title} is spelt with this.`
                    : `No word of ${loaded.passage.title} has this idea in its parsing.`}
                </p>
              )}
              {wider?.pairCase && !own.length ? <PairLine pairCase={wider.pairCase} onOpen={() => setOpened(wider.pairCase!.idea)} /> : null}
            </div>
          )}
          {need ? (
            <div data-testid="idea-builds-on" className="mt-3 rounded-xl border border-line p-3">
              <p className="text-base">This builds on {titled(need.title)}. Prove it first.</p>
              <button type="button" onClick={() => setOpened(need)} className="mt-2 min-h-11 rounded-xl border border-line px-4 text-base font-medium text-accent active:bg-line">
                Go to {titled(need.title)}
              </button>
            </div>
          ) : null}
          {tiles.length ? <TeachTiles tiles={tiles} onOpen={(id) => setOpened(ideaOf(id))} /> : null}
          <Part>What it is</Part>
          <p data-testid="idea-what" className="mt-1 text-lg">
            {greekMarked(card.whatItIs)}
          </p>
          <Part>How to spot it</Part>
          <p data-testid="idea-spot" className="mt-1 text-lg">
            {greekMarked(card.howToSpot)}
          </p>
          {card.table ? <TableView table={card.table} /> : null}
          {sounds ? (
            <>
              <Part>How it sounds</Part>
              <p data-testid="idea-text" className="mt-1 text-lg">
                {greekMarked(sounds)}
              </p>
            </>
          ) : null}
          {soundLessons.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              data-sound-lesson={lesson.id}
              onClick={() => learnToSay(lesson.id)}
              className="mt-3 min-h-12 w-full rounded-xl border border-line px-4 text-left text-lg font-medium text-accent active:bg-line"
            >
              {soundLessons.length > 1 ? `${learnLabel(lesson)}: ${lesson.title}` : learnLabel(lesson)}
            </button>
          ))}
          {idea.glyphs ? <LessonWriteIt idea={idea} /> : null}
          <Worked teach={card} passage={passage} scheme={scheme} />
          {tables.length ? (
            <div data-testid="idea-tables" className="mt-4 flex flex-col gap-2">
              {tables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  data-table={table.id}
                  onClick={() => seeTable(table.id)}
                  className="min-h-12 rounded-xl border border-line px-4 text-left text-lg font-medium text-accent active:bg-line"
                >
                  Table: {greekMarked(table.name)}
                </button>
              ))}
            </div>
          ) : null}
          <ReadMore ideaId={idea.id} books={books} />
        </div>
        {/* what is read aloud keeps its Pause and Stop in view: this sheet is over the Grammar and word sheets' own bars */}
        <div className="contents short:col-span-2 short:row-start-3 short:block">
          <BarSlot level={6} />
        </div>
        {/* on its side (a short window) the slider and buttons are a column at the right, so the examples keep the height (mw-5r3p30.369) */}
        <div className="shrink-0 border-t border-line px-4 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))] short:col-start-2 short:row-start-2 short:overflow-y-auto short:overscroll-contain short:border-t-0 short:border-l">
          <div data-testid="level-slider">
            <input
              type="range"
              aria-label="Your level"
              aria-valuetext={STOPS[shown].label}
              min={0}
              max={STOPS.length - 1}
              step={1}
              value={shown}
              disabled={loaded === null}
              onChange={(e) => (dragging.current ? setDragged(Number(e.target.value)) : slideTo(Number(e.target.value)))}
              onKeyDown={stepBy}
              onPointerDown={() => {
                dragging.current = true;
              }}
              onPointerUp={letGo}
              onPointerCancel={letGo}
              className="level-slider block w-full"
            />
            <div data-testid="level-stops" aria-hidden="true" className="flex justify-between text-sm text-muted">
              {STOPS.map((stop, i) => (
                <span key={stop.label} className={i === shown ? 'font-medium text-accent' : undefined}>
                  {stop.label}
                </span>
              ))}
            </div>
          </div>
          {level?.level === 'solid' ? null : (
            <button type="button" onClick={markKnown} className="mx-auto mt-1 block min-h-11 px-3 text-sm text-muted underline underline-offset-4">
              Mark known without a drill
            </button>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            <button type="button" disabled={loaded === null} onClick={() => setDrill('practice')} className={`${BUTTON} border-line text-accent active:bg-line disabled:text-muted`}>
              Drill it
            </button>
            {passage && hasFormOf(idea.id, passage.chapters, passage.verse) ? (
              <button type="button" onClick={() => setTrying(true)} className={`${BUTTON} border-line text-accent active:bg-line`}>
                Try it on a verse
              </button>
            ) : null}
            {onAsk ? (
              <button type="button" onClick={() => onAsk(idea.terms[0] ?? idea.title)} className={`${BUTTON} border-line text-accent active:bg-line`}>
                Ask the tutor
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {asking ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-6">
          <div role="alertdialog" aria-modal="true" aria-labelledby="idea-go-first" className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4">
            <p id="idea-go-first" className="text-lg font-medium">
              Go to {titled(asking.need.title)} first?
            </p>
            <p className="mt-1 text-base text-muted">This idea builds on it, and it is not solid yet.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                ref={focusOnMount}
                onClick={() => {
                  setMoved(null);
                  setAsking(null);
                  setOpened(asking.need);
                }}
                className={`${BUTTON} border-accent bg-accent text-accent-fg`}
              >
                Go there
              </button>
              <button type="button" onClick={() => goOn(asking.to)} className={`${BUTTON} border-line text-accent active:bg-line`}>
                Stay here
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {switching ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-6">
          <div role="alertdialog" aria-modal="true" aria-labelledby="idea-switch" className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4">
            <p id="idea-switch" className="text-lg font-medium">
              You are learning {titled(switching.title)}. Switch to {titled(idea.title)}?
            </p>
            <p className="mt-1 text-base text-muted">You learn one idea at a time. {titled(switching.title)} goes back to Not yet, and what you did on it is kept.</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                ref={focusOnMount}
                onClick={() => {
                  setSwitching(null);
                  teach('got-it', 'switch');
                }}
                className={`${BUTTON} border-accent bg-accent text-accent-fg`}
              >
                Switch
              </button>
              <button
                type="button"
                onClick={() => {
                  setSwitching(null);
                  setMoved(null);
                }}
                className={`${BUTTON} border-line text-accent active:bg-line`}
              >
                Keep {titled(switching.title)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {drill ? (
        <DrillItScreen
          ideaId={idea.id}
          mode={drill}
          passage={passage?.chapters}
          onResult={(result) => void recordDrill(result, drill).catch((error: unknown) => console.error('could not keep the drill', error))}
          onClose={closeDrill}
        />
      ) : null}
      {trying && passage ? <TryItSheet idea={idea} passage={passage} onClose={() => setTrying(false)} /> : null}
      {letterDrill ? <LetterDrillScreen onClose={() => setLetterDrill(false)} /> : null}
      {opened ? <IdeaSheet idea={opened} onClose={() => setOpened(null)} onWord={onWord} onAsk={onAsk} covered={covered} books={books} /> : null}
    </div>
  );
}
