// src/speech/greek.ts — the phone's own voice reading aloud (Web Speech), no server: modern Greek (el-GR) first, and any
// language in src/speech/languages.ts at its own speed.
// Everything is spoken by bsv-kit/speech (mw-m7v5kc.3): the sentence queue, Pause / Resume / Restart / Stop, the language and voice
// of each sentence from its letters, a page that hides pausing it. This file is what the app adds: his speed for a language and the
// voice he picked in Settings (the package has neither), the help line for a language the phone has no voice for, and the words
// said alone. speak() is called straight from the tap handler (docs/pwa-best-practices.md section 12: a speak() that leaves the
// tap loses user activation on Android Chrome), so it never waits: the voice list is loaded ahead by warmVoices(), and a phone that
// has not listed its voices yet is still asked to speak with the language alone and picks its own voice.
import { useRef, useSyncExternalStore } from 'react';
import {
  getSpeech,
  isSpeaking,
  languageOf,
  pause as pauseEngine,
  preferredVoice,
  sentencesOf,
  speak as engineSpeak,
  speechText,
  stop as stopEngine,
  subscribe as subscribeEngine,
} from 'bsv-kit/speech';
import { useSpeech } from 'bsv-kit/speech/react';
import { DEFAULT_RATE, DEFAULT_RATES, HEBREW_LANG, LANGUAGES, normaliseRate, type SettableLanguage, type SpeechLanguage, type SpeechRates } from './languages';
import { DEFAULT_PRONUNCIATION, pronunciationOf, type GreekPronunciation, type Pronunciation } from './pronunciation';

/** how long warmVoices() waits for the phone to list its voices */
const VOICES_WAIT_MS = 1500;

/** 'speaking': asked of the phone; 'stopped': it was this very text playing and is now stopped; 'no-voice': nothing spoken */
export type SpeakOutcome = 'speaking' | 'stopped' | 'no-voice';

// What he chose in Settings (src/speech/settingsSync.ts hands it over; speak() cannot wait for a database read).
let pronunciation: GreekPronunciation = DEFAULT_PRONUNCIATION;
const chosenVoices: Record<SettableLanguage, string | null> = { english: null, greek: null };
const rates: SpeechRates = { ...DEFAULT_RATES };

/** The language tag of the Greek being spoken (the pronunciation's), such as 'el-GR'. */
export const greekLang = (): string => pronunciationOf(pronunciation).lang;

/** The language tag put on an utterance in `language`. */
const langOf = (language: SpeechLanguage): string =>
  language === 'greek' ? greekLang() : language === 'hebrew' ? HEBREW_LANG : (LANGUAGES.find((l) => l.id === language)?.lang ?? 'en-US');

/** How fast `language` is spoken: his speed for it, or the normal one for a language with no speed of its own (Hebrew). */
const rateOf = (language: SpeechLanguage): number => (language === 'hebrew' ? DEFAULT_RATE : rates[language]);

/** The pronunciation he chose (its respell cuts a word into syllables). */
export const chosenPronunciation = (): Pronunciation => pronunciationOf(pronunciation);

export function setGreekPronunciation(next: GreekPronunciation): void {
  pronunciation = next;
}

/** The voiceURI of the voice he chose for `language`, or null for the phone's own pick. */
export function setVoice(language: SettableLanguage, voiceURI: string | null): void {
  chosenVoices[language] = voiceURI;
}

/** How fast `language` is spoken (1 is normal); every utterance in it carries this, whichever button asked. */
export function setSpeechRate(language: SettableLanguage, rate: number): void {
  rates[language] = normaliseRate(rate);
}

function synthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
    ? window.speechSynthesis
    : null;
}

/** Whether a voice speaks a language: the tag's first part, 'el' for 'el-GR'. */
export const speaksLanguage = (v: SpeechSynthesisVoice, tag: string): boolean =>
  v.lang.split(/[-_]/)[0].toLowerCase() === tag.split(/[-_]/)[0].toLowerCase();

/** What identifies a voice for keeping: its voiceURI (its name where a browser leaves that empty). */
export const voiceKey = (v: SpeechSynthesisVoice): string => v.voiceURI || v.name;

const isLanguage = (language: SpeechLanguage) => (v: SpeechSynthesisVoice): boolean => speaksLanguage(v, langOf(language));

/** true: the phone lists a voice for `language`; false: it lists voices and none is that language's, or cannot speak at all;
 * 'unknown': its voice list is still empty (Android Chrome fills it late). */
export function hasVoice(language: SpeechLanguage): boolean | 'unknown' {
  const synth = synthesis();
  if (!synth) return false;
  const voices = synth.getVoices();
  if (voices.length === 0) return 'unknown';
  return voices.some(isLanguage(language));
}

