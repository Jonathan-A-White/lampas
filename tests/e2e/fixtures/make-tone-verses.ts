// tests/e2e/fixtures/make-tone-verses.ts — makes the tone fixture of tests/e2e/recorded-voice-margin.spec.ts (mw-ar5k42b.2): tone-verses.mp3, a stand-in for one
// chapter of David's recording in which every 'verse' is steady tone and every quarter second of it (a STEP) has its own pitch, so a window of what the page emits
// names the second of the recording it came from; and tone-verses.json, its verse timings and the table of steps, measured from the MP3 as ffmpeg decodes it (the encoder's
// delay moves everything on by about 25 ms, and the timings must be where the sound IS in the file, as scripts/audio-timings/align.py's are).
// Between some verses there is digital silence, between others none (one verse's tone runs straight into the next's, as the narrator reads on in John 2:9).
// Run it with `node tests/e2e/fixtures/make-tone-verses.ts` (Node 22.18+, ffmpeg on the path). It writes the same two files again from the same layout.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RATE = 44100;
/** Every step of tone is this long, in seconds: a pitch of its own. */
const STEP = 0.25;
/** The tone's peak, of full scale. */
const PEAK = 0.5;
/** The lowest step's pitch and the rise from one step to the next, Hz. */
const LOWEST = 400;
const RISE = 25;
/** A tone that starts or ends at silence is ramped over this long, so the MP3 has no click to spread before it. */
const RAMP = 0.005;

/** The announcement, 'Audio Bible, Titus chapter N': tone from second 0, then a quarter second of silence before verse 1. */
const TITLE = { length: 1.75, gap: 0.25 };
/** Titus 2 and Titus 3 have 15 verses each: [verse, seconds of tone, seconds of silence after it (0: the next verse's tone follows with none)]. */
const VERSES: Array<[number, number, number]> = [
  [1, 1, 0.3],
  [2, 1, 0.3],
  [3, 1, 0.3],
  [4, 1, 0.5],
  [5, 3, 0.5], // one verse alone, real silence either side
  [6, 1, 0],
  [7, 3, 0], // one verse whose neighbours run into it and on from it with no silence
  [8, 1, 0],
  [9, 2, 0.3], // Titus 3:9-11, the section: verse 8 runs into its start
  [10, 2, 0],
  [11, 2, 0], // and it runs on into verse 12
  [12, 1, 0.3],
  [13, 1, 0.3],
  [14, 1, 0.3],
  [15, 2, 0.5],
];

interface Piece {
  /** seconds of the layout (before the encoder's delay) */
  start: number;
  end: number;
  /** how many steps of tone it holds */
  steps: number;
  rampIn: boolean;
  rampOut: boolean;
}

function layout(): { pieces: Piece[]; titleEnd: number; verses: Array<[number, number, number]>; length: number } {
  const pieces: Piece[] = [];
  let at = 0;
  const tone = (length: number, gapBefore: boolean, gapAfter: boolean): void => {
    pieces.push({ start: at, end: at + length, steps: Math.round(length / STEP), rampIn: gapBefore, rampOut: gapAfter });
    at += length;
  };
  tone(TITLE.length, true, true);
  const titleEnd = at;
  at += TITLE.gap;
  const verses: Array<[number, number, number]> = [];
  let silenceBefore = true;
  for (const [n, length, gap] of VERSES) {
    const start = at;
    tone(length, silenceBefore, gap > 0);
    verses.push([n, start, at]);
    at += gap;
    silenceBefore = gap > 0;
  }
  return { pieces, titleEnd, verses, length: at };
}

/** The PCM of the layout, and each step's [start, end, Hz] in layout seconds. */
function render(): { pcm: Float32Array; steps: Array<[number, number, number]>; titleEnd: number; verses: Array<[number, number, number]>; length: number } {
  const { pieces, titleEnd, verses, length } = layout();
  const pcm = new Float32Array(Math.round(length * RATE));
  const steps: Array<[number, number, number]> = [];
  let phase = 0;
  for (const piece of pieces) {
    for (let s = 0; s < piece.steps; s++) {
      const hz = LOWEST + RISE * steps.length;
      const from = piece.start + s * STEP;
      steps.push([from, from + STEP, hz]);
      const a = Math.round(from * RATE);
      const b = Math.round((from + STEP) * RATE);
      for (let i = a; i < b; i++) {
        const t = i / RATE;
        let gain = 1;
        if (piece.rampIn) gain = Math.min(gain, Math.max(0, (t - piece.start) / RAMP));
        if (piece.rampOut) gain = Math.min(gain, Math.max(0, (piece.end - t) / RAMP));
        pcm[i] = PEAK * (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, gain))) * Math.sin(phase);
        // the pitch changes with the phase carried on: no click at a step
        phase += (2 * Math.PI * hz) / RATE;
      }
    }
    // a tone after silence starts at phase 0 again
    if (piece.rampOut) phase = 0;
  }
  return { pcm, steps, titleEnd, verses, length };
}

function wav(pcm: Float32Array): Buffer {
  const out = Buffer.alloc(44 + pcm.length * 2);
  out.write('RIFF', 0, 'ascii');
  out.writeUInt32LE(36 + pcm.length * 2, 4);
  out.write('WAVE', 8, 'ascii');
  out.write('fmt ', 12, 'ascii');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(RATE, 24);
  out.writeUInt32LE(RATE * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36, 'ascii');
  out.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
  return out;
}

/** The first sample whose size is over a hundredth of the peak. */
function onset(samples: ArrayLike<number>): number {
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > PEAK / 100) return i;
  throw new Error('no sound');
}

const round = (s: number): number => Math.round(s * 1000) / 1000;

const here = join(process.cwd(), 'tests', 'e2e', 'fixtures');
const scratch = mkdtempSync(join(tmpdir(), 'tone-verses-'));
try {
  const made = render();
  const source = join(scratch, 'source.wav');
  writeFileSync(source, wav(made.pcm));
  const mp3 = join(here, 'tone-verses.mp3');
  // 44.1 kHz mono at 192 kbps CBR with no Xing/Info table, as the publisher's MP3s are (the element then seeks by the byte rate)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-c:a', 'libmp3lame', '-b:a', '192k', '-write_xing', '0', '-id3v2_version', '0', mp3]);
  const decoded = join(scratch, 'decoded.raw');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp3, '-f', 'f32le', '-ac', '1', '-ar', String(RATE), decoded]);
  const back = new Float32Array(new Uint8Array(readFileSync(decoded)).buffer);
  // the encoder's delay: the decoded file's first sound against the layout's
  const delay = (onset(back) - onset(made.pcm)) / RATE;
  const move = (s: number): number => round(s + delay);
  const fixture = {
    made: 'node tests/e2e/fixtures/make-tone-verses.ts (mw-ar5k42b.2)',
    delay: round(delay),
    duration: round(back.length / RATE),
    step: STEP,
    peak: PEAK,
    rise: RISE,
    /** where the announcement's tone is: from second 0 */
    title: [0, move(made.titleEnd)],
    verses: made.verses.map(([n, start, end]) => [n, move(start), move(end)]),
    steps: made.steps.map(([start, end, hz]) => [move(start), move(end), hz]),
  };
  writeFileSync(join(here, 'tone-verses.json'), `${JSON.stringify(fixture, null, 1)}\n`);
  console.log(`tone-verses.mp3: ${fixture.duration} s, ${fixture.steps.length} steps, encoder delay ${fixture.delay} s`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
