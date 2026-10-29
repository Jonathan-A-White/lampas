// src/data/learnerSummary.ts — what the tutor is told of where he stands, in one short line (mw-bsf54t.8): how many words are
// solid, the words he is learning (newest first), the ones he put on his list today and how many reviews are due. The bible-talk grind
// gets it as the request's `learner` field, so a question about a new word is answered in his terms.
// It is told per language (mw-gdcyf98.22): a Greek-only reader's line is the Greek one, in the shape it always had; a reader who chose Hebrew is told his Hebrew words,
// his place on the Hebrew grammar ladder, his place on the Hebrew reading ladder and how long since he last met a Hebrew word or idea; one who chose both, each under its language's name.
import { bookOf } from './books';
import { languageOfWord } from './studyLanguage';
import { levelOf, ideaState, levelsOf } from './grammar/goalProgress';
import { ladderFor } from './grammar/ladders';
import { hebrewRustDays } from './learnerRusty';
import { currentLadderPlace, refParts } from './readingLadder';
import { getLanguages, listLevels } from './repositories';
import { getLadderRow, listWellRead } from './repositories/ladder';
import { countDue } from './repositories/reviews';
import { holdsOnlyExampleWords, listWords } from './repositories/words';
import type { Word } from './db';

/** The line is never longer than this many characters (it shares a grist's 10 KiB record with the verse and the history). */
export const LEARNER_MAX_CHARS = 600;
/** The longest the line is when Hebrew is told as well (a reader of Hebrew or of both): the Hebrew side adds the ladders and the rust. */
export const LEARNER_HEBREW_MAX_CHARS = 1400;
/** The most learning words, and the most of today's, the line names. */
export const LEARNER_MAX_LEARNING = 12;
export const LEARNER_MAX_TODAY = 12;
/** The most known ideas the Hebrew ladder part names (the last, highest, ones). */
export const LEARNER_MAX_IDEAS = 4;

