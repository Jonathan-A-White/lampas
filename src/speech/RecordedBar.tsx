// src/speech/RecordedBar.tsx — the speaking bar for a RECORDED reading (mw-82lb97i.4, docs/read-aloud.md 'The recorded voice'). voice-kit's <SpeakingBar /> shows only the package's own
// speech (useSpeech), and a recording is played by an audio element the package knows nothing of, so this is the same bar for it: the same section, classes (voice-kit/speech/styles.css,
// Lampas's --bk-speech-* colours), data-testid, data-state, data-action values and words (DEFAULT_LABELS), each button at least 44 px. Pause and Resume hold and play the element at its
// second (readAloud.ts pauseReading / resumeReading), Restart goes back to the start of the verse being read (a Listen: to its first verse), Previous verse and Next verse skip to the start of the verse before or after it
// (readAloud.ts skipRecordedVerse, mw-82lb97i.19, PROVISIONAL; their icons alone are drawn, the words are their names: five labelled buttons would take three rows), Stop ends the reading.
// PROVISIONAL: a small component of Lampas's own; if the slice is kept its home is voice-kit (an engine that takes an outside player), a later story. LampasSpeakingBar draws it into
// the same slot as voice-kit's bar, and never both.
import { DEFAULT_LABELS } from 'voice-kit/speech/react';
import { pauseReading, restartListen, restartRecorded, resumeReading, skipRecordedVerse, stopReading, useReading } from './readAloud';

/** The words of the two skip buttons (mw-82lb97i.19, PROVISIONAL, the Governor's to confirm). */
export const PREVIOUS_VERSE = 'Previous verse';
export const NEXT_VERSE = 'Next verse';

// the icons of voice-kit's bar (its Icon is not exported)
const PATHS = {
  play: 'M8 5v14l11-7L8 5Z',
  pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  stop: 'M7 7h10v10H7z',
  previous: 'M6 5v14M18 5v14l-9-7 9-7Z',
  next: 'M18 5v14M6 5v14l9-7-9-7Z',
};

function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg
      className="bk-speech__icon"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function RecordedBar() {
  const reading = useReading();
  if (!reading.recorded || reading.status === 'idle') return null;
  const paused = reading.status === 'paused';
  return (
    <section aria-label={DEFAULT_LABELS.region} data-testid="speaking-bar" data-state={paused ? 'paused' : 'playing'} className="bk-speech">
      <button type="button" className="bk-speech__button lp-skip-verse" data-action="previous-verse" data-repeat onClick={() => skipRecordedVerse(-1)}>
        <Icon name="previous" />
        {PREVIOUS_VERSE}
      </button>
      <button
        type="button"
        className="bk-speech__button"
        data-action={paused ? 'resume' : 'pause'}
        data-primary={paused ? 'true' : undefined}
        onClick={paused ? resumeReading : pauseReading}
      >
        <Icon name={paused ? 'play' : 'pause'} />
        {paused ? DEFAULT_LABELS.resume : DEFAULT_LABELS.pause}
      </button>
      <button
        type="button"
        className="bk-speech__button"
        data-action="restart"
        onClick={() => {
          if (!restartListen()) restartRecorded();
        }}
      >
        <Icon name="refresh" />
        {DEFAULT_LABELS.restart}
      </button>
      <button type="button" className="bk-speech__button lp-skip-verse" data-action="next-verse" data-repeat onClick={() => skipRecordedVerse(1)}>
        <Icon name="next" />
        {NEXT_VERSE}
      </button>
      <button type="button" className="bk-speech__button" data-action="stop" onClick={stopReading}>
        <Icon name="stop" />
        {DEFAULT_LABELS.stop}
      </button>
    </section>
  );
}
