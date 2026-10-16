// tests/unit/voice-span.test.ts — where his voice is in a clip he recorded (mw-5r3p30.396): 'Play my reading' starts a little before his first word and
// stops a little after his last, so he does not wait through the silence before he spoke. With the scorer's times for his first and last words they say
// where; without them the phone measures the clip's level itself (a Web Audio decode, behind decodeSeam: jsdom has no Web Audio, so the decode here hands
// back samples made in the test). The clip that is kept, and sent, stays whole.
import { afterEach, describe, expect, it } from 'vitest';
import type { Clip } from '../../src/audio/clip';
import { decodeSeam, heardSpan, speechTimesOf, voiceSpan, type Decoded } from '../../src/audio/voiceSpan';

const RATE = 16_000;
const realDecode = decodeSeam.decode;
afterEach(() => {
  decodeSeam.decode = realDecode;
});

/** `silence` seconds of nothing, then `tone` seconds of a 220 Hz tone at `level`, then `tail` seconds of nothing. */
function samples(silence: number, tone: number, tail = 0, level = 0.5): Decoded {
  const out = new Float32Array(Math.round((silence + tone + tail) * RATE));
  const from = Math.round(silence * RATE);
  const to = Math.round((silence + tone) * RATE);
  for (let i = from; i < to; i++) out[i] = level * Math.sin((2 * Math.PI * 220 * i) / RATE);
  return { samples: out, sampleRate: RATE };
}

const clip = (): Clip => ({ bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer, mime: 'audio/webm' });

describe('heardSpan: the first and last 20 ms frames above the silence threshold', () => {
  it('finds a voice that starts after 2 s of silence', () => {
    const heard = heardSpan(samples(2, 1, 1.5));
    expect(heard?.start).toBeCloseTo(2, 2);
    expect(heard?.end).toBeCloseTo(3, 1);
    expect(heard?.duration).toBeCloseTo(4.5, 2);
  });

  it('hears nothing in a clip that is silent all through', () => {
    expect(heardSpan(samples(3, 0))).toBeUndefined();
  });

  it('hears nothing in a clip whose loudest is under the floor (a hum, not a voice)', () => {
    expect(heardSpan(samples(1, 2, 0, 0.005))).toBeUndefined();
  });
});

describe('voiceSpan(clip, times): where Play my reading starts and stops', () => {
  it('with no times, starts 0.2 s before the first frame above the threshold: 2 s of silence then a tone starts at about 1.8 s', async () => {
    decodeSeam.decode = async () => samples(2, 1);
    const span = await voiceSpan(clip());
    expect(span.from).toBeGreaterThan(1.75);
    expect(span.from).toBeLessThan(1.85);
  });

  it('with no times, stops 0.3 s after the last frame above the threshold when the tail is long, and plays to the end when it is not', async () => {
    decodeSeam.decode = async () => samples(0.5, 1, 2);
    const long = await voiceSpan(clip());
    expect(long.to).toBeGreaterThan(1.75);
    expect(long.to).toBeLessThan(1.85);
    decodeSeam.decode = async () => samples(0.5, 1, 0.1);
    expect((await voiceSpan(clip())).to).toBeUndefined();
  });

  it('a voice from the first moment starts at 0, not before', async () => {
    decodeSeam.decode = async () => samples(0.05, 1);
    expect((await voiceSpan(clip())).from).toBe(0);
  });

  it('with the scorer\'s times for his first and last words, starts 0.2 s before the first and stops 0.3 s after the last, without measuring', async () => {
    let decoded = 0;
    decodeSeam.decode = async () => {
      decoded++;
      return samples(0, 5);
    };
    expect(await voiceSpan(clip(), { start: 1.5, end: 4 })).toEqual({ from: 1.3, to: 4.3 });
    expect(await voiceSpan(clip(), { start: 0.1, end: 4 })).toEqual({ from: 0, to: 4.3 });
    expect(decoded).toBe(0);
  });

  it('with a time for only one end, measures the other', async () => {
    decodeSeam.decode = async () => samples(2, 1, 2);
    const span = await voiceSpan(clip(), { start: 1.5 });
    expect(span.from).toBeCloseTo(1.3, 5);
    expect(span.to).toBeGreaterThan(3.25);
    expect(span.to).toBeLessThan(3.35);
  });

  it('plays the whole clip when it cannot be decoded, or nothing in it is above the threshold', async () => {
    decodeSeam.decode = async () => {
      throw new Error('EncodingError');
    };
    expect(await voiceSpan(clip())).toEqual({ from: 0 });
    decodeSeam.decode = async () => null;
    expect(await voiceSpan(clip())).toEqual({ from: 0 });
    decodeSeam.decode = async () => samples(3, 0);
    expect(await voiceSpan(clip())).toEqual({ from: 0 });
  });

  it('leaves the kept clip whole: the decode is handed a copy (a real decodeAudioData detaches what it is given)', async () => {
    decodeSeam.decode = async (bytes) => {
      structuredClone(bytes, { transfer: [bytes] });
      return samples(2, 1);
    };
    const kept = clip();
    await voiceSpan(kept);
    expect(Array.from(new Uint8Array(kept.bytes))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('speechTimesOf(words, reached): the times of his first and last words, when the scorer gave them', () => {
  const word = (index: number, start?: number, end?: number) => ({ word: `w${index}`, index, chunks: [], tip: '', start, end });

  it('takes the start of the first word of the verse and the end of the last word he read', () => {
    expect(speechTimesOf([word(0, 1.5, 1.8), word(7, 3, 3.4), word(22, 9.1, 9.6)], 22)).toEqual({ start: 1.5, end: 9.6 });
  });

  it('gives no time for an end whose word was not timed: a flagged word in the middle says nothing of where he started', () => {
    expect(speechTimesOf([word(7, 3, 3.4)], 22)).toEqual({});
    expect(speechTimesOf([word(0, 1.5, 1.8), word(22)], 22)).toEqual({ start: 1.5 });
    expect(speechTimesOf([word(0, 1.5, 1.8)], undefined)).toEqual({ start: 1.5 });
  });
});