export const hasGreekVoice = (): boolean | 'unknown' => hasVoice('greek');

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

/** The language a voice is chosen for, from the tag the speech package put on an utterance (it chooses the tag from the text's letters). */
function languageOfTag(tag: string): SpeechLanguage {
  const primary = tag.split(/[-_]/)[0].toLowerCase();
  return primary === 'el' ? 'greek' : primary === 'he' || primary === 'iw' ? 'hebrew' : 'english';
}

/** How much slower than his speed a word is said when it is being sounded out (src/speech/soundOut.ts). */
export const SLOW_FACTOR = 0.6;

// bsv-kit/speech queues the sentences, names each one's language from its letters and picks a voice for it. What it does not
// know are the choices of this app: his speed for the language and the voice he picked (Settings), and the slow speed of a word
// being sounded out. They are put on each utterance as it is handed to the phone, by wrapping speak() of the phone's synthesiser once.
let slow = false;
/** the language of the word being said alone, when it is known (a reading's sentences are told by their letters) */
let forced: string | null = null;
const wrapped = new WeakSet<object>();

function applyChoices(utterance: SpeechSynthesisUtterance, synth: SpeechSynthesis): void {
  if (forced) utterance.lang = forced;
  const language = languageOfTag(utterance.lang);
  // the Greek of the pronunciation he chose (the package names the Greek of its letters el-GR)
  if (language === 'greek') utterance.lang = greekLang();
  utterance.rate = slow ? rateOf(language) * SLOW_FACTOR : rateOf(language);
  const chosen = language === 'hebrew' ? null : chosenVoices[language];
  if (chosen === null) return;
  const voice = synth.getVoices().find((v) => voiceKey(v) === chosen && isLanguage(language)(v));
  if (voice) utterance.voice = voice;
}

function chooseVoices(synth: SpeechSynthesis): void {
  if (wrapped.has(synth)) return;
  wrapped.add(synth);
  const speakOn = synth.speak.bind(synth);
  synth.speak = (utterance: SpeechSynthesisUtterance) => {
    applyChoices(utterance, synth);
    speakOn(utterance);
  };
}

// A word, a speaker or a hold that speaks while a reading or a tutor's answer is under way INTERRUPTS it (docs/read-aloud.md 'The speaking bar'): the
// package's speech is paused where it is, so its bar offers Resume and the sentence reached is kept, and the word is said BESIDE it, straight to the
// phone's synthesiser. `beside` is that word (or speaker's text); it is over when its last sentence ends, is stopped, or is cut off.
interface Beside {
  key: string;
}
let beside: Beside | null = null;
/** counts the words said beside a reading, so the events of one cut off by the next do nothing */
let besideEpoch = 0;
const besideListeners = new Set<() => void>();

function setBeside(next: Beside | null): void {
  beside = next;
  besideListeners.forEach((l) => l());
}

function subscribeBeside(listener: () => void): () => void {
  besideListeners.add(listener);
  return () => besideListeners.delete(listener);
}

/** Ends the word said beside a reading, leaving the reading where it is (paused). */
function stopBeside(): void {
  if (!beside) return;
  besideEpoch++;
  setBeside(null);
  const synth = synthesis();
  // a reading that was resumed meanwhile has its sentences queued behind the word: pausing keeps its place, a cancel alone would lose it
  if (getSpeech().key === READ_KEY && getSpeech().status === 'playing') pauseEngine();
  else synth?.cancel();
}

/** Stops whatever is being said: a word said beside a reading (the reading stays paused where it was), else the reading or word the package holds. */
export function stopSpeaking(): void {
  if (beside) stopBeside();
  else stopEngine();
}

/** Stops only if `key` is what is being said (a button that goes away takes its speech with it). */
export function stopIfSpeaking(key: string): void {
  if (beside?.key === key) stopBeside();
  else if (isSpeaking(key)) stopEngine();
}

/** The key the read-aloud sequence (src/speech/readAloud.ts) speaks under: a verse, a chapter, a tutor's answer. Its speech has the bar. */
export const READ_KEY = 'read-aloud';

/** The key a word said by a long press speaks under (the sheet's and the Words speakers have their own). */
const WORD_KEY = 'word-press';

/** Asks the speech package to say `text` under `key`, in his speed and voice: it cancels what is speaking, cuts the text into sentences
 * (one per line break too) and reads each in the language of its letters. `slowly` is the speed of a word being sounded out. Returns false
 * when the phone cannot speak at all. */
