// src/speech/mediaSession.ts — the lock screen and a headset for a RECORDED reading (mw-82lb97i.7, docs/read-aloud.md 'The recorded voice', PROVISIONAL): while a recording is the
// reading, navigator.mediaSession shows the chapter ('John 3' by 'Majority Standard Bible, read by David', album 'Lampas', Lampas's own icons), follows Play and Pause, and its
// Play, Pause and Stop buttons call the reading's own resumeReading, pauseReading and stopReading (src/speech/readAloud.ts hands them in, so this file imports nothing of it).
// The phone's voice has no session (voice-kit pauses it when the page hides, and Android stops its voice anyway), and a phone without navigator.mediaSession reads on regardless.
// Previous and next track skip one verse (mw-82lb97i.19, PROVISIONAL): they call readAloud.ts skipRecordedVerse, the same as the speaking bar's Previous verse and Next verse.
// Deliberately NOT here: seek handlers, a position state.

/** What the lock screen shows of a reading. */
export interface SessionView {
  /** '<Book> <chapter>', 'John 3' */
  title: string;
  /** the reading is paused (its Play is offered), else it plays */
  paused: boolean;
}

/** What the lock screen's buttons do. */
export interface SessionActions {
  play(): void;
  pause(): void;
  stop(): void;
  /** Previous track: back to the start of the verse before the one being read */
  previous(): void;
  /** Next track: on to the start of the verse after the one being read */
  next(): void;
}

export const SESSION_ARTIST = 'Majority Standard Bible, read by David';
export const SESSION_ALBUM = 'Lampas';

const ACTIONS = ['play', 'pause', 'stop', 'previoustrack', 'nexttrack'] as const;

let shown = false;
let shownTitle: string | null = null;

const sessionOf = (): MediaSession | null => (typeof navigator !== 'undefined' && navigator.mediaSession ? navigator.mediaSession : null);

function metadataFor(title: string): MediaMetadata | null {
  if (typeof MediaMetadata === 'undefined') return null;
  const base = import.meta.env.BASE_URL;
  return new MediaMetadata({
    title,
    artist: SESSION_ARTIST,
    album: SESSION_ALBUM,
    artwork: [
      { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
  });
}

/** Shows `view` on the lock screen with `actions` behind its buttons, or, with null, takes it all away (metadata and handlers cleared, playbackState 'none'). Safe to call at
 * every change of the reading: it does only what changed. A browser without a media session does nothing. */
export function showSession(view: SessionView | null, actions: SessionActions): void {
  const session = sessionOf();
  if (!session) return;
  try {
    if (!view) {
      if (!shown) return;
      shown = false;
      shownTitle = null;
      session.metadata = null;
      for (const action of ACTIONS) session.setActionHandler(action, null);
      session.playbackState = 'none';
      return;
    }
    if (!shown) {
      shown = true;
      session.setActionHandler('play', () => actions.play());
      session.setActionHandler('pause', () => actions.pause());
      session.setActionHandler('stop', () => actions.stop());
      session.setActionHandler('previoustrack', () => actions.previous());
      session.setActionHandler('nexttrack', () => actions.next());
    }
    if (shownTitle !== view.title) {
      shownTitle = view.title;
      session.metadata = metadataFor(view.title);
    }
    session.playbackState = view.paused ? 'paused' : 'playing';
  } catch {
    // a browser that refuses an action or the metadata still reads on
  }
}

/** Forgets that a session was shown (a test's: each scenario starts with none). */
export function resetMediaSession(): void {
  shown = false;
  shownTitle = null;
}
