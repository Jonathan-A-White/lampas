// src/audio/clipPlayer.ts — plays the clip he recorded from one hidden audio element: all of it ('Play my reading') or one stretch of it ('Me' beside a flagged
// word: from the scorer's start to its end, seconds in the recording). One thing plays at a time; `playing` is the key of what plays now, or null. It is
// a plain object outside React's rendering (ReadCheck.tsx holds one in state and its buttons listen with usePlaying), because it keeps the audio element, its
// object URL and the frame that watches the clock, none of which are for rendering.
import { useSyncExternalStore } from 'react';
import { blobOf, type Clip } from './clip';

export class ClipPlayer {
  private audio: HTMLAudioElement | null = null;
  private clip: Clip | undefined;
  private url: string | undefined;
  private urlOf: Clip | undefined;
  private frame = 0;
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
  /** the ref callback of the audio element */
  readonly attach = (audio: HTMLAudioElement | null): void => {
    this.audio = audio;
  };
  /** the clip behind the buttons now (a new reading of the verse is a new clip, and a new source) */
  setClip(clip: Clip | undefined): void {
    this.clip = clip;
  }
  /** the audio element ended, or failed, on its own */
  readonly ended = (): void => {
    cancelAnimationFrame(this.frame);
    this.set(null);
  };

  private set(key: string | null): void {
    this.now = key;
    this.listeners.forEach((l) => l());
  }

  /** Plays from `from` to `to` (the whole clip with neither), or stops when `key` is what plays now. */
  toggle(key: string, from?: number, to?: number): void {
    const audio = this.audio;
    const clip = this.clip;
    if (!audio || !clip) return;
    cancelAnimationFrame(this.frame);
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
    audio.play().catch(() => this.set(null));
    if (to === undefined) return;
    // a word is a fraction of a second: the timeupdate event comes too late, so each frame looks at the clock
    const watch = () => {
      if (audio.currentTime >= to) {
        audio.pause();
        this.set(null);
      } else {
        this.frame = requestAnimationFrame(watch);
      }
    };
    this.frame = requestAnimationFrame(watch);
  }

  /** The screen is going: stop, and let the clip's URL go. */
  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.audio?.pause();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
    this.urlOf = undefined;
  }
}

/** What plays now on this player: the key given to toggle, or null. */
export const usePlaying = (player: ClipPlayer): string | null => useSyncExternalStore(player.subscribe, player.playing);
