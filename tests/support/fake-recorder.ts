// tests/support/fake-recorder.ts — a recorder the test holds: no microphone, no MediaRecorder. It hands back a short
// clip of the length the scenario says, so the app's own 500 ms rule is proven without waiting half a second. Not
// Android Chrome (docs/pwa-best-practices.md section 12): it proves the app's sequencing, never how a phone records.
import { recorderSeam, MicUnavailable, type HoldRecorder, type Recording } from '../../src/audio/recorder';

export class FakeRecorder implements HoldRecorder {
  static instances: FakeRecorder[] = [];
  /** how long the next clip says it lasted */
  static durationMs = 2500;
  /** when set, start() fails as a phone with the microphone turned off does */
  static denied = false;
  /** the mime the clip says it is, as MediaRecorder would report it for this browser */
  static mime = 'audio/webm';
  started = false;
  stopped = false;
  cancelled = false;

  async start(): Promise<void> {
    if (FakeRecorder.denied) throw new MicUnavailable();
    this.started = true;
  }

  async stop(): Promise<Recording> {
    this.stopped = true;
    return { blob: new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], { type: FakeRecorder.mime }), mime: FakeRecorder.mime, durationMs: FakeRecorder.durationMs };
  }

  cancel(): void {
    this.cancelled = true;
  }

  static last(): FakeRecorder {
    const found = FakeRecorder.instances[FakeRecorder.instances.length - 1];
    if (!found) throw new Error('no recorder was made');
    return found;
  }
}

/** Makes the app record with FakeRecorder until the test file ends. */
export function stubRecorder(): void {
  FakeRecorder.instances = [];
  FakeRecorder.durationMs = 2500;
  FakeRecorder.denied = false;
  FakeRecorder.mime = 'audio/webm';
  recorderSeam.make = () => {
    const made = new FakeRecorder();
    FakeRecorder.instances.push(made);
    return made;
  };
}
