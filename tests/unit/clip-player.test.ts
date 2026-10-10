// tests/unit/clip-player.test.ts — 'Me' stops at the word's end on a phone whose audio clock is coarse (mw-5r3p30.139: 'Levites' played back with
// 'mortal men'). Chrome on a phone can move an audio element's currentTime only as its timeupdate events come, about 0.25 s apart, so a watch that
// reads currentTime alone stops up to a quarter second late and the next words play. The fake here is honest about that: it plays in (fake-timer)
// time, shows the position only as of the last timeupdate, and keeps the true position at pause(), which is what he heard up to.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipPlayer } from '../../src/audio/clipPlayer';
import type { Clip } from '../../src/audio/clip';

const CLIP: Clip = { bytes: new ArrayBuffer(8), mime: 'audio/webm' };
const STEP = 0.25;

/** An audio element with a coarse clock: currentTime moves only at a timeupdate, every `step` seconds, the first `phase` seconds after the
 * sound starts. `seekMs` is how long the element takes to start the sound after play(): meanwhile it has fired 'waiting' and its clock
 * stands at the start; 'playing' comes when the sound starts. pause() keeps the true position of that moment in `pausedAt`. */
class CoarseAudio extends EventTarget {
  src = '';
  paused = true;
  pausedAt = -1;
  private readonly step: number;
  private readonly phase: number;
  private readonly seekMs: number;
  private position = 0;
  private shown = 0;
  private playedAt: number | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(step: number, phase: number, seekMs = 0) {
    super();
    this.step = step;
    this.phase = phase;
    this.seekMs = seekMs;
  }
  get currentTime(): number {
    return this.shown;
  }
  set currentTime(value: number) {
    this.position = value;
    this.shown = value;
  }
  private truePosition(): number {
    return this.playedAt === null ? this.position : this.position + (performance.now() - this.playedAt) / 1000;
  }
  /** The promise settles when the sound starts, as the element's does. */
  play(): Promise<void> {
    this.paused = false;
    return new Promise((resolve) => {
      const sound = () => {
        this.playedAt = performance.now();
        this.dispatchEvent(new Event('playing'));
        resolve();
        const update = () => {
          this.shown = this.truePosition();
          this.dispatchEvent(new Event('timeupdate'));
          this.timer = setTimeout(update, this.step * 1000);
        };
        this.timer = setTimeout(update, this.phase * 1000);
      };
      if (this.seekMs > 0) {
        this.dispatchEvent(new Event('waiting'));
        this.timer = setTimeout(sound, this.seekMs);
      } else {
        sound();
      }
    });
  }
  pause(): void {
    this.position = this.truePosition();
    this.shown = this.position;
    this.pausedAt = this.position;
    this.playedAt = null;
    this.paused = true;
    clearTimeout(this.timer);
  }
}

const playerOn = (audio: CoarseAudio): ClipPlayer => {
  const player = new ClipPlayer(() => undefined);
  player.attach(audio as unknown as HTMLAudioElement);
  player.setClip(CLIP);
  return player;
};

describe('ClipPlayer.toggle(id, from, to) on a phone with a coarse audio clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = () => 'blob:clip';
    URL.revokeObjectURL = () => undefined;
  });
  afterEach(() => vi.useRealTimers());

  it.each([0, 0.05, 0.125, 0.2, 0.25])('toggle(id, 1.0, 1.4) stops within 0.1 s of 1.4 s with timeupdate events 0.25 s apart, the first %s s in', async (phase) => {
    const audio = new CoarseAudio(STEP, phase);
    const player = playerOn(audio);
    player.toggle('me-1', 1.0, 1.4);
    expect(player.playing()).toBe('me-1');
    expect(audio.currentTime).toBe(1.0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(audio.paused).toBe(true);
    // the whole word, and nothing of the next one
    expect(audio.pausedAt).toBeGreaterThanOrEqual(1.4);
    expect(audio.pausedAt).toBeLessThanOrEqual(1.5);
    expect(player.playing()).toBeNull();
  });

  it('counts the word from when the sound starts, not from the tap, when the seek takes a while', async () => {
    const audio = new CoarseAudio(STEP, 0.125, 300);
    const player = playerOn(audio);
    player.toggle('me-1', 1.0, 1.4);
    await vi.advanceTimersByTimeAsync(350);
    expect(audio.paused).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(audio.paused).toBe(true);
    expect(audio.pausedAt).toBeGreaterThanOrEqual(1.4);
    expect(audio.pausedAt).toBeLessThanOrEqual(1.5);
  });

  it('a second toggle of the same key stops it before the end, and the watch is gone', async () => {
    const audio = new CoarseAudio(STEP, 0);
    const player = playerOn(audio);
    player.toggle('me-1', 1.0, 1.4);
    await vi.advanceTimersByTimeAsync(100);
    player.toggle('me-1', 1.0, 1.4);
    expect(audio.paused).toBe(true);
    expect(audio.pausedAt).toBeCloseTo(1.1, 2);
    expect(player.playing()).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    expect(player.playing()).toBeNull();
  });

  it('plays all of the clip when no end is given', async () => {
    const audio = new CoarseAudio(STEP, 0);
    const player = playerOn(audio);
    player.toggle('all');
    await vi.advanceTimersByTimeAsync(5000);
    expect(audio.paused).toBe(false);
    expect(player.playing()).toBe('all');
  });
});
