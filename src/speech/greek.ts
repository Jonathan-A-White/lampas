// src/speech/greek.ts — modern Greek read aloud by the phone's own voice (Web Speech, el-GR), no server.
// speak() is called straight from the tap handler (docs/pwa-best-practices.md section 12: a speak() that leaves the
// tap loses user activation on Android Chrome), so it never waits: the voice list is loaded ahead by warmVoices(),
// and a phone that has not listed its voices yet is still asked to speak with lang 'el-GR' and picks its own.
import { useRef, useSyncExternalStore } from 'react';
import { DEFAULT_PRONUNCIATION, pronunciationOf, type GreekPronunciation } from './pronunciation';

/** a little slower than the default, so each word is clear */
const RATE = 0.9;
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
let chosenVoice: string | null = null;

/** The language tag of the Greek being spoken (the pronunciation's), such as 'el-GR'. */
export const greekLang = (): string => pronunciationOf(pronunciation).lang;

export function setGreekPronunciation(next: GreekPronunciation): void {
  pronunciation = next;
}

/** The voiceURI of the voice he chose for Greek, or null for the phone's own pick. */
export function setGreekVoice(voiceURI: string | null): void {
  chosenVoice = voiceURI;
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

function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  const lang = greekLang().toLowerCase();
  const chosen = chosenVoice === null ? undefined : voices.find((v) => voiceKey(v) === chosenVoice && isGreek(v));
  return chosen ?? voices.find((v) => v.lang.replace('_', '-').toLowerCase() === lang) ?? voices.find(isGreek) ?? null;
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

/** Reads `text` aloud, or stops it when `key` is already being read. A different key's speech is cancelled first.
 * `onFail` is called if the phone's engine reports it cannot speak it (after the call returned 'speaking'). */
export function speak(text: string, key: string, onFail?: () => void): SpeakOutcome {
  const synth = synthesis();
  if (!synth || hasGreekVoice() === false) return 'no-voice';
  if (!watching) {
    watching = true;
    // a hidden page's speech is suspended and comes back mid-sentence: end it instead
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && stopSpeaking());
  }
  if (playing?.key === key) {
    stopSpeaking();
    return 'stopped';
  }
  if (playing || synth.speaking || synth.pending) synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = greekLang();
  utterance.rate = RATE;
  const voice = pickVoice(synth);
  if (voice) utterance.voice = voice;
  const ended = () => {
    // a cancelled utterance reports after the next one has started: only its own end clears the state
    if (playing?.utterance === utterance) setPlaying(null);
  };
  utterance.onend = ended;
  utterance.onerror = (e) => {
    ended();
    if (e.error !== 'canceled' && e.error !== 'interrupted') onFail?.();
  };
  setPlaying({ key, utterance });
  synth.resume();
  synth.speak(utterance);
  return 'speaking';
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
