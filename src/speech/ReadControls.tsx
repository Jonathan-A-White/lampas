// src/speech/ReadControls.tsx — the read-aloud buttons: Read from the top / Read from here in the reader's header, the play
// button on a verse, and the line shown while a reading is going. The header's button is Play while nothing is read; while
// the chapter is read it is Pause and Stop, and while paused Play and Stop. The state is src/speech/readAloud.ts's.
import { pauseReading, resumeReading, stopReading, type ReadingState } from './readAloud';

const ICON_PATHS = {
  play: 'M8 5v14l11-7L8 5Z',
  stop: 'M6 6h12v12H6V6Z',
  pause: 'M7 5h4v14H7V5Zm6 0h4v14h-4V5Z',
};

export function Icon({ kind }: { kind: 'play' | 'stop' | 'pause' }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d={ICON_PATHS[kind]} />
    </svg>
  );
}

/** The play button on a verse: reads that verse, and stops it when it is the verse being read. */
export function VersePlay({ playing, onPlay, className }: { playing: boolean; onPlay: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label="Hear the verse"
      aria-pressed={playing}
      onClick={() => (playing ? stopReading() : onPlay())}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-accent active:bg-line ${className ?? ''}`}
    >
      <Icon kind={playing ? 'stop' : 'play'} />
    </button>
  );
}

const HEADER_BUTTON = 'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-accent active:bg-line';

/** The header's reading buttons. Nothing being read (or a talk answer, which has its own Stop): the one Play button, which
 * reads from verse 1 or from the selected verse. While the chapter is read: Pause and Stop. While paused: Play, which goes on
 * from the verse it waits at, and Stop (which returns to the one Play button). */
export function ReadFromButton({ from, reading, onRead }: { from: number | null; reading: ReadingState; onRead: () => void }) {
  if (reading.status === 'idle' || reading.answer !== null) {
    return (
      <button type="button" aria-label={from === null ? 'Read from the top' : 'Read from here'} onClick={onRead} className={HEADER_BUTTON}>
        <Icon kind="play" />
      </button>
    );
  }
  const paused = reading.status === 'paused';
  return (
    <>
      <button type="button" aria-label={paused ? 'Play' : 'Pause'} onClick={paused ? resumeReading : pauseReading} className={HEADER_BUTTON}>
        <Icon kind={paused ? 'play' : 'pause'} />
      </button>
      <button type="button" aria-label="Stop" onClick={stopReading} className={HEADER_BUTTON}>
        <Icon kind="stop" />
      </button>
    </>
  );
}

/** Shown while a reading is going or paused: which verse, and the one line about a missing Greek voice. Its buttons are the
 * header's (ReadFromButton). */
export function ReadingBar({ reading }: { reading: ReadingState }) {
  if (reading.status === 'idle' || reading.answer !== null) return null;
  const paused = reading.status === 'paused';
  return (
    <div className="shrink-0 border-b border-line bg-surface">
      <div role="group" aria-label="Reading" data-reading-bar className="flex items-center gap-2 px-3 py-1">
        <span className="min-w-0 flex-1 truncate chrome-text text-muted">
          {paused ? 'Paused at' : 'Reading'} verse {reading.verse}
        </span>
      </div>
      {reading.notice ? (
        <p role="status" className="px-4 pb-2 chrome-small text-muted">
          {reading.notice}
        </p>
      ) : null}
    </div>
  );
}
