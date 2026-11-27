// tests/support/honest-fakes.ts — voice-kit's honest speech and microphone for a Playwright page (voice-kit/testing/speech and
// /mic): thin wrappers, so no spec writes a fake of its own. Speech takes the time Android Chrome takes (150 ms and 60 ms a
// word, start, a boundary a word, end; cancel() interrupts the one being spoken); the microphone hands out a stream that
// plays a recorded clip in real time, a MediaRecorder that cuts it into chunks and a SpeechRecognition that sends interim
// words as the clip plays; the wake word 'Hey Lampas' is the kit's fake too (voice-kit/testing/handsfree): voice-kit/wake's startWake hands itself to it, so no
// microphone is opened for the wake and the spec says the wake word (sayWake). A headless Chromium has neither a Greek voice nor a microphone; how a real phone sounds is only
// a phone check (docs/pwa-best-practices.md section 12).
import type { Page } from '@playwright/test';
import { speechInitScript, type SpeechScriptOptions } from 'voice-kit/testing/speech';
import { clips, micInitScript, type MicScriptOptions } from 'voice-kit/testing/mic';
import { wakeInitScript, type WakeFakeOptions } from 'voice-kit/testing/handsfree';

export { clips };

export interface Voice {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

/** The voices of a phone that speaks these languages, each named by its language. */
export const voicesFor = (...langs: string[]): Voice[] =>
  langs.map((lang, i) => ({ voiceURI: lang, name: lang, lang, localService: true, default: i === 0 }));

// A phone gives back the same voice objects every time it is asked; the honest fake hands out copies, and the app's voice
// list (useVoices) renders for ever on copies. Settled on the first non-empty list.
const STABLE_VOICES = `(() => {
  const synth = window.speechSynthesis;
  const asked = synth.getVoices.bind(synth);
  let listed = null;
  synth.getVoices = () => {
    const now = asked();
    if (now.length === 0) return now;
    listed = listed || now;
    return [...listed];
  };
})();`;

/** Speech on the page from the first script: voices for these languages (English and Greek by default). */
export async function honestSpeech(page: Page, options: SpeechScriptOptions & { langs?: string[] } = {}): Promise<void> {
  const { langs, ...rest } = options;
  const voices = rest.voices ?? voicesFor(...(langs ?? ['en-US', 'el-GR']));
  await page.addInitScript(speechInitScript({ ...rest, voices }));
  await page.addInitScript(STABLE_VOICES);
}

export interface SpokenNow {
  text: string;
  lang: string;
  rate: number;
  outcome: string;
}

interface Handles {
  __bsvKitTesting: {
    speech: { log: SpokenNow[]; synth: { speaking: boolean } };
    mic: { recognitions: unknown[]; recorders: unknown[] };
  };
}

/** Every speak() the page has made, in order, with how it went (queued, speaking, ended, interrupted or canceled). */
export const spoken = (page: Page): Promise<SpokenNow[]> =>
  page.evaluate(() =>
    (window as unknown as Handles).__bsvKitTesting.speech.log.map((e) => ({ text: e.text, lang: e.lang, rate: e.rate, outcome: e.outcome })),
  );

/** Whether the engine is speaking now. */
export const isSpeaking = (page: Page): Promise<boolean> => page.evaluate(() => (window as unknown as Handles).__bsvKitTesting.speech.synth.speaking);

/** A microphone on the page from the first script, hearing this clip (English by default). */
export async function honestMic(page: Page, options: MicScriptOptions = {}): Promise<void> {
  await page.addInitScript(micInitScript({ clip: clips.english, ...options }));
}

/**
 * Counts what the page's recogniser has heard, from the first script (after honestMic): each recogniser the app makes adds one to `interim` for a result of words so far and one to `final`
 * for the clip heard whole. A spec that holds a bar while the clip is heard waits on `recognised(page)` instead of a fixed time: a hold let go before the first word was heard is heard as nothing.
 */
export async function countRecognised(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Listen = { addEventListener(type: 'result', listener: (e: { results: ArrayLike<{ isFinal: boolean }> }) => void): void };
    const host = window as unknown as Record<string, (new () => Listen) | undefined> & { __recognised?: { interim: number; final: number } };
    const Base = host.SpeechRecognition;
    if (!Base) return;
    const seen = { interim: 0, final: 0 };
    host.__recognised = seen;
    class Counting extends Base {
      constructor() {
        super();
        this.addEventListener('result', (e) => {
          if (e.results[0]?.isFinal) seen.final += 1;
          else seen.interim += 1;
        });
      }
    }
    host.SpeechRecognition = Counting;
    host.webkitSpeechRecognition = Counting;
  });
}

/** What countRecognised has counted so far: results of words heard so far, and the clip heard whole. */
export const recognised = (page: Page): Promise<{ interim: number; final: number }> =>
  page.evaluate(() => (window as unknown as { __recognised?: { interim: number; final: number } }).__recognised ?? { interim: 0, final: 0 });

/** The wake word on the page from the first script: startWake hands itself to the kit's fake, which opens no microphone (Hands-free, mw-rl10piw.6). */
export async function honestWake(page: Page, options: WakeFakeOptions = {}): Promise<void> {
  await page.addInitScript(wakeInitScript(options));
}

interface WakeHandle {
  __bsvKitTesting: { wake: { say(): boolean; listening: boolean } };
}

/** He says 'Hey Lampas': true when a wake was listening and heard it. */
export const sayWake = (page: Page): Promise<boolean> => page.evaluate(() => (window as unknown as WakeHandle).__bsvKitTesting.wake.say());

/** Whether the wake word is being listened for now. */
export const wakeListening = (page: Page): Promise<boolean> => page.evaluate(() => (window as unknown as WakeHandle).__bsvKitTesting.wake.listening);
