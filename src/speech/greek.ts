// src/speech/greek.ts — the phone's own voice reading aloud (Web Speech), no server: modern Greek (el-GR) first, and any
// language in src/speech/languages.ts at its own speed.
// speak() is called straight from the tap handler (docs/pwa-best-practices.md section 12: a speak() that leaves the
// tap loses user activation on Android Chrome), so it never waits: the voice list is loaded ahead by warmVoices(),
// and a phone that has not listed its voices yet is still asked to speak with lang 'el-GR' and picks its own.
import { useRef, useSyncExternalStore } from 'react';
import { DEFAULT_RATES, LANGUAGES, normaliseRate, type SpeechLanguage, type SpeechRates } from './languages';
import { DEFAULT_PRONUNCIATION, pronunciationOf, type GreekPronunciation, type Pronunciation } from './pronunciation';

/** how long warmVoices() waits for the phone to list its voices */
const VOICES_WAIT_MS = 1500;

/** 'speaking': asked of the phone; 'stopped': it was this very text playing and is now stopped; 'no-voice': nothing spoken */
export type SpeakOutcome = 'speaking' | 'stopped' | 'no-voice';

interface Playing {
  key: string;
  utterance: SpeechSynthesisUtterance;
}

// What he chose in Settings (src/speech/settingsSync.ts hands it over; speak() cannot wait for a database read).
let pronunciation: GreekPronunciation = DEFAULT_PRONUNCIATION;
const chosenVoices: Record<SpeechLanguage, string | null> = { english: null, greek: null };
const rates: SpeechRates = { ...DEFAULT_RATES };

/** The language tag of the Greek being spoken (the pronunciation's), such as 'el-GR'. */
export const greekLang = (): string => pronunciationOf(pronunciation).lang;

/** The language tag put on an utterance in `language`. */
const langOf = (language: SpeechLanguage): string =>
  language === 'greek' ? greekLang() : (LANGUAGES.find((l) => l.id === language)?.lang ?? 'en-US');

/** The pronunciation he chose (its respell cuts a word into syllables). */
export const chosenPronunciation = (): Pronunciation => pronunciationOf(pronunciation);

export function setGreekPronunciation(next: GreekPronunciation): void {
  pronunciation = next;
}

/** The voiceURI of the voice he chose for `language`, or null for the phone's own pick. */
export function setVoice(language: SpeechLanguage, voiceURI: string | null): void {
  chosenVoices[language] = voiceURI;
}

/** How fast `language` is spoken (1 is normal); every utterance in it carries this, whichever button asked. */
export function setSpeechRate(language: SpeechLanguage, rate: number): void {
  rates[language] = normaliseRate(rate);
}

let playing: Playing | null = null;
let watching = false;
const listeners = new Set<() => void>();

function synthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
    ? window.speechSynthesis
    : null;
}

function setPlaying(next: Playing | null): void {
  playing = next;
  listeners.forEach((l) => l());
}

/** Whether a voice speaks a language: the tag's first part, 'el' for 'el-GR'. */
export const speaksLanguage = (v: SpeechSynthesisVoice, tag: string): boolean =>
  v.lang.split(/[-_]/)[0].toLowerCase() === tag.split(/[-_]/)[0].toLowerCase();

/** What identifies a voice for keeping: its voiceURI (its name where a browser leaves that empty). */
export const voiceKey = (v: SpeechSynthesisVoice): string => v.voiceURI || v.name;

const isGreek = (v: SpeechSynthesisVoice): boolean => speaksLanguage(v, greekLang());
const isLanguage = (language: SpeechLanguage) => (v: SpeechSynthesisVoice): boolean => speaksLanguage(v, langOf(language));

/** true: the phone lists a Greek voice; false: it lists voices and none is Greek, or cannot speak at all;
 * 'unknown': its voice list is still empty (Android Chrome fills it late). */
export function hasGreekVoice(): boolean | 'unknown' {
  const synth = synthesis();
  if (!synth) return false;
  const voices = synth.getVoices();
  if (voices.length === 0) return 'unknown';
  return voices.some(isGreek);
}

let warm: Promise<void> | null = null;

/** Gives the voice list time to load: resolves when the phone lists its voices, or after a short wait. Call it when a
 * speaker button appears so the list is there by the time of the tap. */
export function warmVoices(): Promise<void> {
  const synth = synthesis();
  if (!synth || synth.getVoices().length > 0) return Promise.resolve();
  warm ??= new Promise<void>((resolve) => {
    const done = () => {
      synth.removeEventListener('voiceschanged', done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, VOICES_WAIT_MS);
    synth.addEventListener('voiceschanged', done);
  });
  return warm;
}

function pickVoice(synth: SpeechSynthesis, language: SpeechLanguage): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  const lang = langOf(language).toLowerCase();
  const fits = isLanguage(language);
  const chosenVoice = chosenVoices[language];
  const chosen = chosenVoice === null ? undefined : voices.find((v) => voiceKey(v) === chosenVoice && fits(v));
  return chosen ?? voices.find((v) => v.lang.replace('_', '-').toLowerCase() === lang) ?? voices.find(fits) ?? null;
}

/** Stops whatever is being read. */
export function stopSpeaking(): void {
  const synth = synthesis();
  if (synth && (playing || synth.speaking || synth.pending)) synth.cancel();
  if (playing) setPlaying(null);
}

