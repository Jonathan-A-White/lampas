// src/speech/greek.ts — the phone's own voice reading aloud (Web Speech), no server: modern Greek (el-GR) first, and any
// language in src/speech/languages.ts at its own speed.
// Everything is spoken by voice-kit/speech (mw-m7v5kc.3): the sentence queue, Pause / Resume / Restart / Stop, the language and voice
// of each sentence from its letters, a page that hides pausing it. This file is what the app adds: his speed for a language and the
// voice he picked in Settings (the package has neither), the help line for a language the phone has no voice for, and the words
// said alone, and a one-letter word, which the Greek voice is handed doubled so it says the sound (mw-5r3p30.421), or, with no Greek voice, a clip of it (mw-5r3p30.347). speak() is called straight from the tap handler (docs/pwa-best-practices.md section 12: a speak() that leaves the
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
} from 'voice-kit/speech';
import { useSpeech } from 'voice-kit/speech/react';
import { ClipPlayer } from '../audio/clipPlayer';
import { isElided, joinElidedLetters, withoutElision } from './elision';
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

// voice-kit/speech queues the sentences, names each one's language from its letters and picks a voice for it. What it does not
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
    // the package sets onerror before it hands the utterance over; a browser that wants a tap first refuses with 'not-allowed' (mw-5r3p30.366)
    const prior = utterance.onerror;
    utterance.onerror = function (this: SpeechSynthesisUtterance, event: SpeechSynthesisErrorEvent) {
      if (event.error === 'not-allowed') refusedListeners.forEach((l) => l());
      prior?.call(this, event);
    };
    speakOn(utterance);
  };
}

const refusedListeners = new Set<() => void>();

/** Calls `listener` when the browser refuses to speak because nothing has been tapped yet (an utterance ends in the error 'not-allowed'); returns the unsubscribe. */
export function onSpeechRefused(listener: () => void): () => void {
  refusedListeners.add(listener);
  return () => refusedListeners.delete(listener);
}

// A word, a speaker or a hold that speaks while a reading or a tutor's answer is under way INTERRUPTS it (docs/read-aloud.md 'The speaking bar'): the
// package's speech is paused where it is, so its bar offers Resume and the sentence reached is kept, and the word is said BESIDE it, straight to the
// phone's synthesiser. `beside` is that word (or speaker's text); it is over when its last sentence ends, is stopped, or is cut off. The clip of a one-letter
// word (playLoneLetter) is held here too, beside a reading or alone, so its speaker shows Stop, a second tap stops it and Tap to hear sees it end.
interface Beside {
  key: string;
  /** a reading was playing and this word paused it (it was not already paused): a Listen goes on by itself when the word is over */
  interrupted: boolean;
}
let beside: Beside | null = null;
/** counts the words said beside a reading, so the events of one cut off by the next do nothing */
let besideEpoch = 0;
const besideListeners = new Set<() => void>();

function setBeside(next: Beside | null): void {
  beside = next;
  besideListeners.forEach((l) => l());
}

export const besideNow = (): Beside | null => beside;

export function subscribeBeside(listener: () => void): () => void {
  besideListeners.add(listener);
  return () => besideListeners.delete(listener);
}

/** Ends the word said beside a reading, leaving the reading where it is (paused). */
function stopBeside(): void {
  if (!beside) return;
  besideEpoch++;
  setBeside(null);
  stopLetterClip();
  const synth = synthesis();
  // a reading that was resumed meanwhile has its sentences queued behind the word: pausing keeps its place, a cancel alone would lose it
  if (getSpeech().key === READ_KEY && getSpeech().status === 'playing') pauseEngine();
  else synth?.cancel();
}

