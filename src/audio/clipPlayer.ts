// src/audio/clipPlayer.ts — plays the clip he recorded from one hidden audio element: all of it ('Play my reading') or one stretch of it ('Me' beside a flagged
// word: from the scorer's start to its end, seconds in the recording). One thing plays at a time; `playing` is the key of what plays now, or null. It is
// a plain object outside React's rendering (ReadCheck.tsx holds one in state and its buttons listen with usePlaying), because it keeps the audio element, its
// object URL and the timer that watches for the end of a word, none of which are for rendering. It also plays a clip the app ships, by its URL: the sound of a
// one-letter Greek word (src/speech/greek.ts, mw-5r3p30.347), from an element of its own.
//
// His reading from where his voice starts (mw-5r3p30.396): toggleVoice plays a recorded clip from just before his first word to just after his last
// (src/audio/voiceSpan.ts, by the scorer's times or the level the phone measures), so a silent lead-in is skipped; the clip itself is never cut. The span
// is measured once, when the clip is set, so a tap plays at once; a tap before the measure is done waits for it (a few milliseconds of decoding).
//
// The end of a word (mw-5r3p30.139): a word is a fraction of a second, and a phone can move the element's currentTime only as its timeupdate events come,
// about 0.25 s apart, so a watch that reads currentTime alone stops up to a quarter second late and the next words play ('Levites' came back with 'mortal
// men'). The watch therefore also counts our own clock from the moment the sound starts (the play() promise, the 'playing' and 'seeked' events) and stops at
// the later of the two positions; while the element waits for data or seeks ('waiting', 'seeking') only its own clock counts, so a stall never cuts a word short.
import { useSyncExternalStore } from 'react';
import { blobOf, type Clip } from './clip';
import { voiceSpan, type SpeechTimes, type VoiceSpan } from './voiceSpan';

/** How often the watch looks for the end of a word, in milliseconds. */
const TICK_MS = 15;

/** Where the clip was by the element's clock (`position`, seconds) and when by ours (`at`, performance.now()). */
interface Anchor {
  position: number;
  at: number;
}

/** Where his voice is in the clip set now: measured for this clip and these times, `span` once known. */
interface Measured {
  of: Clip;
  times: SpeechTimes;
  pending: Promise<VoiceSpan>;
  span?: VoiceSpan;
}

const sameTimes = (a: SpeechTimes, b: SpeechTimes): boolean => a.start === b.start && a.end === b.end;

export class ClipPlayer {
  private audio: HTMLAudioElement | null = null;
  private detach: (() => void) | null = null;
  private clip: Clip | string | undefined;
  private url: string | undefined;
  private urlOf: Clip | string | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private anchor: Anchor | null = null;
  private measured: Measured | undefined;
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
  /** the clip behind the buttons now (a new reading of the verse is a new clip, and a new source); a string is the URL of a clip the app ships.
   * A recorded clip is measured for where his voice is (toggleVoice), with the scorer's times for his first and last words when it gave them. */
  setClip(clip: Clip | string | undefined, times: SpeechTimes = {}): void {
    this.clip = clip;
    if (clip === undefined || typeof clip === 'string') {
      this.measured = undefined;
      return;
    }
    if (this.measured?.of === clip && sameTimes(this.measured.times, times)) return;
    const measured: Measured = { of: clip, times, pending: voiceSpan(clip, times) };
    void measured.pending.then((span) => {
      measured.span = span;
    });
    this.measured = measured;
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
      this.revoke();
      this.url = typeof clip === 'string' ? clip : URL.createObjectURL(blobOf(clip));
      this.urlOf = clip;
      audio.src = this.url;
    }
    audio.currentTime = from ?? 0;
    this.set(key);
    // an older browser's play() gives no promise
    const started = Promise.resolve(audio.play());
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

  /** Plays his recorded clip from just before his voice starts to just after it ends (the whole clip when that is not known), or stops when `key`
   * is what plays now. */
  toggleVoice(key: string): void {
    const measured = this.measured;
    if (this.now === key || !measured || measured.span) {
      this.toggle(key, measured?.span?.from, measured?.span?.to);
      return;
    }
    void measured.pending.then((span) => {
      if (this.measured === measured && this.now !== key) this.toggle(key, span.from, span.to);
    });
  }

  /** Stops what plays, if anything. */
  stop(): void {
    this.unwatch();
    if (this.now === null) return;
    this.audio?.pause();
    this.set(null);
  }

  /** Lets the object URL of a recorded clip go (a shipped clip's URL is not one). */
  private revoke(): void {
    if (this.url && typeof this.urlOf !== 'string') URL.revokeObjectURL(this.url);
  }

  /** The screen is going: stop, and let the clip's URL go. */
  dispose(): void {
    this.unwatch();
    this.audio?.pause();
    this.revoke();
    this.url = undefined;
    this.urlOf = undefined;
  }
}

/** What plays now on this player: the key given to toggle, or null. */
export const usePlaying = (player: ClipPlayer): string | null => useSyncExternalStore(player.subscribe, player.playing);