/** Stops only if `key` is what is being read (a button that goes away takes its speech with it). */
export function stopIfSpeaking(key: string): void {
  if (playing?.key === key) stopSpeaking();
}

/** A page that goes to the background has its speech suspended, and it comes back mid-sentence: end it instead. */
function watchVisibility(): void {
  if (watching) return;
  watching = true;
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && stopSpeaking());
}

/** How much slower than his speed a word is said when it is being sounded out (src/speech/soundOut.ts). */
export const SLOW_FACTOR = 0.6;

/** One utterance in `language` with its tag, its speed and the voice he chose, handed to the phone. `onEnd` is called
 * when it ends; `onError` with the engine's error name when it does not (a cancel reports 'canceled' or 'interrupted'). */
function utter(text: string, key: string, language: SpeechLanguage, synth: SpeechSynthesis, onEnd: () => void, onError: (error: string) => void, slow = false): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langOf(language);
  utterance.rate = slow ? rates[language] * SLOW_FACTOR : rates[language];
  const voice = pickVoice(synth, language);
  if (voice) utterance.voice = voice;
  const ended = () => {
    // a cancelled utterance reports after the next one has started: only its own end clears the state
    if (playing?.utterance === utterance) setPlaying(null);
  };
  utterance.onend = () => {
    ended();
    onEnd();
  };
  utterance.onerror = (e) => {
    ended();
    onError(e.error);
  };
  setPlaying({ key, utterance });
  synth.resume();
  synth.speak(utterance);
}

/** Whether an engine error is a cancel (deliberate or the phone's own) rather than a failure. */
export const isCancelError = (error: string): boolean => error === 'canceled' || error === 'interrupted';

/** Reads `text` aloud in `language` (Greek unless said), at that language's speed, or stops it when `key` is already
 * being read. A different key's speech is cancelled first. `onFail` is called if the phone's engine reports it cannot
 * speak it (after the call returned 'speaking'). Only Greek is refused for want of a voice: the help is about Greek. */
export function speak(text: string, key: string, onFail?: () => void, language: SpeechLanguage = 'greek'): SpeakOutcome {
  const synth = synthesis();
  if (!synth || (language === 'greek' && hasGreekVoice() === false)) return 'no-voice';
  watchVisibility();
  if (playing?.key === key) {
    stopSpeaking();
    return 'stopped';
  }
  if (playing || synth.speaking || synth.pending) synth.cancel();
  utter(text, key, language, synth, () => {}, (error) => !isCancelError(error) && onFail?.());
  return 'speaking';
}

/** The key the read-aloud sequence (src/speech/readAloud.ts) speaks under. */
export const READ_KEY = 'read-aloud';

/** One part of a sequence read aloud, in `language`, even with no voice for it (Greek then goes to the phone's default
 * voice with its lang set). Unlike speak() it does not cancel what is playing and does not toggle: the sequence calls
 * stopSpeaking() once at its start, and the next part when `onEnd` says this one is over. `onError` gets the engine's
 * error name. Returns false when the phone cannot speak at all. */
export function speakPart(text: string, language: SpeechLanguage, onEnd: () => void, onError: (error: string) => void, slow = false): boolean {
  const synth = synthesis();
  if (!synth) return false;
  watchVisibility();
  utter(text, READ_KEY, language, synth, onEnd, onError, slow);
  return true;
}

/** The key a word said by a long press speaks under (the sheet's and the Words speakers have their own). */
const WORD_KEY = 'word-press';

/** Says one word in `language`, now: what is playing is cancelled first, and it never toggles (pressing the same word
 * again says it again). With no Greek voice it still speaks, to the phone's default voice with lang set, as a reading
 * does; the speaker buttons carry the help line. Returns false when the phone cannot speak at all. */
export function speakWord(text: string, language: SpeechLanguage, slow = false): boolean {
  const synth = synthesis();
  if (!synth) return false;
  watchVisibility();
  if (playing || synth.speaking || synth.pending) synth.cancel();
  utter(text, WORD_KEY, language, synth, () => {}, () => {}, slow);
  return true;
}

/** The one line shown when there is no Greek voice: where to get one. */
export function noVoiceHelp(): string {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
    ? 'No Greek voice on this phone: Settings > General management > Text-to-speech > install Greek'
    : 'No Greek voice on this device: install a Greek text-to-speech voice in its system settings';
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The key being read aloud right now, or null. */
export function useSpeakingKey(): string | null {
  return useSyncExternalStore(subscribe, () => playing?.key ?? null);
}

/** The phone's voices, re-read when it lists more (Android Chrome fills the list late). */
export function useVoices(): readonly SpeechSynthesisVoice[] {
  const synth = synthesis();
  const snapshot = useRef<readonly SpeechSynthesisVoice[]>([]);
  return useSyncExternalStore(
    (notify) => {
      synth?.addEventListener('voiceschanged', notify);
      return () => synth?.removeEventListener('voiceschanged', notify);
    },
    () => {
      const now = synth?.getVoices() ?? [];
      const before = snapshot.current;
      // a stable array while the list is the same, or useSyncExternalStore would render forever
      if (now.length !== before.length || now.some((v, i) => v !== before[i])) snapshot.current = [...now];
      return snapshot.current;
    },
  );
}
