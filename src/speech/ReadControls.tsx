// src/speech/ReadControls.tsx — the read-aloud buttons: Read from the top / Read from here in the reader's header, the play
// button on a verse, and the bar shown while a reading is going (Pause | Stop). The state is src/speech/readAloud.ts's.
import { pauseReading, resumeReading, stopReading, type ReadingState } from './readAloud';

export function Icon({ kind }: { kind: 'play' | 'stop' }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      {kind === 'play' ? <path d="M8 5v14l11-7L8 5Z" /> : <path d="M6 6h12v12H6V6Z" />}
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

/** The header button: reads from verse 1, or from the selected verse. */
export function ReadFromButton({ from, onRead }: { from: number | null; onRead: () => void }) {
  return (
    <button
      type="button"
      aria-label={from === null ? 'Read from the top' : 'Read from here'}
      onClick={onRead}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-accent active:bg-line"
    >
      <Icon kind="play" />
    </button>
  );
}

/** Shown while a reading is going or paused: which verse, Pause (Resume when paused) and Stop, and the one line about a
 * missing Greek voice. */
export function ReadingBar({ reading }: { reading: ReadingState }) {
  if (reading.status === 'idle' || reading.answer !== null) return null;
  const paused = reading.status === 'paused';
  const button = 'min-h-11 min-w-11 rounded-lg border border-line px-4 chrome-text font-medium text-fg active:bg-line';
  return (
    <div className="shrink-0 border-b border-line bg-surface">
      <div role="group" aria-label="Reading" data-reading-bar className="flex items-center gap-2 px-3 py-1">
        <span className="min-w-0 flex-1 truncate chrome-text text-muted">
          {paused ? 'Paused at' : 'Reading'} verse {reading.verse}
        </span>
        <button type="button" onClick={paused ? resumeReading : pauseReading} className={button}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" onClick={stopReading} className={button}>
          Stop
        </button>
      </div>
      {reading.notice ? (
        <p role="status" className="px-4 pb-2 chrome-small text-muted">
          {reading.notice}
        </p>
      ) : null}
    </div>
  );
}
