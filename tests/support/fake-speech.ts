// tests/support/fake-speech.ts — the phone's speech engine for the feature steps: bsv-kit's honest fake
// (bsv-kit/testing/speech: speak() queues, an utterance takes its time, start/boundary/end fire in order, cancel() ends the
// one being spoken with error 'interrupted') on a clock the test moves by hand, so nothing waits for real time.
// finish() and finishAll() keep the API the steps were written with: they let the clock run to the end of the utterance
// being spoken (every event on the way fires) and, for finishAll(), of those queued behind it. advance(ms) moves the clock
// a stretch, for a step that says time passes. Not Android Chrome's sound (docs/pwa-best-practices.md section 12).
import { vi } from 'vitest';
import { ManualClock } from './manual-clock';
import { installSpeech, type FakeUtterance as HonestUtterance, type FakeVoice as HonestVoice, type SpeechFake } from 'bsv-kit/testing/speech';

export interface FakeVoice {
  lang: string;
  name: string;
  voiceURI?: string;
}

/** What the engine was asked to say: the utterance as it was when speak() was called, its voice the test's own object. */
export interface Spoken {
  text: string;
  lang: string;
  rate: number;
  voice: FakeVoice | null;
  /** the honest utterance itself, for a test that fires one of its events by hand */
  utterance: HonestUtterance;
}

export class FakeSynth {
  /** 'speak <text>' and 'cancel', in order */
  calls: string[] = [];
  spoken: Spoken[] = [];
  readonly clock = new ManualClock();
  /** the honest fake underneath: its log says when each utterance started and ended */
  readonly honest: SpeechFake;
  private readonly known: FakeVoice[];
  constructor(voices: FakeVoice[]) {
    this.known = voices;
    const honestVoices: HonestVoice[] = voices.map((v) => ({
      voiceURI: v.voiceURI ?? v.name,
      name: v.name,
      lang: v.lang,
      localService: true,
      default: false,
    }));
    // installed on a scratch object: the globals are put in place with vi.stubGlobal, which the steps' unstubAllGlobals undoes
    const host: Record<string, unknown> = {};
    this.honest = installSpeech(host, { clock: this.clock, voices: honestVoices });
    this.clock.advance(this.honest.options.voicesDelayMs);
    const synth = this.honest.synth;
    // a phone hands back the same voice objects each time it is asked; the honest fake copies them, and the app's voice list
    // (useVoices) would render for ever on copies
    const listed = synth.getVoices();
    synth.getVoices = () => [...listed];
    const speak = synth.speak.bind(synth);
    const cancel = synth.cancel.bind(synth);
    synth.speak = (u: HonestUtterance) => {
      this.calls.push(`speak ${u.text}`);
      this.spoken.push({ text: u.text, lang: u.lang, rate: u.rate, voice: this.voiceOf(u.voice), utterance: u });
      speak(u);
    };
    synth.cancel = () => {
      this.calls.push('cancel');
      cancel();
    };
  }
  private voiceOf(voice: HonestVoice | null): FakeVoice | null {
    if (!voice) return null;
    return this.known.find((v) => (v.voiceURI ?? v.name) === voice.voiceURI) ?? null;
  }
  get speaking(): boolean {
    return this.honest.synth.speaking;
  }
  get pending(): boolean {
    return this.honest.synth.pending;
  }
  /** Time passes: utterances go on, boundaries and ends fire as they fall due. */
  advance(ms: number): void {
    this.clock.advance(ms);
  }
  /** The utterance being spoken ends by itself, as the engine reports it (the next one queued behind it starts). */
  finish(): void {
    if (!this.honest.synth.speaking) throw new Error('nothing is being spoken');
    const ended = () => this.honest.log.filter((e) => e.outcome === 'ended').length;
    const before = ended();
    while (ended() === before) {
      if (!this.clock.step()) throw new Error('the utterance being spoken never ends');
    }
  }
  /** Ends utterances one after another until nothing more is spoken (a whole reading). */
  finishAll(limit = 5000): void {
    for (let i = 0; i < limit && this.honest.synth.speaking; i++) this.finish();
  }
  /** What has been asked of the engine since the last stop: the utterances after the last 'cancel'. */
  get since(): Spoken[] {
    const lastCancel = this.calls.lastIndexOf('cancel');
    const before = this.calls.slice(0, lastCancel + 1).filter((c) => c.startsWith('speak ')).length;
    return this.spoken.slice(before);
  }
}

export const GREEK_VOICE: FakeVoice = { lang: 'el-GR', name: 'Greek (Greece)' };
export const HEBREW_VOICE: FakeVoice = { lang: 'he-IL', name: 'Hebrew (Israel)' };
export const ENGLISH_VOICE: FakeVoice = { lang: 'en-US', name: 'English (US)' };

/** Puts a fake engine in place of the phone's. */
export function stubSpeech(voices: FakeVoice[]): FakeSynth {
  const synth = new FakeSynth(voices);
  vi.stubGlobal('speechSynthesis', synth.honest.synth);
  vi.stubGlobal('SpeechSynthesisUtterance', synth.honest.Utterance);
  return synth;
}
