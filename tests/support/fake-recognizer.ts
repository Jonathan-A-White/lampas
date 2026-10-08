// tests/support/fake-recognizer.ts — a SpeechRecognition the test drives by hand, the way a browser's would fire. Not
// Android Chrome (docs/pwa-best-practices.md section 12): it proves the app's sequencing, never how a phone hears.
import { vi } from 'vitest';

interface FakeResult {
  isFinal: boolean;
  0: { transcript: string };
  length: 1;
}

export function result(transcript: string, isFinal: boolean): FakeResult {
  return { isFinal, 0: { transcript }, length: 1 };
}

export class FakeRecognizer {
  static instances: FakeRecognizer[] = [];
  /** the recogniser a stop() ends by itself; set false to leave the end to the test (a recogniser slow to deliver) */
  static endsOnStop = true;
  lang = '';
  continuous = false;
  interimResults = false;
  processLocally?: boolean = false;
  startFn = vi.fn<(track?: unknown) => void>();
  stopFn = vi.fn(() => {
    if (FakeRecognizer.endsOnStop) this.onend?.();
  });
  abortFn = vi.fn(() => this.onend?.());
  onstart: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  onresult: ((event: { resultIndex: number; results: FakeResult[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeRecognizer.instances.push(this);
  }
  start(track?: unknown) {
    this.startFn(track);
  }
  stop() {
    this.stopFn();
  }
  abort() {
    this.abortFn();
  }
  /** the browser says the microphone is open */
  open() {
    this.onstart?.();
  }
  say(results: FakeResult[]) {
    this.onresult?.({ resultIndex: 0, results });
  }
  static last(): FakeRecognizer {
    const last = FakeRecognizer.instances[FakeRecognizer.instances.length - 1];
    if (!last) throw new Error('no recogniser was made');
    return last;
  }
}

/** Puts the fake where the browser keeps SpeechRecognition. */
export function stubRecognizer(): void {
  FakeRecognizer.instances = [];
  FakeRecognizer.endsOnStop = true;
  vi.stubGlobal('SpeechRecognition', FakeRecognizer);
}
