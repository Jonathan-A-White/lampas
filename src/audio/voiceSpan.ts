// src/audio/voiceSpan.ts — where his voice is in a clip he recorded (mw-5r3p30.396), so 'Play my reading' starts where he starts speaking and he does not
// wait through the silence before his first word (nor a long one after his last). The clip itself is never cut: what is kept, sent to the mill and saved
// stays whole, and only where playback starts and stops moves. It is the one helper for playing back his own voice: ClipPlayer.toggleVoice uses it.
//
// With the scorer's times for his first and last words (a focus word may carry `start` and `end`; only flagged words do) they say where. Without them the
// phone measures the clip itself, nothing sent: a Web Audio decode, the level of each 20 ms frame, and the first and last frames above a silence threshold.
// The threshold is the larger of a floor and a share of the loudest frame (PROVISIONAL). A clip that cannot be decoded, or holds nothing above the
// threshold, plays whole.

/** Played before his first word, so its first sound is not clipped, in seconds. */
export const LEAD_IN_S = 0.2;
/** Played after his last word, so its last sound dies away, in seconds. */
export const TAIL_S = 0.3;
/** The frame the level is measured over, in seconds. */
export const FRAME_S = 0.02;
/** A frame at or under this level (RMS, full scale 1) is silence whatever else the clip holds (PROVISIONAL). */
export const FLOOR_LEVEL = 0.01;
/** A frame at or under this share of the loudest frame's level is silence (PROVISIONAL: 20 dB under his voice). */
export const PEAK_SHARE = 0.1;
/** The rate the clip is decoded at: enough to hear a voice's level, small on a phone. */
const DECODE_RATE = 16_000;

/** Where to play: from `from` seconds to `to` (the clip's own end when absent). */
export interface VoiceSpan {
  from: number;
  to?: number;
}

/** Where the scorer heard his first word start and his last word end, in seconds of the recording, when it said. */
export interface SpeechTimes {
  start?: number;
  end?: number;
}

/** A clip decoded: one channel's samples and their rate. */
export interface Decoded {
  samples: Float32Array;
  sampleRate: number;
}

/** A clip's bytes as the phone decodes them; null where it has no Web Audio. The bytes are a copy (decodeAudioData detaches them). A test replaces it. */
export const decodeSeam: { decode: (bytes: ArrayBuffer) => Promise<Decoded | null> } = {
  decode: async (bytes) => {
    if (typeof OfflineAudioContext !== 'function') return null;
    const buffer = await new OfflineAudioContext(1, 1, DECODE_RATE).decodeAudioData(bytes);
    return { samples: buffer.getChannelData(0), sampleRate: buffer.sampleRate };
  },
};

/** Where the voice is in decoded samples: the start of the first frame above the threshold, the end of the last, and the clip's length; none heard, undefined. */
export function heardSpan({ samples, sampleRate }: Decoded): { start: number; end: number; duration: number } | undefined {
  const frame = Math.max(1, Math.round(sampleRate * FRAME_S));
  const levels: number[] = [];
  for (let at = 0; at < samples.length; at += frame) {
    const to = Math.min(at + frame, samples.length);
    let sum = 0;
    for (let i = at; i < to; i++) sum += samples[i] * samples[i];
    levels.push(Math.sqrt(sum / (to - at)));
  }
  const threshold = Math.max(FLOOR_LEVEL, PEAK_SHARE * levels.reduce((loudest, level) => Math.max(loudest, level), 0));
  const first = levels.findIndex((level) => level > threshold);
  if (first < 0) return undefined;
  let last = levels.length - 1;
  while (levels[last] <= threshold) last--;
  const duration = samples.length / sampleRate;
  return { start: (first * frame) / sampleRate, end: Math.min(duration, ((last + 1) * frame) / sampleRate), duration };
}

/** The times of his first word (the verse's word 0) and of the last word he read (`reached`), from the focus words the scorer timed. A flagged
 * word in the middle says nothing of where he started or stopped, so it is not used. */
export function speechTimesOf(words: readonly { index?: number; start?: number; end?: number }[], reached: number | undefined): SpeechTimes {
  const timed = (index: number | undefined) =>
    index === undefined ? undefined : words.find((w) => w.index === index && w.start !== undefined && w.end !== undefined && w.end > w.start);
  const first = timed(0);
  const last = reached !== undefined && reached >= 0 ? timed(reached) : undefined;
  return { ...(first ? { start: first.start } : {}), ...(last ? { end: last.end } : {}) };
}

/** What the phone hears in the clip, measured on a copy of its bytes; undefined when it cannot tell. */
async function measure(bytes: ArrayBuffer): Promise<ReturnType<typeof heardSpan>> {
  try {
    const decoded = await decodeSeam.decode(bytes.slice(0));
    return decoded ? heardSpan(decoded) : undefined;
  } catch {
    return undefined;
  }
}

/** Where to play his clip: from LEAD_IN_S before his voice starts to TAIL_S after it ends, by the scorer's times where it gave them and by the
 * clip's level where not. The tail is left to the clip's end when it is no longer than that. Never rejects. */
export async function voiceSpan(clip: { bytes: ArrayBuffer }, times: SpeechTimes = {}): Promise<VoiceSpan> {
  const heard = times.start === undefined || times.end === undefined ? await measure(clip.bytes) : undefined;
  const start = times.start ?? heard?.start;
  const end = times.end ?? heard?.end;
  const from = start === undefined ? 0 : Math.max(0, start - LEAD_IN_S);
  const to = end === undefined || (heard && times.end === undefined && end + TAIL_S >= heard.duration) ? undefined : end + TAIL_S;
  // times that make no span (an end before the start) leave the end to the clip
  return to === undefined || to <= from ? { from } : { from, to };
}
