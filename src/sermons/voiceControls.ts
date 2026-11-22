// src/sermons/voiceControls.ts — what Hands-free may do to the sermon sheet that is open (mw-ecpivg5.3): the sermon reader (SermonReader.tsx) and the sermon player (SermonPlayer.tsx) each register the controls
// they have while open; src/handsFree/commands.ts drives the one on top. Each control returns false when this sheet cannot do it (a Subsplash video has no API to call), and the command says so.
export interface SermonControls {
  /** 'reader' reads a text sermon in the phone's voice; 'player' plays a video. */
  kind: 'reader' | 'player';
  /** Goes on, or starts; nothing when it is playing already. */
  play(): boolean;
  /** Pauses; nothing when it is not playing. */
  pause(): boolean;
  /** Back: a paragraph in the reader, BACK_SECONDS in the player. */
  back(): boolean;
  /** Forward: a paragraph in the reader, FORWARD_SECONDS in the player. */
  forward(): boolean;
  /** From the beginning, and playing. */
  restart(): boolean;
  /** Whether this sheet is making a sound of its own right now (a video playing); the reader's reading is the speech engine's and is not asked here. Absent: no sound of its own. */
  playing?(): boolean;
  /** Ends the reading or the video (the sheet stays). */
  stop(): boolean;
}

/** How far 'back' and 'forward' move a video (PROVISIONAL, the Governor to confirm). */
export const SKIP_SECONDS = 30;

/** The open sheets' controls, the one opened last on top (it is drawn over the others). */
const open: SermonControls[] = [];

/** Registers the controls of a sheet that is now open; the result takes them away again (on close). */
export function registerSermonControls(controls: SermonControls): () => void {
  open.push(controls);
  return () => {
    const at = open.indexOf(controls);
    if (at >= 0) open.splice(at, 1);
  };
}

/** The controls of the sermon sheet on top, or null when no sermon is open. */
export function sermonControls(): SermonControls | null {
  return open[open.length - 1] ?? null;
}
