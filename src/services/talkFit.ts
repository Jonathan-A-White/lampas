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
  request.pronunciation_guide === undefined || request.focus?.kind === 'sound' ? null : { ...request, pronunciation_guide: undefined };

/** One word of the text's word list from its end, while a turn of the history remains to be cut after it; null when none is left or no turn remains. */
export const trimGreekWordsWhileHistory: Cut<TalkRequest> = (request) =>
  request.greek_words && request.greek_words.length > 0 && request.history.length > 0 ? { ...request, greek_words: request.greek_words.slice(0, -1) } : null;

/** The digest of his shelf cut from its end, each book it drops counted into its closing line (mw-rfjjzd.10); null when none is left. */
export const trimShelfDigest: Cut<TalkRequest> = (request) =>
  request.works && request.works.length > 0 ? withoutEmpty({ ...request, works: trimWorks(request.works) }, 'works') : null;

/** The oldest of the passages the tutor fetched (the last in the list, newest first), before a verse of the talk's own text or a turn (mw-5r3p30.734); null when none is held. */
export const dropOldestHeldPassage: Cut<TalkRequest> = (request) =>
  request.held_passages && request.held_passages.length > 0 ? withoutEmpty({ ...request, held_passages: request.held_passages.slice(0, -1) }, 'held_passages') : null;

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
  if (!hold || request.greek === undefined || hold.parts.length <= 1) return null;
  const parts = dropFarthest(hold.parts, hold.anchor);
  const text = textOf(parts);
  const forms = new Set(text.greek.split(' '));
  const verses = versesLabel(hold.chapter, parts) ?? request.verses;
  const next: TalkRequest = { ...request, ...text, ...(verses ? { verses } : {}), ...(request.greek_words ? { greek_words: request.greek_words.filter((w) => forms.has(w.form)) } : {}) };
  return holdText(next, { ...hold, parts });
};

/** The longer of the two texts of a passage (the Greek and the English of the same verses) a tenth less, from its end; null when neither is long enough to cut. One verse longer than a request holds is sent from its start. */
export const clipPassageText: Cut<TalkRequest> = (request) => {
  if (request.greek === undefined) return null;
  const texts = { greek: request.greek, english: request.english ?? '' };
  const key = texts.greek.length >= texts.english.length ? 'greek' : 'english';
  const clipped = clipPassage(texts[key]);
  return clipped === texts[key] ? null : { ...request, english: texts.english, [key]: clipped };
};

/**
 * The oldest turn of the history goes, never the newest (it is what he is answering, mw-5r3p30.615). A turn dropped for room is folded into the summary instead of lost, cut short, behind the turns already
 * waiting to be: only when none is left waiting behind them (`unfolded`), else the summary would skip them. The first `held` turns of the history are in the summary already, since an earlier fit
 * folded them: they go without a second fold. The cut counts those as it goes, so a list of steps is for one fit.
 */
export const foldOldestTurn = (held: number): Cut<TalkRequest> => {
  let covered = held;
  const cut: Cut<TalkRequest> = (request) => {
    if (request.history.length <= 1) return null;
    const fold = covered > 0 || request.unfolded ? request.fold : [...(request.fold ?? []), foldedTurn(request.history[0])];
    if (covered > 0) covered -= 1;
    const next: TalkRequest = { ...request, history: request.history.slice(1) };
    return fold && fold.length > 0 ? { ...next, fold } : without(next, 'fold');
  };
  return Object.defineProperty(cut, 'name', { value: 'foldOldestTurn' });
};

/** What the cut turns would add goes first when the request is still over: the fold is the oldest turns' last claim on the record. */
export const dropFoldTail: Cut<TalkRequest> = (request) => {
  if (!request.fold || request.fold.length === 0) return null;
  const fold = request.fold.slice(0, -1);
  return fold.length > 0 ? { ...request, fold } : without(request, 'fold');
};

/** One word of the text's word list from its end. */
export const trimGreekWords: Cut<TalkRequest> = (request) =>
  request.greek_words && request.greek_words.length > 0 ? { ...request, greek_words: request.greek_words.slice(0, -1) } : null;

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
  const steps: Cut<TalkRequest>[] = [
    clipLongAnswer,
    dropPronunciationGuide,
    trimGreekWordsWhileHistory,
    trimShelfDigest,
    dropOldestHeldPassage,
    dropFarthestVerse,
    clipPassageText,
    foldOldestTurn(held),
    dropFoldTail,
    trimGreekWords,
    dropOldestRequest,
    dropLastNote,
    dropDrillAnswer,
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
