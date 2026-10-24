// src/memorize/sendWeave.ts — a Weave recall goes to the mill (mw-fu7dqf.7, docs/layout/memorize.md): the recording of him saying the verse as the weave of the moment shows it, with its pieces in
// order and each piece's language, to the verse-read grind exactly as the reading check sends a woven verse (services/reading.ts buildReadingRequest / askVerseRead; useReadChecks.ts
// builds the same request). Nothing in the grind changes. The answer goes to judge.ts judgeReading. A phone that is offline (or a mill out of reach) rejects with the TutorError askVerseRead
// throws (failure 'unreachable' with its message): the session reads any TutorError as 'grade yourself' (I had it / Not yet, recorded as how: 'self') and says why.
import type { Chapter, Verse } from '../data/chapter';
import { getGreekPronunciation } from '../data/repositories';
import { learnerGrammar } from '../data/grammar/learnerGrammar';
import { learnerMemory } from '../data/learnerMemory';
import { learnerProfile } from '../data/learnerProfile';
import { learnerSummary } from '../data/learnerSummary';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import type { Recording } from '../audio/recorder';
import { pronunciationOf } from '../speech/pronunciation';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askVerseRead, buildReadingRequest, wovenReading, type VerseReadAnswer, type VerseReadRequest, type WovenReading } from '../services/reading';
import type { AskOptions } from '../services/tutor';

export interface SendWeaveOptions extends Partial<AskOptions> {
  /** the chapter the verses are of: the Greek words of the reading are sent with their lemma, gloss and parsing when it is given */
  chapter?: Chapter;
}

/** The verses as the weave of the moment shows them, laid out to be read: the pieces in drawn order, each with its language. A verse with nothing woven to Greek is its English alone, still one segment. */
export function weaveOfRecall(verses: readonly Verse[], woven: readonly (WovenVerse | null | undefined)[], greek: string): WovenReading {
  const reading = wovenReading(verses, woven, greek);
  if (reading) return reading;
  const text = verses.flatMap((verse, v) => drawnOrder(verse, woven[v] ?? null).map((i) => chunkText(verse, woven[v] ?? null, i).trim())).filter(Boolean).join(' ');
  return { segments: text ? [{ text, lang: 'en' }] : [], words: [] };
}

/** The verse-read request of a Weave recall of `ref` (the reference as printed, refs.ts NtVerses.heading: 'Romans 8:28-29', which the mill and the memory notes read): what the reading check sends for a woven verse, with the learner's fields. */
export async function weaveRecallRequest(ref: string, verses: readonly Verse[], woven: readonly (WovenVerse | null | undefined)[], chapter?: Chapter): Promise<VerseReadRequest> {
  const pronunciation = await getGreekPronunciation();
  const weave = weaveOfRecall(verses, woven, pronunciationOf(pronunciation).scoringLang);
  // the profile, the words, the grammar and the memory are the tutor's context: a failure to read one sends the reading without it
  const [profile, learner, grammar, memory] = await Promise.all([learnerProfile().catch(() => undefined), learnerSummary().catch(() => undefined), learnerGrammar().catch(() => undefined), learnerMemory(ref).catch(() => undefined)]);
  return buildReadingRequest(ref, verses[0], 'english', undefined, profile, learner, grammar, pronunciation, memory, chapter, weave);
}

/** Sends the recording of a Weave recall and waits for the mill's answer. Throws a TutorError (offline: 'unreachable'). */
export async function sendWeaveRecall(ref: string, verses: readonly Verse[], woven: readonly (WovenVerse | null | undefined)[], recording: Recording, options: SendWeaveOptions = {}): Promise<VerseReadAnswer> {
  const { chapter, ...ask } = options;
  const request = await weaveRecallRequest(ref, verses, woven, chapter);
  // the recording ended as he let go: that is his tap
  return askVerseRead(request, recording, { key: getDeviceKeyBytes(), tapAt: Date.now(), ...ask });
}
