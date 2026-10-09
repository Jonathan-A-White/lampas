// tests/e2e/fake-media.ts — a microphone and a sound card for the gate's Chromium, which has neither. A MediaRecorder keeps a clip of known size and content
// (silence as a WAV 8 kHz, 8 bit, mono: 44 header bytes and 8000 samples a second, so Chromium can decode what the app keeps and plays), and playing is recorded
// rather than heard: window.played lists the src of each play(); window.plays lists {src, from} (currentTime when play() was called) and window.pauses the
// currentTime at each pause(). While a play() is on, currentTime moves on by the clock (as fast as real time), the way a sound card would move it, until pause()
// or the end of the clip, so a spec can watch an element stop where the app told it to.
import type { Page } from '@playwright/test';

export interface FakeWindow {
  played: string[];
  plays: { src: string; from: number }[];
  pauses: number[];
}

export async function fakeMedia(page: Page, seconds = 0.2): Promise<void> {
  await page.addInitScript((length: number) => {
    const samples = Math.round(8000 * length);
    const wav = new Uint8Array(44 + samples);
    const view = new DataView(wav.buffer);
    const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
    text(0, 'RIFF');
    view.setUint32(4, 36 + samples, true);
    text(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 8000, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    text(36, 'data');
    view.setUint32(40, samples, true);
    wav.fill(128, 44);
    const stream = { getTracks: () => [{ stop() {} }] };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    class FakeMediaRecorder {
      static isTypeSupported = (mime: string) => mime === 'audio/webm;codecs=opus';
      mimeType = 'audio/webm;codecs=opus';
      state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob([wav], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
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
