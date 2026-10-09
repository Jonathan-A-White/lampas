// tests/e2e/fake-media.ts — the microphone and the sound card for the gate's Chromium, which has neither. The microphone is
// bsv-kit's honest one (tests/support/honest-fakes.ts): a recorder that cuts a recorded clip into chunks in real time, so the clip
// the app keeps is as long as he held the bar. Its bytes are raw PCM labelled webm, which Chromium cannot decode: playing is
// recorded rather than heard, so no sound card is needed. window.played lists the src of each play(); window.plays lists {src, from}
// (currentTime when play() was called) and window.pauses the currentTime at each pause(). While a play() is on, currentTime moves
// on by the clock (as fast as real time), the way a sound card would move it, until pause() or the end of the clip (`seconds`),
// so a spec can watch an element stop where the app told it to.
import type { Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';

export interface FakeWindow {
  played: string[];
  plays: { src: string; from: number }[];
  pauses: number[];
}

export async function fakeMedia(page: Page, seconds = 0.2): Promise<void> {
  await honestMic(page);
  await page.addInitScript(() => {
    // The honest recorder's chunks are raw PCM (16 kHz, 16-bit, mono). The first chunk gets a WAV header that does not know the
    // length (0xFFFFFFFF, as a stream has it), so what the app keeps is a file Chromium can decode and play.
    const Honest = window.MediaRecorder;
    const header = () => {
      const h = new DataView(new ArrayBuffer(44));
      const text = (at: number, value: string) => [...value].forEach((c, i) => h.setUint8(at + i, c.charCodeAt(0)));
      text(0, 'RIFF');
      h.setUint32(4, 0xffffffff, true);
      text(8, 'WAVEfmt ');
      h.setUint32(16, 16, true);
      h.setUint16(20, 1, true);
      h.setUint16(22, 1, true);
      h.setUint32(24, 16000, true);
      h.setUint32(28, 32000, true);
      h.setUint16(32, 2, true);
      h.setUint16(34, 16, true);
      text(36, 'data');
      h.setUint32(40, 0xffffffff, true);
      return h.buffer;
    };
    class WavRecorder extends Honest {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        super(stream, options);
        let handler: ((e: BlobEvent) => void) | null = null;
        let first = true;
        Object.defineProperty(this, 'ondataavailable', {
          configurable: true,
          get: () =>
            handler &&
            ((event: BlobEvent) => {
              const data = first ? new Blob([header(), event.data], { type: event.data.type }) : event.data;
              first = false;
              handler?.call(this, Object.assign(Object.create(event), { data }));
            }),
          set: (fn) => {
            handler = fn;
          },
        });
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, writable: true, value: WavRecorder });
  });
  await page.addInitScript((length: number) => {
    const played: string[] = [];
    const plays: { src: string; from: number }[] = [];
    const pauses: number[] = [];
    Object.assign(window, { played, plays, pauses });
    const clocks = new WeakMap<HTMLMediaElement, number>();
    const stopClock = (el: HTMLMediaElement) => {
      const clock = clocks.get(el);
      if (clock !== undefined) clearInterval(clock);
      clocks.delete(el);
    };
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      played.push(this.src);
      plays.push({ src: this.src, from: this.currentTime });
      stopClock(this);
      const startedAt = performance.now();
      const from = this.currentTime;
      clocks.set(
        this,
        window.setInterval(() => {
          this.currentTime = from + (performance.now() - startedAt) / 1000;
          if (this.currentTime >= length) {
            stopClock(this);
            this.dispatchEvent(new Event('ended'));
          }
        }, 10),
      );
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      pauses.push(this.currentTime);
      stopClock(this);
    };
  }, seconds);
}
