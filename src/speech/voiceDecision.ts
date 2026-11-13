// src/speech/voiceDecision.ts — the Bible voice explains itself (mw-zbgo4ep.30). Every place a Bible reading starts (the header's Play, a verse's play button, Play to, a Listen, and
// the crossing into the next chapter) asks decideVoice() ONCE, with no wait, and is told which voice reads and what to say about it:
//   * on Wi-Fi (or Recording (David)) where David has recorded the chapter: the recording;
//   * on Wi-Fi (or Recording (David)) where the index says he has not recorded the chapter yet: the phone's voice, and the line DAVID_NOT_RECORDED (once a book a session);
//   * on mobile data with Recording on Wi-Fi only: where David has the chapter, ONE question the first time (DATA_QUESTION; the answer is remembered), and the phone's voice with the
//     one-time DATA_NOTICE; where he has not, the phone's voice and the notice.
// The recorded voice's own rule (recordedVoice.ts wantsRecording / recordingFor) is unchanged; this file only adds what is said. What he answered and what was said is kept in
// localStorage (lampas.dataVoiceAsked, lampas.dataVoiceNoticed); the line about a book is kept for the session only.
import { chapterListedNow, chapterTimingsNow, spanOf, type ChapterTimings } from '../data/audioTimings';
import { bookOf } from '../data/books';
import type { Chapter } from '../data/chapter';
import type { BibleVoice } from '../settings/definitions/bibleVoice';
import { bibleVoiceChosen, heldBackByData, recordingEligible, recordingWanted, wantsRecording } from './recordedVoice';
import type { PlanVerse } from './readAloud';

/** The MP3s are 192 kbps mono: 24 KB a second, 1.44 MB a minute, about 86 MB an hour. */
export const DATA_QUESTION = 'Play David over mobile data? It uses about 1.4 MB a minute (about 86 MB an hour).';
export const PLAY_ON_DATA = 'Play David on data';
export const KEEP_PHONE_VOICE = 'Keep the phone voice';
export const DATA_NOTICE = 'On mobile data Lampas reads in the phone voice. David plays on Wi-Fi.';
export const notRecordedNotice = (book: string): string => `David hasn't recorded ${book} here yet: the phone voice reads it.`;

const ASKED = 'lampas.dataVoiceAsked';
const NOTICED = 'lampas.dataVoiceNoticed';

function kept(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function keep(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // a phone that keeps nothing says it again next time
  }
}

/** The question about data has been answered (either way): it is never asked again. Settings still changes the voice. */
export const dataQuestionAnswered = (): boolean => kept(ASKED);
export const markDataQuestionAnswered = (): void => keep(ASKED);

/** Whether opening a chapter should load its book's timings (a small file) under this Bible voice setting (the Reader's own value; undefined until the saved one is read): when David could play
 * (recordingWanted), and on mobile data with Recording on Wi-Fi only just while the one question about data is still to be asked (decideVoice offers Play David on data only with the timings
 * already in, so the first Play needs them); once it is answered, data spends nothing on a recording that will not play (mw-zbgo4ep.33). */
export function timingsWarmFor(voice: BibleVoice | undefined): boolean {
  if (recordingWanted(voice) !== null) return true;
  return voice === 'msb-david-wifi' && !dataQuestionAnswered();
}

/** The books the 'not recorded yet' line was said for this session. */
const saidFor = new Set<string>();

/** Forgets what was said (a test's): the books of this session; and the notice kept in localStorage. */
export function forgetVoiceNotices(): void {
  saidFor.clear();
  try {
    window.localStorage.removeItem(NOTICED);
    window.localStorage.removeItem(ASKED);
  } catch {
    // nothing kept
  }
}

export interface VoiceDecision {
  /** David reads it, from these timings */
  recorded?: ChapterTimings;
  /** the line to show as the reading starts */
  notice?: string;
  /** ask the question before reading (only with `mayAsk`); `recorded` is then what Play David on data plays */
  ask?: boolean;
}

function dataNotice(): VoiceDecision {
  if (kept(NOTICED)) return {};
  keep(NOTICED);
  return { notice: DATA_NOTICE };
}

/** Which voice reads `verses` of this chapter, and what is said about it; decided at the tap with nothing awaited. `mayAsk` is false for a crossing into the next chapter (no tap to
 * play from, and a question in the middle of a reading is no question): the phone's voice reads, with the notice. */
export function decideVoice(book: string, chapter: Chapter | null, verses: readonly PlanVerse[], mayAsk: boolean): VoiceDecision {
  if (bibleVoiceChosen() === 'phone' || !recordingEligible(chapter, verses)) return {};
  const timings = chapterTimingsNow(book, chapter.chapter);
  const has = timings !== null && verses.every((v) => spanOf(timings, v.n) !== null);
  if (wantsRecording()) {
    if (has) return { recorded: timings };
    // not recorded: the index (loaded) does not list the chapter, or lists it without every verse; an index not in yet says nothing
    const listed = chapterListedNow(book, chapter.chapter);
    if (listed === null || (listed && timings === null) || saidFor.has(book)) return {};
    saidFor.add(book);
    return { notice: notRecordedNotice(bookOf(book)?.name ?? book) };
  }
  if (!heldBackByData()) return {};
  if (has && mayAsk && !dataQuestionAnswered()) return { ask: true, recorded: timings };
  return dataNotice();
}