/** Stops a word said beside a reading, and nothing else. */
export function stopWordSaid(): void {
  if (beside) stopBeside();
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
  // a one-letter word's clip gives way to whatever is said next
  stopLetterClip();
  slow = options.slowly ?? false;
  forced = options.language ? langOf(options.language) : null;
  // anything that is not a reading, said while a reading is under way (playing or paused), interrupts it instead of replacing it
  if (key !== READ_KEY && getSpeech().key === READ_KEY) return speakBeside(synth, text, key, options.onEnd);
  if (beside) {
    besideEpoch++;
    setBeside(null);
  }
  engineSpeak(text, { key, lang: LANGUAGES[0].lang, onEnd: options.onEnd });
  return true;
}

/** Says `text` beside the reading the package holds: the reading is paused (or already is) and keeps its sentence, the text goes to the phone itself.
 * `onEnd` is called when it ends by itself (not when it is stopped or fails); what it starts next takes the word's place beside the reading. */
function speakBeside(synth: SpeechSynthesis, text: string, key: string, onEnd?: () => void): boolean {
  const mine = ++besideEpoch;
  const interrupted = getSpeech().key === READ_KEY && getSpeech().status === 'playing';
  // pause() cancels the phone's queue; with the reading already paused only a word still being said needs cancelling
  if (getSpeech().status === 'playing') pauseEngine();
  else synth.cancel();
  const spoken = speechText(text);
  const sentences = sentencesOf(spoken);
  const parts = sentences.length > 0 ? sentences : [spoken];
  const voices = synth.getVoices();
  setBeside({ key, interrupted: interrupted || (beside?.interrupted ?? false) });
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
    if (i === parts.length - 1) {
      utterance.onend = () => {
        if (mine !== besideEpoch) return;
        onEnd?.();
        over();
      };
    }
    synth.speak(utterance);
  });
  return true;
}

/** Reads `text` aloud in `language` (Greek unless said), at that language's speed, or stops it when `key` is already
 * being read. A different key's speech is cancelled first. Only Greek and Hebrew are refused for want of a voice: the help is about
 * them, and the phone's default voice would read either one as English. */
export function speak(text: string, key: string, language: SpeechLanguage = 'greek'): SpeakOutcome {
  const synth = synthesis();
  // a one-letter word with no Greek voice to say it is a clip, and needs no voice
  const lone = language === 'greek' ? loneLetterSpeech(text) : null;
  const clip = lone && 'clip' in lone ? lone.clip : null;
  // a phrase with such a word in it is played in turn: the text, the clip, the text after it
  const phrase = language === 'greek' && !lone ? clipPieces(text) : null;
  if (!clip && !phrase && (!synth || ((language === 'greek' || language === 'hebrew') && hasVoice(language) === false))) return 'no-voice';
  if (beside?.key === key || isSpeaking(key)) {
    stopIfSpeaking(key);
    return 'stopped';
  }
  if (clip) return playLoneLetter(clip, key) ? 'speaking' : 'no-voice';
  if (phrase) return playWordPieces(phrase, key, false) ? 'speaking' : 'no-voice';
  const said = lone && 'text' in lone ? { text: lone.text, language: 'greek' as const } : wordSpeech(text, language);
  return speakText(said.text, key, { language: said.language }) ? 'speaking' : 'no-voice';
}

/** Says one word in `language`, now: what is playing is cancelled first, and it never toggles (pressing the same word
 * again says it again). With no Greek voice it still speaks, to the phone's default voice with lang set, as a reading
 * does; the speaker buttons carry the help line. Returns false when the phone cannot speak at all. */
export function speakWord(text: string, language: SpeechLanguage, slowly = false): boolean {
  setWordText(text);
  const lone = language === 'greek' ? loneLetterSpeech(text) : null;
  if (lone && 'clip' in lone) return playLoneLetter(lone.clip, WORD_KEY);
  const phrase = language === 'greek' && !lone ? clipPieces(text) : null;
  if (phrase) return playWordPieces(phrase, WORD_KEY, slowly);
  const said = lone ? { text: lone.text, language: 'greek' as const } : wordSpeech(text, language);
  return speakText(said.text, WORD_KEY, { slowly, language: said.language });
}

