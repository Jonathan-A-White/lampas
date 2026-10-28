// The Bible talk's fit (mw-o480n1.6): the cuts that make a request fit a grist, each a voice-kit `Cut<TalkRequest>` (the request with one thing less, or null when
// this cut has nothing more to take), listed in the order they are taken. voice-kit's fitRequest runs them (src/services/talk.ts fitHistory): each is taken again while the
// request is over budget until it returns null, then the next one is tried.
import { CLIPPED_CHARS, clipText, type Cut } from 'voice-kit/talks';
import { clipText as clipPassage } from './requestBudget';
import { trimWorks } from '../resources/tutorLinks';
import { foldedTurn, type TalkRequest } from './talk';
import { dropFarthest, heldText, holdText, textOf, versesLabel } from './talkVerses';

/** What the grist header's `talk` adds to a request's weight once sealed: `,"talk":"..."`, counted in the cap beside the request. */
export const talkBytes = (talk: string | undefined): number => (talk ? new TextEncoder().encode(`,"talk":${JSON.stringify(talk)}`).length : 0);

/** The request without `key`, which the request omits when it has nothing to say. */
const without = (request: TalkRequest, key: keyof TalkRequest): TalkRequest => {
  const rest = { ...request };
  delete rest[key];
  return rest;
};

/** The oldest long answer in the history cut short (the kit's clipText); null when no answer is long. */
export const clipLongAnswer: Cut<TalkRequest> = (request) => {
  const long = request.history.findIndex((t) => t.a.length > CLIPPED_CHARS);
  if (long < 0) return null;
  return { ...request, history: request.history.map((t, i) => (i === long ? { ...t, a: clipText(t.a, CLIPPED_CHARS) } : t)) };
};

/** The pronunciation's guide goes before the words and the turns (mw-5r3p30.268: a quiz on a long passage needs them more than the sound rules), except on a sound question; null when it is gone or kept. */
export const dropPronunciationGuide: Cut<TalkRequest> = (request) =>
  request.pronunciation_guide === undefined || request.focus?.kind === 'sound' ? null : { ...request, pronunciation_guide: undefined, hebrew_pronunciation_guide: undefined };

/** The key the request carries the verses' text in their own language under: `hebrew` for a verse of an Old Testament chapter, `greek` for the New Testament's; none for an Old Testament chapter at Hebrew 0 (English alone). */
const sourceKeyOf = (request: TalkRequest): 'hebrew' | 'greek' | undefined => (request.hebrew !== undefined ? 'hebrew' : request.greek !== undefined ? 'greek' : undefined);

/** The request with one word less in the word list it carries, the Greek one or the Hebrew one (mw-gdcyf98.18), from its end; null when it has no word left. */
const lessWord = (request: TalkRequest): TalkRequest | null =>
  request.greek_words && request.greek_words.length > 0
    ? { ...request, greek_words: request.greek_words.slice(0, -1) }
    : request.hebrew_words && request.hebrew_words.length > 0
      ? { ...request, hebrew_words: request.hebrew_words.slice(0, -1) }
      : null;

/** One word of the text's word list (Greek or Hebrew) from its end, while a turn of the history remains to be cut after it; null when none is left or no turn remains. */
export const trimGreekWordsWhileHistory: Cut<TalkRequest> = (request) => (request.history.length > 0 ? lessWord(request) : null);

/** The digest of his shelf cut from its end, each book it drops counted into its closing line (mw-rfjjzd.10); null when none is left. */
export const trimShelfDigest: Cut<TalkRequest> = (request) =>
  request.works && request.works.length > 0 ? withoutEmpty({ ...request, works: trimWorks(request.works) }, 'works') : null;

/** The maps of the passage's chapter (mw-zbjgn3r.4) go whole, after the shelf digest: a map the tutor is not told of is a link it does not offer; null when the request has none. */
export const dropMaps: Cut<TalkRequest> = (request) => (request.maps ? without(request, 'maps') : null);

/** The passages the tutor fetched older than the newest one go, the oldest first (the last in the list, newest first), before anything of the talk's own is cut (mw-5r3p30.734); null when one or none is held. */
export const dropOlderHeldPassage: Cut<TalkRequest> = (request) =>
  request.held_passages && request.held_passages.length > 1 ? { ...request, held_passages: request.held_passages.slice(0, -1) } : null;

/**
 * The lesser fields the tutor can answer without, cut to make room for a fetched passage before it or the last turns are touched (mw-5r3p30.825: his Revelation 6 request weighed about 8,700 of
 * 9,400 bytes in fields that were never cut, and the passage the tutor asked for was the first thing to go). What the rusty items and Today hold are offers the tutor may do without for a turn;
 * his solid words go but for their count. Each returns null when the request holds no passage (a talk that fetched nothing keeps them) or has none of the field.
 */
