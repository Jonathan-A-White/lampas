// src/audio/clipPlayer.ts — plays the clip he recorded from one hidden audio element: all of it ('Play my reading') or one stretch of it ('Me' beside a flagged
// word: from the scorer's start to its end, seconds in the recording). One thing plays at a time; `playing` is the key of what plays now, or null. It is
// a plain object outside React's rendering (ReadCheck.tsx holds one in state and its buttons listen with usePlaying), because it keeps the audio element, its
// object URL and the timer that watches for the end of a word, none of which are for rendering.
//
// The end of a word (mw-5r3p30.139): a word is a fraction of a second, and a phone can move the element's currentTime only as its timeupdate events come,
// about 0.25 s apart, so a watch that reads currentTime alone stops up to a quarter second late and the next words play ('Levites' came back with 'mortal
// men'). The watch therefore also counts our own clock from the moment the sound starts (the play() promise, the 'playing' and 'seeked' events) and stops at
// the later of the two positions; while the element waits for data or seeks ('waiting', 'seeking') only its own clock counts, so a stall never cuts a word short.
import { useSyncExternalStore } from 'react';
import { blobOf, type Clip } from './clip';

/** How often the watch looks for the end of a word, in milliseconds. */
const TICK_MS = 15;

/** Where the clip was by the element's clock (`position`, seconds) and when by ours (`at`, performance.now()). */
interface Anchor {
  position: number;
  at: number;
}

export class ClipPlayer {
  private audio: HTMLAudioElement | null = null;
  private detach: (() => void) | null = null;
  private clip: Clip | undefined;
  private url: string | undefined;
  private urlOf: Clip | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private anchor: Anchor | null = null;
  private now: string | null = null;
  private listeners = new Set<() => void>();
  /** called before a clip starts: whatever else speaks must stop while he hears himself */
  private readonly beforePlay: () => void;
  constructor(beforePlay: () => void) {
    this.beforePlay = beforePlay;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  readonly playing = (): string | null => this.now;
  /** the ref callback of the audio element: the element tells the watch when its sound moves and when it stands */
  readonly attach = (audio: HTMLAudioElement | null): void => {
    this.detach?.();
    this.detach = null;
    this.audio = audio;
    if (!audio) return;
    const moving = () => this.anchorAt(audio);
    const standing = () => {
      this.anchor = null;
    };
    audio.addEventListener('playing', moving);
    audio.addEventListener('seeked', moving);
    audio.addEventListener('waiting', standing);
    audio.addEventListener('seeking', standing);
    this.detach = () => {
      audio.removeEventListener('playing', moving);
      audio.removeEventListener('seeked', moving);
      audio.removeEventListener('waiting', standing);
      audio.removeEventListener('seeking', standing);
    };
  };
  /** the clip behind the buttons now (a new reading of the verse is a new clip, and a new source) */
  setClip(clip: Clip | undefined): void {
    this.clip = clip;
  }
  /** the audio element ended, or failed, on its own */
  readonly ended = (): void => {
    this.unwatch();
    this.set(null);
  };

  private set(key: string | null): void {
    this.now = key;
    this.listeners.forEach((l) => l());
  }

  /** The sound is moving from here, now: while a word is watched, our clock counts on from this point. */
  private anchorAt(audio: HTMLAudioElement): void {
    if (this.timer !== undefined) this.anchor = { position: audio.currentTime, at: performance.now() };
  }

  /** Where the clip is: the element's clock, or further on when ours says the sound has moved since the element last said. */
  private position(audio: HTMLAudioElement): number {
    const shown = audio.currentTime;
    return this.anchor ? Math.max(shown, this.anchor.position + (performance.now() - this.anchor.at) / 1000) : shown;
  }

  private unwatch(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.anchor = null;
  }

  /** Plays from `from` to `to` (the whole clip with neither), or stops when `key` is what plays now. */
  toggle(key: string, from?: number, to?: number): void {
    const audio = this.audio;
    const clip = this.clip;
    if (!audio || !clip) return;
    this.unwatch();
    if (this.now === key) {
      audio.pause();
      this.set(null);
      return;
    }
    this.beforePlay();
    if (!this.url || this.urlOf !== clip) {
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(blobOf(clip));
      this.urlOf = clip;
      audio.src = this.url;
    }
    audio.currentTime = from ?? 0;
    this.set(key);
    const started = audio.play();
    if (to === undefined) {
      started.catch(() => {
        if (this.now === key) this.set(null);
      });
      return;
    }
    // the promise settles when the sound starts: from here our clock counts
    started
      .then(() => this.anchorAt(audio))
      .catch(() => {
        if (this.now === key) this.set(null);
      });
    const watch = () => {
      if (this.position(audio) >= to) {
        this.unwatch();
        audio.pause();
        this.set(null);
      } else {
        this.timer = setTimeout(watch, TICK_MS);
      }
    };
    this.timer = setTimeout(watch, TICK_MS);
  }

  /** The screen is going: stop, and let the clip's URL go. */
  dispose(): void {
    this.unwatch();
    this.audio?.pause();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
    this.urlOf = undefined;
  }
}

/** What plays now on this player: the key given to toggle, or null. */
export const usePlaying = (player: ClipPlayer): string | null => useSyncExternalStore(player.subscribe, player.playing);