/** Whether `text` is ONE Greek letter, whatever marks it carries (ὁ, Ὃ, ἡ, ᾧ), and with a mark of a dropped vowel after it (δ', which a voice names
 * 'Delta': mw-5r3p30.449). */
const isOneGreekLetter = (text: string): boolean => {
  const letters = [...withoutElision(text.trim()).normalize('NFD').replace(/\p{M}/gu, '')];
  return letters.length === 1 && /\p{Script=Greek}/u.test(letters[0]);
};

/** How a word of ONE Greek letter is said, or null for any other text (and for a letter neither form nor clip says as a sound: a consonant, which is named).
 * An elided word of one consonant (δ') has no form, and its clip plays on every phone (mw-5r3p30.449).
 * A Greek voice handed one letter says its name ('omicron'), whatever accent it carries: mw-5r3p30.226, .256 and .262 each handed a voice another form of
 * it, and his phone still said 'Omicron'. Handed the vowel doubled ('οο'), his phone's own Greek voice says the sound, which he chose on the listening trial
 * over every clip (mw-5r3p30.421): so the voice is handed the chosen pronunciation's loneLetterForm, `text`. On a phone that says it has no Greek voice the
 * scheme's clip of the sound plays instead, `clip` (mw-5r3p30.347). A phone that has not listed its voices yet is handed the form, as any word is. */
export function loneLetterSpeech(text: string): { text: string } | { clip: string } | null {
  if (!isOneGreekLetter(text)) return null;
  const form = chosenPronunciation().loneLetterForm(text.trim());
  if (form !== null && hasGreekVoice() !== false) return { text: form };
  const clip = loneLetterClip(text);
  return clip ? { clip } : null;
}

/** Greek `text` cut at each word of ONE letter that loneLetterSpeech says (1 John 1:1's Ὃ ἦν … ὃ ἀκηκόαμεν: Ὃ | ἦν … | ὃ | ἀκηκόαμεν), each such word
 * as its loneLetterSpeech (`lone`) and each stretch between them as it is: a voice handed the word inside a sentence names it as it does the word alone
 * (mw-5r3p30.448). A word with no sound of its own (an elided δ') stays in its stretch, joined to the word after it, unless it ends the stretch: then it is
 * its clip, on every phone (mw-5r3p30.657). */
