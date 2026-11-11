// tests/support/fake-audio.ts — the phone's audio element for the jsdom steps (jsdom plays nothing): play() is recorded with the path of the
// src it was asked to play and resolves, as the sound starts, and 'playing' follows it; the sound ends when the test says (end(), which fires 'ended' as a phone does) and
// pause() stops it. Used where the app plays a bundled clip (a one-letter Greek word's sound, mw-5r3p30.347) and the recorded voice (mw-82lb97i.3): the element's
// time moves only when the test moves it (advanceTo, which fires 'timeupdate' every quarter second of the recording as a phone does), and fail() fires 'error'.
// Undo with vi.restoreAllMocks().
import { vi } from 'vitest';

export interface FakeAudio {
  /** the path of each src play() was called on, in order ('/sounds/modern/o.mp3') */
  played: string[];
  /** the whole src of each play(), in order ('https://...mp3') */
  sources: string[];
  /** the element's currentTime at each play(), in order */
  playedAt: number[];
  /** called at each play() with its path: a step that puts clips and the voice in one order counts what the voice was handed by then */
  onPlay: ((path: string) => void) | null;
  /** the element playing now, or null */
  playing(): HTMLMediaElement | null;
  /** the element play() was last called on, playing or paused, or null */
  last(): HTMLMediaElement | null;
  /** the clip playing now ends by itself */
  end(): void;
  /** the element playing now plays on to `second` of its recording ('timeupdate' every quarter second on the way) */
  advanceTo(second: number): void;
  /** the last element played fails to load or play ('error') */
  fail(): void;
}

const pathOf = (src: string): string => (src.startsWith('blob:') ? src : decodeURIComponent(new URL(src, 'http://localhost/').pathname));

/** A browser fires 'timeupdate' about four times a second. */
const TICK = 0.25;

export function stubAudio(): FakeAudio {
  let now: HTMLMediaElement | null = null;
  let lastPlayed: HTMLMediaElement | null = null;
  const fake: FakeAudio = {
    played: [],
    sources: [],
    playedAt: [],
    onPlay: null,
    playing: () => now,
    last: () => lastPlayed,
    end() {
      const el = now;
      now = null;
      el?.dispatchEvent(new Event('ended'));
    },
    advanceTo(second) {
      const el = now;
      if (!el) throw new Error('no audio element is playing');
      while (now === el && el.currentTime < second) {
        el.currentTime = Math.min(second, el.currentTime + TICK);
        el.dispatchEvent(new Event('timeupdate'));
      }
    },
    fail() {
      const el = lastPlayed;
      if (!el) throw new Error('no audio element was played');
      if (now === el) now = null;
      el.dispatchEvent(new Event('error'));
    },
  };
  const play = (el: HTMLMediaElement): Promise<void> => {
    const path = pathOf(el.src);
    fake.played.push(path);
    fake.sources.push(el.src);
    fake.playedAt.push(el.currentTime);
    now = el;
    lastPlayed = el;
    fake.onPlay?.(path);
    // a phone fires 'playing' once the sound has started
    queueMicrotask(() => {
      if (now === el) el.dispatchEvent(new Event('playing'));
    });
    return Promise.resolve();
  };
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    return play(this);
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    if (now === this) now = null;
  });
  return fake;
}
