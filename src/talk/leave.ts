// src/talk/leave.ts — how the open Talk sheet closes when an offer taken from a talk opens a screen beneath it (mw-5r3p30.731; the tutor's start-review command, src/tutor/registry.ts, closes it too).
// The Talk sheet that is open closes itself when the offer is taken, by a tap or a spoken yes: Review opens beneath it. Module state, because the spoken yes does not know the sheet.
let leave: (() => void) | undefined;

/** Registers how the open Talk sheet closes; returns what takes it back (the sheet closing). */
export function registerTalkLeave(close: () => void): () => void {
  leave = close;
  return () => {
    if (leave === close) leave = undefined;
  };
}

/** Closes the open Talk sheet, if one registered how: an offer taken from a talk opens a screen beneath it. */
export function leaveTalk(): void {
  leave?.();
}