export function loneLetterCuts(text: string): ({ text: string; lone: boolean } | { clip: string })[] {
  const cuts: ({ text: string; lone: boolean } | { clip: string })[] = [];
  let stretch: string[] = [];
  const flush = () => {
    // an elided δ' that ends its stretch (the end of a run, or a one-letter word comes next) has no word after it to be joined to (joinElidedLetters), and
    // a voice handed it on a line of its own names the letter: it plays its clip, the sound, in its place (mw-5r3p30.657)
    const last = (stretch[stretch.length - 1] ?? '').replace(/[^\p{L}\p{M}'’ʼ᾽᾿]+$/u, '');
    const ended = isElided(last) ? loneLetterSpeech(last) : null;
    const clip = ended && 'clip' in ended ? ended : null;
    if (clip) stretch.pop();
    if (stretch.length > 0) cuts.push({ text: stretch.join(' '), lone: false });
    if (clip) cuts.push(clip);
    stretch = [];
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    // an elided δ' comes without its apostrophe (a koronis too, which is not punctuation): a consonant alone, it stays in its stretch
    const lone = loneLetterSpeech(withoutElision(word.replace(/^\p{P}+|\p{P}+$/gu, '')));
    if (!lone) {
      stretch.push(word);
      continue;
    }
    flush();
    cuts.push('clip' in lone ? lone : { text: lone.text, lone: true });
  }
  flush();
  return cuts;
}

/** The bundled clip of the sound of `text` when it is ONE Greek letter (ὁ, ἡ, ὦ, Ὃ), or null for any other text: the chosen pronunciation's, played when
 * the phone has no Greek voice to say the letter's loneLetterForm (loneLetterSpeech). */
export function loneLetterClip(text: string): string | null {
  return isOneGreekLetter(text) ? chosenPronunciation().loneLetterClip(text.trim()) : null;
}

// The one player of those clips, with an audio element of its own (made at the first, from a tap: a phone lets a page play sound once he has touched it).
let letterClips: ClipPlayer | null = null;
/** counts the clips played, each one's key in letterClips */
let clipCount = 0;
/** true while stopLetterClip stops one: it was cut off, not over by itself */
let clipCut = false;

function clipPlayer(): ClipPlayer | null {
  if (letterClips) return letterClips;
  if (typeof Audio === 'undefined') return null;
  const audio = new Audio();
  audio.preload = 'auto';
  const player = new ClipPlayer(() => undefined);
  player.attach(audio);
  audio.addEventListener('ended', player.ended);
  audio.addEventListener('error', player.ended);
  letterClips = player;
  return player;
}

/** Stops a one-letter word's clip, if one plays: it was cut off (a reading that played it waits at its verse). */
export function stopLetterClip(): void {
  if (!letterClips?.playing()) return;
  clipCut = true;
  letterClips.stop();
  clipCut = false;
}

/** Plays the clip at `url`, cutting off one that plays; `over` is called once when it is over: `cut` when something else stopped it, else it ended (or could not
 * play, which a reading passes over). False when the page cannot play sound at all. */
export function playLetterClip(url: string, over: (cut: boolean) => void): boolean {
  const player = clipPlayer();
  if (!player) return false;
  stopLetterClip();
  const key = `clip-${++clipCount}`;
  player.setClip(url);
  player.toggle(key);
  const off = player.subscribe(() => {
    if (player.playing() === key) return;
    off();
    over(clipCut);
  });
  return true;
}

/** Plays a one-letter word's clip under `key`, as a word said alone: a reading under way is paused (keeping its sentence) and a Listen goes on after it, as
 * after a word said beside it (speakBeside); whatever else speaks is stopped. `after` is called when the clip is over: `cut` when something else stopped it;
 * what it starts next takes the clip's place. */
function playLoneLetter(url: string, key: string, after?: (cut: boolean) => void): boolean {
  if (!clipPlayer()) return false;
  const mine = ++besideEpoch;
  const reading = getSpeech().key === READ_KEY;
  const interrupted = reading && getSpeech().status === 'playing';
  if (interrupted) pauseEngine();
  else if (reading) synthesis()?.cancel();
  else if (getSpeech().status !== 'idle') stopEngine();
  else synthesis()?.cancel();
  setBeside({ key, interrupted: interrupted || (beside?.interrupted ?? false) });
  return playLetterClip(url, (cut) => {
    if (mine !== besideEpoch) return;
    after?.(cut);
    if (mine === besideEpoch) setBeside(null);
  });
}

/** A stretch of speech: text for the voice, or the clip of a one-letter word. */
export type Piece = { text: string } | { clip: string };

/** Plays `pieces` in turn, then `play.done`: the one sequence of a reading's verse (readAloud.ts) and of a phrase said by a word speaker (playWordPieces).
 * `play.text` says a text and calls `next` when it ends by itself, `play.clip` plays a clip and calls `next` when it ends; either returns false when it could
 * not start: a text then ends the sequence (`play.failed`), a clip is passed over. `play.alive`, when given, is checked before each piece. */
export function playInTurn(
  pieces: Piece[],
  play: {
    text: (text: string, next: () => void) => boolean;
    clip: (url: string, next: () => void) => boolean;
    failed: () => void;
    done: () => void;
    alive?: () => boolean;
  },
): void {
  if (play.alive && !play.alive()) return;
  const [piece, ...rest] = pieces;
  if (!piece) return play.done();
  const next = () => playInTurn(rest, play);
  if ('text' in piece) {
    if (!play.text(piece.text, next)) play.failed();
    return;
  }
  if (!play.clip(piece.clip, next)) next();
}

/** `text` as pieces when a word of one letter in it plays a clip (a phone with no Greek voice), else null: each such word is its clip, and each stretch
 * between is what the voice is handed for a word (greekWordSpeech). */
function clipPieces(text: string): Piece[] | null {
  const cuts = loneLetterCuts(text);
  if (!cuts.some((cut) => 'clip' in cut)) return null;
  return cuts.map((cut) => ('clip' in cut ? cut : { text: cut.lone ? cut.text : greekWordSpeech(cut.text).text }));
}

/** Says `pieces` as a word said alone under `key`: the voice for a text, the clip for a one-letter word, one after the other. False when the first text cannot
 * be said (the phone cannot speak at all). */
function playWordPieces(pieces: Piece[], key: string, slowly: boolean): boolean {
  let started = true;
  playInTurn(pieces, {
    text: (text, next) => speakText(text, key, { onEnd: next, slowly, language: 'greek' }),
    clip: (url, next) => playLoneLetter(url, key, (cut) => !cut && next()),
    failed: () => {
      started = false;
    },
    done: () => {},
  });
  return started;
}

/** What the Greek voice is handed for Greek text that is not one letter: the chosen pronunciation's voiceForm, so the voice says what the respelling
 * writes (mw-5r3p30.264: a Modern Greek voice keeps the nasal the respelling shows). The rule is the scheme's, never written here. A word of one consonant and a
 * mark of a dropped vowel (δ') is joined to the word after it first, or the voice names the letter (mw-5r3p30.654). */
export const greekVoiceForm = (text: string): string => chosenPronunciation().voiceForm(joinElidedLetters(text));

/** What is handed to the voice for a Greek word held alone (mw-5r3p30.226, .264, .357), always to the Greek voice: a capital letter is read by its name
 * ('capital ...'), so the word goes in lower case, in the scheme's wordForm (Modern Greek: monotonic marks and '!', so a final stress is not heard first),
 * or its voiceForm when it has none. A word of ONE vowel never comes here: it is its loneLetterForm or a clip (loneLetterSpeech). */
export function greekWordSpeech(text: string): { text: string; language: SpeechLanguage } {
  const scheme = chosenPronunciation();
  const word = text.toLowerCase();
  return { text: scheme.wordForm ? scheme.wordForm(word) : scheme.voiceForm(word), language: 'greek' };
}

/** What Settings > Reading voices' Test says, one after the other (mw-5r3p30.357): a word stressed on its last syllable, then one stressed before it, so he
 * hears whether his Greek voice puts the stress where the respelling does. */
export const VOICE_TEST_WORDS: readonly string[] = ['πατήρ', 'ἀγάπη'];

/** The key the Test of the Greek voice speaks under. */
export const VOICE_TEST_KEY = 'voice-test';

/** Says VOICE_TEST_WORDS in the Greek voice he chose (or the phone's pick), each as Tap to hear says a word; a second tap while it speaks stops it. */
export function testGreekVoice(): SpeakOutcome {
  const synth = synthesis();
  if (!synth || hasVoice('greek') === false) return 'no-voice';
  if (beside?.key === VOICE_TEST_KEY || isSpeaking(VOICE_TEST_KEY)) {
    stopIfSpeaking(VOICE_TEST_KEY);
    return 'stopped';
  }
  // a line each: the speech package says each line as an utterance of its own
  const text = VOICE_TEST_WORDS.map((w) => greekWordSpeech(w).text).join('\n');
  return speakText(text, VOICE_TEST_KEY, { language: 'greek' }) ? 'speaking' : 'no-voice';
}

/** The voice an utterance in `language` is given among `voices`: the one he chose (`chosen`, a voiceKey) while the phone lists it, else the phone's own
 * pick for the language (voice-kit's preferredVoice: the exact tag, then the same language); undefined when the phone lists none for it. */
export function voiceInUse(voices: readonly SpeechSynthesisVoice[], language: SpeechLanguage, chosen: string | null): SpeechSynthesisVoice | undefined {
  const own = chosen === null ? undefined : voices.find((v) => voiceKey(v) === chosen && isLanguage(language)(v));
  return own ?? preferredVoice([...voices], langOf(language));
}

/** Says a LETTER now, as the chosen pronunciation names one (a teach tile's letter, where the letter is the thing shown with its name): its letterForm
 * (Modern Greek's is the letter in lower case, which a Greek voice names), to the Greek voice, never turned into a sound. A word of one letter is not this:
 * it goes through speakWord, which says its sound. */
export function speakLetter(letter: string): boolean {
  setWordText(letter);
  return speakText(chosenPronunciation().letterForm(letter), WORD_KEY, { language: 'greek' });
}

/** Says the SOUND of a letter or pair asked about by ear (a sound question's 'Tap to hear a letter, then tap it'; the question offers no other letter of
 * its sound, so the sound alone names the answer): a letter the scheme has a loneLetterForm for (Modern Greek's vowels) is said as a one-letter word is,
 * 'οο' for ο (speakWord; mw-5r3p30.421); a consonant, which no form makes the voice say alone as a sound, and a pair (ου, which a voice reads as its sound)
 * go as speakLetter hands them, so a consonant is still named ('vita' for β). */
export function speakSound(text: string): boolean {
  return isOneGreekLetter(text) && chosenPronunciation().loneLetterForm(text.trim()) !== null ? speakWord(text, 'greek') : speakLetter(text);
}

const wordSpeech = (text: string, language: SpeechLanguage): { text: string; language: SpeechLanguage } =>
  language === 'greek' ? { text: greekPhraseSpeech(text), language } : { text, language };

/** What the Greek voice is handed for a word or a few (a word list's 'ἄγγελος, -ου, ὁ'): each word of one letter in it on a line of its own as its
 * loneLetterForm, and each stretch between as greekWordSpeech hands it ('ἄγγελος, -ου!' then 'οο'), so the voice never names the letter (mw-5r3p30.448). A
 * phone with no Greek voice, whose word would be a clip, never comes here: its phrase is played in turn (clipPieces, playWordPieces). */
function greekPhraseSpeech(text: string): string {
  const lines: string[] = [];
  for (const cut of loneLetterCuts(text)) {
    if ('clip' in cut) return greekWordSpeech(text).text;
    lines.push(cut.lone ? cut.text : greekWordSpeech(cut.text).text);
  }
  return lines.length < 2 ? greekWordSpeech(text).text : lines.join('\n');
}

/** Whether a word said by speakWord / speakLetter is being said now (the page's tap-to-hear bars toggle on it). */
export const isWordSaid = (): boolean => beside?.key === WORD_KEY || isSpeaking(WORD_KEY);

// The text last handed to speakWord / speakLetter, so a bar can tell its own word is being said, whoever started it (mw-5r3p30.324: the Quick test's answer
// says the word by itself, and its Tap to hear bar shows the stop square and stops it on a tap).
let wordText: string | null = null;
const wordListeners = new Set<() => void>();

function setWordText(text: string): void {
  if (wordText === text) return;
  wordText = text;
  wordListeners.forEach((l) => l());
}

/** Whether `text` is the word being said now by speakWord / speakLetter (a tap, a long press or a screen that says it by itself). */
export const isWordSaidOf = (text: string): boolean => wordText === text && isWordSaid();

function subscribeWordSaid(notify: () => void): () => void {
  const offEngine = subscribeEngine(notify);
  besideListeners.add(notify);
  wordListeners.add(notify);
  return () => {
    offEngine();
    besideListeners.delete(notify);
    wordListeners.delete(notify);
  };
}

/** isWordSaidOf(text), kept current: a tap-to-hear bar draws its stop square from it. */
export function useWordSaid(text: string): boolean {
  return useSyncExternalStore(subscribeWordSaid, () => isWordSaidOf(text), () => false);
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
