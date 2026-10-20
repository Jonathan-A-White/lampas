// src/audio/recorder.ts — records him reading a verse aloud: the phone's microphone through MediaRecorder, Opus where
// the browser has it (iOS Safari gives audio/mp4), after SpellForge's recorder. A reading is heard whole, however long he reads,
// up to MAX_RECORDING_MS (ten minutes: the longest a reading's word times may name, services/reading.ts MAX_SECONDS; at 32 kbps that is about 2.4 MB,
// inside the verse-read grind's 8 MB attachment limit, and the mill's local scorer takes a clip of any length). What comes out is one clip, sent as a
// grist attachment (src/services/reading.ts). A reading the cap stops is marked `capped`, and the result says so (reading.ts cutNote).

export interface Recording {
  blob: Blob;
  /** The clip's mime without its codec: audio/webm, audio/ogg or audio/mp4. */
  mime: string;
  durationMs: number;
  /** the cap stopped this recording, not he: the result says the reading was cut (services/reading.ts cutNote) */
  capped?: boolean;
}

/** The longest reading heard: a reading is cut here and sent as it stands, marked `capped`. */
export const MAX_RECORDING_MS = 600_000;

const PREFERRED = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
const NO_MIC = 'The microphone is turned off for this page. Turn it on in the browser settings, then try again.';
const NO_RECORDER = 'This browser cannot record your voice.';

/** The microphone cannot be used; the message is worded for him. */
export class MicUnavailable extends Error {
  constructor(message: string = NO_MIC) {
    super(message);
    this.name = 'MicUnavailable';
  }
}

/** The first type the browser can record, best first; '' when it can record none of them (it then picks its own). */
export function pickMime(isSupported: (mime: string) => boolean = (mime) => MediaRecorder.isTypeSupported(mime)): string {
  return PREFERRED.find((mime) => isSupported(mime)) ?? '';
}

/** The file extension a clip of this type is named with. */
export function extensionOf(mime: string): string {
  return mime === 'audio/mp4' ? 'm4a' : mime === 'audio/ogg' ? 'ogg' : 'webm';
}

/** What the Reader holds to record a reading; the real one is ReadingRecorder, tests give their own (recorderSeam). */
export interface HoldRecorder {
  start(): Promise<void>;
  stop(): Promise<Recording>;
  cancel(): void;
}

export class ReadingRecorder implements HoldRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private cap: ReturnType<typeof setTimeout> | undefined;
  private readonly onLimit: ((recording: Recording) => void) | undefined;

  /** `onLimit` gets the clip, marked `capped`, when the cap stops the recording; a stop() before the cap never calls it. */
  constructor(onLimit?: (recording: Recording) => void) {
    this.onLimit = onLimit;
  }

  async start(): Promise<void> {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) throw new MicUnavailable(NO_RECORDER);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      throw new MicUnavailable();
    }
    const mime = pickMime();
    this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime, audioBitsPerSecond: 32_000 } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    // a hold is timed on the monotonic clock: the wall clock steps back on WSL2 and a hold would read as a tap
    this.startedAt = performance.now();
    this.recorder.start(1000);
    this.cap = setTimeout(() => {
      this.cap = undefined;
      void this.stop().then((recording) => this.onLimit?.({ ...recording, capped: true }));
    }, MAX_RECORDING_MS);
  }

  stop(): Promise<Recording> {
    const recorder = this.recorder;
    if (!recorder) return Promise.reject(new Error('Not recording.'));
    if (this.cap !== undefined) clearTimeout(this.cap);
    this.cap = undefined;
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mime = (recorder.mimeType || this.chunks[0]?.type || 'audio/webm').split(';')[0];
        const recording = { blob: new Blob(this.chunks, { type: mime }), mime, durationMs: Math.round(performance.now() - this.startedAt) };
        this.release();
        resolve(recording);
      };
      recorder.stop();
    });
  }

  cancel(): void {
    if (this.cap !== undefined) clearTimeout(this.cap);
    this.cap = undefined;
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.release();
  }

  private release(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}

/** How the Reader makes a recorder: a test replaces `make` with a fake (tests/support/fake-recorder.ts). */
export const recorderSeam: { make: (onLimit: (recording: Recording) => void) => HoldRecorder } = {
  make: (onLimit) => new ReadingRecorder(onLimit),
};