export function speakText(text: string, key: string, options: { onEnd?: () => void; slowly?: boolean; language?: SpeechLanguage } = {}): boolean {
  const synth = synthesis();
  if (!synth) return false;
  chooseVoices(synth);
  slow = options.slowly ?? false;
  forced = options.language ? langOf(options.language) : null;
  // anything that is not a reading, said while a reading is under way (playing or paused), interrupts it instead of replacing it
  if (key !== READ_KEY && getSpeech().key === READ_KEY) return speakBeside(synth, text, key);
  if (beside) {
    besideEpoch++;
    setBeside(null);
  }
  engineSpeak(text, { key, lang: LANGUAGES[0].lang, onEnd: options.onEnd });
  return true;
}

/** Says `text` beside the reading the package holds: the reading is paused (or already is) and keeps its sentence, the text goes to the phone itself. */
function speakBeside(synth: SpeechSynthesis, text: string, key: string): boolean {
  const mine = ++besideEpoch;
  // pause() cancels the phone's queue; with the reading already paused only a word still being said needs cancelling
  if (getSpeech().status === 'playing') pauseEngine();
  else synth.cancel();
  const spoken = speechText(text);
  const sentences = sentencesOf(spoken);
  const parts = sentences.length > 0 ? sentences : [spoken];
  const voices = synth.getVoices();
  setBeside({ key });
  const over = () => {
    if (mine === besideEpoch) setBeside(null);
  };
  parts.forEach((part, i) => {
    const utterance = new SpeechSynthesisUtterance(part);
    // the language is told from the letters unless the caller named it; applyChoices (the wrapped speak) puts his speed and voice on it
    utterance.lang = forced ?? languageOf(part, { lang: LANGUAGES[0].lang });
    const voice = preferredVoice(voices, utterance.lang);
    if (voice) utterance.voice = voice;
    utterance.onerror = over;
    if (i === parts.length - 1) utterance.onend = over;
    synth.speak(utterance);
  });
  return true;
}

/** Reads `text` aloud in `language` (Greek unless said), at that language's speed, or stops it when `key` is already
 * being read. A different key's speech is cancelled first. Only Greek and Hebrew are refused for want of a voice: the help is about
 * them, and the phone's default voice would read either one as English. */
export function speak(text: string, key: string, language: SpeechLanguage = 'greek'): SpeakOutcome {
  const synth = synthesis();
  if (!synth || ((language === 'greek' || language === 'hebrew') && hasVoice(language) === false)) return 'no-voice';
  if (beside?.key === key || isSpeaking(key)) {
    stopIfSpeaking(key);
    return 'stopped';
  }
  return speakText(text, key, { language }) ? 'speaking' : 'no-voice';
}

/** Says one word in `language`, now: what is playing is cancelled first, and it never toggles (pressing the same word
 * again says it again). With no Greek voice it still speaks, to the phone's default voice with lang set, as a reading
 * does; the speaker buttons carry the help line. Returns false when the phone cannot speak at all. */
export function speakWord(text: string, language: SpeechLanguage, slowly = false): boolean {
  return speakText(text, WORD_KEY, { slowly, language });
}

/** Whether the speech now is a single word or speaker (not a reading): it has no bar. */
export const isWordSpeech = (key: string | null): boolean => key !== null && key !== READ_KEY;

// A page that goes to the background has its speech paused by the package. A reading waits for his Resume on the bar; a word or a speaker
// has no bar, and it would come back mid-sentence: it is ended instead.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    if (beside) stopBeside();
    else if (isWordSpeech(getSpeech().key)) stopEngine();
  });
}

/** Calls `done` once, when the word said by speakWord() is over (it ended, failed or was cut off); returns what takes the watch back. */
export function watchWordEnd(done: () => void): () => void {
  const check = () => {
    if (beside?.key !== WORD_KEY && getSpeech().key !== WORD_KEY) {
      off();
      done();
    }
  };
  const offEngine = subscribeEngine(check);
  besideListeners.add(check);
  const off = () => {
    offEngine();
    besideListeners.delete(check);
  };
  return off;
}

/** The one line shown when there is no voice for `language`: for Greek, where to get one. */
export function noVoiceHelp(language: SpeechLanguage = 'greek'): string {
  if (language === 'hebrew') return 'No Hebrew voice on this phone';
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
    ? 'No Greek voice on this phone: Settings > General management > Text-to-speech > install Greek'
    : 'No Greek voice on this device: install a Greek text-to-speech voice in its system settings';
}

/** The key being read aloud right now, or null. */
export function useSpeakingKey(): string | null {
  const speech = useSpeech();
  const aside = useSyncExternalStore(subscribeBeside, () => beside?.key ?? null, () => null);
  return aside ?? (speech.status === 'idle' ? null : speech.key);
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