const startOfDay = (now: number): number => {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

/** One language's words, as the line says them. */
interface Side {
  solid: number;
  learning: string[];
  today: string[];
}

const wordsPart = ({ solid, learning, today }: Side): string =>
  `solid ${solid} ${solid === 1 ? 'word' : 'words'}; learning: ${learning.join(', ') || 'none'}; new today: ${today.join(', ') || 'none'}`;

/** The words of one language: the solid count, the learning words newest first (at most 12) and those listed since midnight (at most 12). */
function sideOf(words: readonly Word[], now: number): Side {
  const learning = words.filter((w) => w.state === 'learning').sort((a, b) => b.since - a.since);
  const midnight = startOfDay(now);
  return {
    solid: words.filter((w) => w.state === 'solid').length,
    learning: learning.slice(0, LEARNER_MAX_LEARNING).map((w) => w.lemma),
    today: learning.filter((w) => w.since >= midnight).slice(0, LEARNER_MAX_TODAY).map((w) => w.lemma),
  };
}

/** 'ladder: 2 of 140 ideas known (The alphabet, Gender); learning: Number; next: The article': his place on the Hebrew grammar ladder (ladderFor('hbo')). */
async function hebrewLadderPart(): Promise<string> {
  const ideas = ladderFor('hbo').ideas;
  const levels = levelsOf(await listLevels());
  const known = ideas.filter((i) => levelOf(levels, i.id) === 'solid');
  const learning = ideas.filter((i) => ideaState(i.id, levels) === 'learning');
  const next = ideas.find((i) => ideaState(i.id, levels) === 'next');
  const names = known.slice(-LEARNER_MAX_IDEAS).map((i) => i.title);
  return `ladder: ${known.length} of ${ideas.length} ideas known${names.length > 0 ? ` (${names.join(', ')})` : ''}; learning: ${learning.map((i) => i.title).join(', ') || 'none'}; next: ${next?.title ?? 'none'}`;
}

/** 'reading ladder: next Genesis 1:2 (1 verse read well)': his place on the Hebrew reading ladder; nothing until he has read a verse well or opened the ladder, or when its list cannot be loaded. */
async function hebrewReadingPart(): Promise<string | undefined> {
  const [well, row] = await Promise.all([listWellRead('he'), getLadderRow('he')]);
  if (well.size === 0 && row.showing === null) return undefined;
  const place = await currentLadderPlace('he').catch((): undefined => undefined);
  if (place === undefined) return undefined;
  const read = `${well.size} ${well.size === 1 ? 'verse' : 'verses'} read well`;
  const at = place === null ? undefined : refParts(place);
  return at ? `reading ladder: next ${bookOf(at.book)?.name ?? at.book} ${at.chapter}:${at.verse} (${read})` : `reading ladder: every verse read well`;
}

/** 'last seen 12 days ago': how long since he met a Hebrew word or idea. */
const rustPart = (days: number): string => `last seen ${days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`}`;

/**
 * For a reader of Greek (or of English only): 'solid N words; learning: a, b, c; new today: x, y; due now: M'. The learning words are his learning words, the most recently
 * listed first, at most 12; the new today are the learning words listed since midnight, newest first. When the line would pass
 * 600 characters the oldest names are dropped (new today's first, then the learning words'), so the counts always stay. A phone that holds only the 63
 * example words it was seeded with before a new install started empty (holdsOnlyExampleWords) is told 'solid 0 words; learning: none; ...; due now: 0', like
 * a new install, so the tutor offers it the Greek (grinds/bible-talk.instructions/130-offering-the-greek.md).
 *
 * For a reader who chose Hebrew (Settings, 'Which languages?') each language he chose is told under its name, joined by ' | ' and ended by 'due now: M':
 * 'Greek: solid 1 word; learning: λόγος; new today: none | Hebrew: solid 2 words; learning: מַיִם; new today: מַיִם; ladder: 2 of 140 ideas known (…); learning: …; next: …;
 * reading ladder: next Genesis 1:2 (1 verse read well); last seen 12 days ago | due now: 0'. The Hebrew part has its words, its place on the Hebrew grammar ladder, its place on the Hebrew
 * reading ladder (once he has started it) and his rust (once he has met a Hebrew item); the Greek part is the Greek words alone (his Greek grammar is `learner_grammar`). Over 1,400 characters the
 * names are dropped from the language with the longer words part, new today's first. A Greek-only reader is told nothing of Hebrew.
 */
export async function learnerSummary(now = Date.now()): Promise<string> {
  const [all, dueAll, examplesOnly, languages] = await Promise.all([listWords(), countDue(now), holdsOnlyExampleWords(), getLanguages()]);
  // a phone that still holds only the example words it was seeded with has told the tutor nothing of him: he is not yet a learner of the Greek (mw-yrmkdf.8)
  const words = examplesOnly ? [] : all;
  const due = examplesOnly ? 0 : dueAll;
  const hebrewChosen = languages === 'hebrew' || languages === 'both';
  const greekChosen = languages !== 'hebrew';
  const greek = sideOf(words.filter((w) => languageOfWord(w) === 'grc'), now);
  if (!hebrewChosen) return trimmed([{ label: '', side: greek, extra: [] }], due, LEARNER_MAX_CHARS);
  const hebrew = sideOf(words.filter((w) => languageOfWord(w) === 'hbo'), now);
  const [ladder, reading, rust] = await Promise.all([hebrewLadderPart(), hebrewReadingPart().catch((): undefined => undefined), hebrewRustDays(now).catch((): undefined => undefined)]);
  const extra = [ladder, ...(reading ? [reading] : []), ...(rust === undefined ? [] : [rustPart(rust)])];
  return trimmed([...(greekChosen ? [{ label: 'Greek', side: greek, extra: [] }] : []), { label: 'Hebrew', side: hebrew, extra }], due, LEARNER_HEBREW_MAX_CHARS);
}

interface Language {
  label: string;
  side: Side;
  extra: string[];
}

/** The line for `languages`, its names dropped (new today's first, then the learning words') from the language whose words part is longer until it fits `max`. */
function trimmed(languages: Language[], due: number, max: number): string {
  const line = (): string => {
    if (languages.length === 1 && languages[0].label === '') return `${wordsPart(languages[0].side)}; due now: ${due}`;
    return [...languages.map(({ label, side, extra }) => `${label}: ${[wordsPart(side), ...extra].join('; ')}`), `due now: ${due}`].join(' | ');
  };
  while (line().length > max) {
    const longest = languages.filter(({ side }) => side.today.length > 0 || side.learning.length > 0).sort((a, b) => wordsPart(b.side).length - wordsPart(a.side).length)[0];
    if (!longest) break;
    if (longest.side.today.length > 0) longest.side.today.pop();
    else longest.side.learning.pop();
  }
  return line();
}
