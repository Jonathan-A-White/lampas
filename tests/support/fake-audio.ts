// tests/support/fake-audio.ts — the phone's audio element for the jsdom steps (jsdom plays nothing): play() is recorded with the path of the
// src it was asked to play and resolves, as the sound starts; the sound ends when the test says (end(), which fires 'ended' as a phone does) and
// pause() stops it. Used where the app plays a bundled clip (a one-letter Greek word's sound, mw-5r3p30.347). Undo with vi.restoreAllMocks().
import { vi } from 'vitest';

export interface FakeAudio {
  /** the path of each src play() was called on, in order ('/sounds/modern/o.mp3') */
  played: string[];
  /** called at each play() with its path: a step that puts clips and the voice in one order counts what the voice was handed by then */
  onPlay: ((path: string) => void) | null;
  /** the element playing now, or null */
  playing(): HTMLMediaElement | null;
  /** the clip playing now ends by itself */
  end(): void;
}

const pathOf = (src: string): string => (src.startsWith('blob:') ? src : decodeURIComponent(new URL(src, 'http://localhost/').pathname));

export function stubAudio(): FakeAudio {
  let now: HTMLMediaElement | null = null;
  const fake: FakeAudio = {
    played: [],
    onPlay: null,
    playing: () => now,
    end() {
      const el = now;
      now = null;
      el?.dispatchEvent(new Event('ended'));
    },
  };
  const play = (el: HTMLMediaElement): Promise<void> => {
    const path = pathOf(el.src);
    fake.played.push(path);
    now = el;
    fake.onPlay?.(path);
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
