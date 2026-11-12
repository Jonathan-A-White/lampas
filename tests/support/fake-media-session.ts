// tests/support/fake-media-session.ts — the phone's navigator.mediaSession and MediaMetadata for the tests (jsdom has neither): the lock screen of a recorded reading
// (src/speech/mediaSession.ts, mw-82lb97i.7) writes its metadata, playbackState and action handlers here, and a test reads them back or calls a handler as the lock screen's
// button would. Undo with unstubMediaSession() (and vi.unstubAllGlobals()).
import { vi } from 'vitest';

export type SessionHandler = (() => void) | null;

export interface FakeMetadata {
  title: string;
  artist: string;
  album: string;
  artwork: { src: string; sizes?: string; type?: string }[];
}

export interface FakeMediaSession {
  metadata: FakeMetadata | null;
  playbackState: string;
  handlers: Record<string, SessionHandler>;
  setActionHandler(action: string, handler: SessionHandler): void;
}

export function stubMediaSession(): FakeMediaSession {
  const stub: FakeMediaSession = {
    metadata: null,
    playbackState: 'none',
    handlers: { play: null, pause: null, stop: null, previoustrack: null, nexttrack: null },
    setActionHandler(action, handler) {
      stub.handlers[action] = handler;
    },
  };
  vi.stubGlobal(
    'MediaMetadata',
    class {
      title: string;
      artist: string;
      album: string;
      artwork: FakeMetadata['artwork'];
      constructor(init: FakeMetadata) {
        this.title = init.title;
        this.artist = init.artist;
        this.album = init.album;
        this.artwork = init.artwork;
      }
    },
  );
  Object.defineProperty(navigator, 'mediaSession', { value: stub, configurable: true });
  return stub;
}

/** The phone has no media session at all (an older browser). */
export function unstubMediaSession(): void {
  Reflect.deleteProperty(navigator, 'mediaSession');
}
