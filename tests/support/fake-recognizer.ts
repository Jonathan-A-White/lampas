// tests/support/fake-recognizer.ts — a SpeechRecognition the test drives by hand, the way a browser's would fire. Not
// Android Chrome (docs/pwa-best-practices.md section 12): it proves the app's sequencing, never how a phone hears. It can play
// Android Chrome's speech check (mw-5r3p30.426, after bsv-kit's listen.test AndroidRecognizer): with `android` set, an on-device
// start opens no microphone and waits for the check, which answers language-not-supported when the test calls answerChecks();
// a stop() before that answer does nothing and fires no end. `noSpeechFor` lists the languages ('' is the browser's own
// default) the phone's cloud service cannot do either: a cloud start in one of them waits for the same answer.
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
  /** Android Chrome: processLocally is offered but never honoured, and an on-device start is answered language-not-supported a moment later */
  static android = false;
  /** the languages ('' = the browser's default) a cloud start is answered language-not-supported in */
  static noSpeechFor: string[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  processLocally?: boolean = false;
  /** started, and waiting for the phone's check to answer: no microphone is open */
  checking = false;
  startFn = vi.fn<(track?: unknown) => void>();
  stopFn = vi.fn(() => {
    // Android: a recogniser still waiting for its check ignores stop() and never ends
    if (this.checking) return;
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
    const onDevice = FakeRecognizer.android && this.processLocally === true;
    if (onDevice || FakeRecognizer.noSpeechFor.includes(this.lang)) this.checking = true;
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
  /** The phone's check answers every start still waiting for it, one after the other: language-not-supported. */
  static answerChecks(): void {
    for (let waiting = FakeRecognizer.instances.find((r) => r.checking); waiting; waiting = FakeRecognizer.instances.find((r) => r.checking)) {
      waiting.checking = false;
      waiting.onerror?.({ error: 'language-not-supported' });
    }
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
  FakeRecognizer.android = false;
  FakeRecognizer.noSpeechFor = [];
  vi.stubGlobal('SpeechRecognition', FakeRecognizer);
}
