// tests/support/fake-speech.ts — a speechSynthesis that records what it is asked and lets a test say when the
// utterance being spoken ends. Not Android Chrome (docs/pwa-best-practices.md section 12): it proves the app's
// sequencing, never how a voice sounds.
import { vi } from 'vitest';

export interface FakeVoice {
  lang: string;
  name: string;
  voiceURI?: string;
}

export class FakeUtterance {
  lang = '';
  rate = 1;
  voice: FakeVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

export class FakeSynth {
  /** 'speak <text>' and 'cancel', in order */
  calls: string[] = [];
  spoken: FakeUtterance[] = [];
  speaking = false;
  pending = false;
  private current: FakeUtterance | null = null;
  voices: FakeVoice[];
  constructor(voices: FakeVoice[]) {
    this.voices = voices;
  }
  getVoices = () => this.voices;
  addEventListener = () => {};
  removeEventListener = () => {};
  resume = () => {};
  speak = (u: FakeUtterance) => {
    this.calls.push(`speak ${u.text}`);
    this.spoken.push(u);
    this.current = u;
    this.speaking = true;
  };
  cancel = () => {
    this.calls.push('cancel');
    this.speaking = false;
    this.current = null;
  };
  /** The utterance being spoken ends by itself, as the engine reports it. */
  finish(): void {
    const u = this.current;
    if (!u) throw new Error('nothing is being spoken');
    this.current = null;
    this.speaking = false;
    u.onend?.();
  }
  /** Ends utterances one after another until nothing more is spoken (a whole reading). */
  finishAll(limit = 5000): void {
    for (let i = 0; i < limit && this.current; i++) this.finish();
  }
  /** What has been asked of the engine since the last stop: the utterances after the last 'cancel'. */
  get since(): FakeUtterance[] {
    const lastCancel = this.calls.lastIndexOf('cancel');
    const before = this.calls.slice(0, lastCancel + 1).filter((c) => c.startsWith('speak ')).length;
    return this.spoken.slice(before);
  }
}

export const GREEK_VOICE: FakeVoice = { lang: 'el-GR', name: 'Greek (Greece)' };
export const ENGLISH_VOICE: FakeVoice = { lang: 'en-US', name: 'English (US)' };

/** Puts a fake engine in place of the phone's. */
export function stubSpeech(voices: FakeVoice[]): FakeSynth {
  const synth = new FakeSynth(voices);
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
}
