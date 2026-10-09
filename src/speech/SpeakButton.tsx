// src/speech/SpeakButton.tsx — the speaker button on a word and the play button on a verse. Both speak `text` in
// modern Greek (or in the `language` they are given, at that language's speed); a second tap on the same one stops it. With no Greek voice the button still shows and a tap puts one
// line of help at the top of the screen.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechLanguage } from './languages';
import { noVoiceHelp, speak, stopIfSpeaking, useSpeakingKey, warmVoices } from './greek';

const HELP_MS = 7000;

export function Icon({ kind }: { kind: 'speaker' | 'play' | 'stop' }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      {kind === 'speaker' ? (
        <path d="M3 9v6h4l5 4V5L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4Zm-2.5-9v2.1a7 7 0 0 1 0 13.8V21a9 9 0 0 0 0-18Z" />
      ) : kind === 'play' ? (
        <path d="M8 5v14l11-7L8 5Z" />
      ) : (
        <path d="M6 6h12v12H6V6Z" />
      )}
    </svg>
  );
}

/** `id` names what is spoken, so two buttons for the same text agree on whether it is playing. */
export function SpeakButton({ text, id, label, kind, language, className, onSpeak }: {
  text: string;
  id: string;
  label: string;
  kind: 'speaker' | 'play';
  /** the language of `text`: Greek unless said; its speed and voice are the ones he set for it */
  language?: SpeechLanguage;
  className?: string;
  /** called on a tap, before the word is spoken (a tutor response being read aloud is stopped here, so only the word is heard) */
  onSpeak?: () => void;
}) {
  const playing = useSpeakingKey() === id;
  const [help, setHelp] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showHelp = useCallback(() => {
    setHelp(noVoiceHelp());
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHelp(null), HELP_MS);
  }, []);

  useEffect(() => {
    void warmVoices();
    return () => {
      clearTimeout(timer.current);
      stopIfSpeaking(id);
    };
  }, [id]);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-pressed={playing}
        onClick={() => {
          setHelp(null);
          onSpeak?.();
          if (speak(text, id, showHelp, language) === 'no-voice') showHelp();
        }}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-accent active:bg-line ${className ?? ''}`}
      >
        <Icon kind={playing ? 'stop' : kind} />
      </button>
      {help ? (
        <p
          role="status"
          className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-20 rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg shadow-lg"
        >
          {help}
        </p>
      ) : null}
    </>
  );
}