export const dropRusty: Cut<TalkRequest> = (request) => (request.held_passages?.length && request.rusty ? without(request, 'rusty') : null);
export const dropToday: Cut<TalkRequest> = (request) => (request.held_passages?.length && request.today ? without(request, 'today') : null);
export const dropSolidWords: Cut<TalkRequest> = (request) => (request.held_passages?.length && request.solid_words.length > 0 ? { ...request, solid_words: [] } : null);

/** The longest of a held passage's two texts must stay at least this long (characters) for the fit to clip it: a passage cut shorter than a few verses is not worth sending. */
export const HELD_CLIP_FLOOR = 600;

/**
 * The newest fetched passage, clipped a tenth at a time (the longer of its Greek and English, ending in the mark that says the text goes on, as clipPassageText does the talk's own) once
 * every other cut but the turns has been made; null when it is gone or clipped to HELD_CLIP_FLOOR.
 */
export const clipNewestHeldPassage: Cut<TalkRequest> = (request) => {
  const [newest, ...rest] = request.held_passages ?? [];
  if (!newest) return null;
  const source = newest.hebrew === undefined ? 'greek' : 'hebrew';
  const key = (newest[source] ?? '').length >= newest.english.length ? source : 'english';
  const text = newest[key] ?? '';
  if (text.length <= HELD_CLIP_FLOOR) return null;
  const clipped = clipPassage(text);
  return clipped === text ? null : { ...request, held_passages: [{ ...newest, [key]: clipped }, ...rest] };
};

/** The newest fetched passage goes only when the history is down to the newest turn: the last of the talk's text to give way but the newest turn and the summary. */
export const dropNewestHeldPassage: Cut<TalkRequest> = (request) => (request.held_passages && request.held_passages.length > 0 ? withoutEmpty({ ...request, held_passages: request.held_passages.slice(1) }, 'held_passages') : null);

/** A request keeps the key of a list only while the list holds something. */
function withoutEmpty(request: TalkRequest, key: 'works' | 'held_passages'): TalkRequest {
  const list = request[key];
  return list && list.length > 0 ? request : without(request, key);
}

/**
 * A passage longer than a request holds (a whole chapter, mw-5r3p30.699) gives up one whole verse, the farthest from the talk's verse (mw-5r3p30.733), with the words of the
 * verse that is gone; null when the request holds no passage by its verses (a copy made by hand, which clipPassageText cuts by characters) or one verse is left.
 */
export const dropFarthestVerse: Cut<TalkRequest> = (request) => {
  const hold = heldText(request);
  const key = sourceKeyOf(request);
  if (!hold || (key === undefined && request.english === undefined) || hold.parts.length <= 1) return null;
  const parts = dropFarthest(hold.parts, hold.anchor);
  const text = textOf(parts);
  const forms = new Set(text.greek.split(' '));
  const verses = versesLabel(hold.chapter, parts) ?? request.verses;
  const next: TalkRequest = {
    ...request,
    english: text.english,
    ...(key ? { [key]: text.greek } : {}),
    ...(verses ? { verses } : {}),
    ...(request.greek_words ? { greek_words: request.greek_words.filter((w) => forms.has(w.form)) } : {}),
    ...(request.hebrew_words ? { hebrew_words: request.hebrew_words.filter((w) => forms.has(w.form)) } : {}),
  };
  return holdText(next, { ...hold, parts });
};

/** The longer of the two texts of a passage (the Greek, or the Hebrew, and the English of the same verses) a tenth less, from its end; null when neither is long enough to cut. One verse longer than a request holds is sent from its start.
 * An Old Testament chapter at Hebrew 0 holds the English alone, which is clipped the same way. */
export const clipPassageText: Cut<TalkRequest> = (request) => {
  const source = sourceKeyOf(request);
  if (source === undefined && request.english === undefined) return null;
  const own = source ? (request[source] ?? '') : '';
  const english = request.english ?? '';
  const key = source && own.length >= english.length ? source : 'english';
  const text = key === 'english' ? english : own;
  const clipped = clipPassage(text);
  return clipped === text ? null : { ...request, english, [key]: clipped };
};

/** The turns of the history the fit keeps until every other cut has been made (mw-5r3p30.825). */
export const KEPT_TURNS = 3;

/**
 * The oldest turn of the history goes, never the newest (it is what he is answering, mw-5r3p30.615). A turn dropped for room is folded into the summary instead of lost, cut short, behind the turns already
 * waiting to be: only when none is left waiting behind them (`unfolded`), else the summary would skip them. The first `held` turns of the history are in the summary already, since an earlier fit
 * folded them: they go without a second fold. The cut counts those as it goes, so a list of steps is for one fit. It stops with `keep` turns left: the first pass keeps the last three
 * (KEPT_TURNS, mw-5r3p30.825) and the second goes down to the newest.
 */
export const foldOldestTurn = (held: number, keep = 1, name = 'foldOldestTurn', turns = { covered: held }): Cut<TalkRequest> => {
  const cut: Cut<TalkRequest> = (request) => {
    if (request.history.length <= keep) return null;
    const fold = turns.covered > 0 || request.unfolded ? request.fold : [...(request.fold ?? []), foldedTurn(request.history[0])];
    if (turns.covered > 0) turns.covered -= 1;
    const next: TalkRequest = { ...request, history: request.history.slice(1) };
    return fold && fold.length > 0 ? { ...next, fold } : without(next, 'fold');
  };
  return Object.defineProperty(cut, 'name', { value: name });
};

/** The two passes over the history that share one count of the turns the summary holds already: down to the last KEPT_TURNS, and later down to the newest. */
const foldPasses = (held: number): [Cut<TalkRequest>, Cut<TalkRequest>] => {
  const turns = { covered: held };
  return [foldOldestTurn(held, KEPT_TURNS, 'foldToLastThreeTurns', turns), foldOldestTurn(held, 1, 'foldOldestTurn', turns)];
};

/** What the cut turns would add goes first when the request is still over: the fold is the oldest turns' last claim on the record. */
export const dropFoldTail: Cut<TalkRequest> = (request) => {
  if (!request.fold || request.fold.length === 0) return null;
  const fold = request.fold.slice(0, -1);
  return fold.length > 0 ? { ...request, fold } : without(request, 'fold');
};

/** One word of the text's word list (Greek or Hebrew) from its end. */
export const trimGreekWords: Cut<TalkRequest> = (request) => lessWord(request);

/** The oldest of his requests (the last in the list, newest first). */
export const dropOldestRequest: Cut<TalkRequest> = (request) =>
  request.requests && request.requests.length > 0 ? { ...request, requests: request.requests.slice(0, -1) } : null;

/** His notes from the end of the list (they come in name order: book, topic, word); the index always stays. */
export const dropLastNote: Cut<TalkRequest> = (request) =>
  request.memory?.notes && request.memory.notes.length > 0 ? { ...request, memory: { ...request.memory, notes: request.memory.notes.slice(0, -1) } } : null;

/** The results of a drill give way a right answer at a time, the oldest first, then the rest from the end: the wrong ones are what he talks about. */
export const dropDrillAnswer: Cut<TalkRequest> = (request) => {
  const drill = request.screen?.drill;
  if (!request.screen || !drill || drill.length === 0) return null;
  const right = drill.findIndex((d) => d.right);
  return { ...request, screen: { ...request.screen, drill: right >= 0 ? drill.filter((_, i) => i !== right) : drill.slice(0, -1) } };
};

/** The newest turn, the last of the history to go (mw-5r3p30.615: a talk from Settings, whose screen weighs most of the record, forgot the question it was answering). */
export const dropNewestTurn: Cut<TalkRequest> = (request) => (request.history.length > 0 ? { ...request, history: request.history.slice(1) } : null);

/** The summary is the last to go, after the newest turn (mw-5r3p30.700); a fold with no summary to fold into would replace the kept summary with a part of it, so it goes with it. */
export const dropSummary: Cut<TalkRequest> = (request) => (request.summary ? without(without(request, 'summary'), 'fold') : null);

/**
 * Every cut of the Bible talk's fit, in the order they are taken. A cut keeps the passage's verses (talkVerses holdText) from the request it cut, which only a request straight from
 * buildTalkRequest carries. `held` is how many of the history's oldest turns the summary holds already (foldOldestTurn); the list is for one fit.
 */
export const bibleTalkSteps = (held: number): readonly Cut<TalkRequest>[] => {
  const [foldToKept, foldToNewest] = foldPasses(held);
  const steps: Cut<TalkRequest>[] = [
    clipLongAnswer,
    dropPronunciationGuide,
    trimGreekWordsWhileHistory,
    trimShelfDigest,
    dropMaps,
    dropOlderHeldPassage,
    dropRusty,
    dropToday,
    dropSolidWords,
    dropFarthestVerse,
    clipPassageText,
    foldToKept,
    dropFoldTail,
    trimGreekWords,
    dropOldestRequest,
    dropLastNote,
    dropDrillAnswer,
    clipNewestHeldPassage,
    foldToNewest,
    dropFoldTail,
    dropNewestHeldPassage,
    dropNewestTurn,
    dropSummary,
  ];
  return steps.map(carryingHold);
};

/**
 * The cut `step` made to keep the passage's verses (talkVerses holdText) from the request it cut. Every step run by fitHistory is wrapped so, the tutor client's own (tutorFitSteps) too: a step
 * that drops the hold leaves the passage to be clipped by characters, and the request still names the verses it was built with (mw-5r3p30.757).
 */
export const carryingHold = (step: Cut<TalkRequest>): Cut<TalkRequest> => {
  const carried: Cut<TalkRequest> = (request) => {
    const next = step(request);
    const hold = heldText(request);
    return next && hold && !heldText(next) ? holdText(next, hold) : next;
  };
  return Object.defineProperty(carried, 'name', { value: step.name });
};
