// src/HoldToHear.tsx — the wide bar under a Quick test word: hold it (half a second) to hear the word, let go to stop.
// The same bar look as the Talk bar and the same engine as a long press on a word of the reader (speakWord in
// speech/greek.ts); a tap without a hold says nothing, a slide off the bar drops the word.
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasGreekVoice, noVoiceHelp, speakWord, stopSpeaking, warmVoices } from './speech/greek';
import { Icon } from './speech/SpeakButton';
import { useHoldPress } from './ui/holdPress';

const HELP_MS = 7000;

/** `text` is the Greek said while the bar is held. */
export function HoldToHear({ text }: { text: string }) {
  const [help, setHelp] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heldByKey = useRef(false);

  const begin = useCallback(() => {
    if (!speakWord(text, 'greek') || hasGreekVoice() === false) {
      setHelp(noVoiceHelp());
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHelp(null), HELP_MS);
    }
  }, [text]);

  const press = useHoldPress({ onHold: begin, onRelease: stopSpeaking, onDrop: stopSpeaking });

  useEffect(() => {
    void warmVoices();
    return () => {
      clearTimeout(timer.current);
      stopSpeaking();
    };
  }, [text]);

  return (
    <>
      <button
        type="button"
        data-testid="hold-to-hear"
        {...press}
        onKeyDown={(e) => {
          if (e.key !== ' ' && e.key !== 'Enter') return;
          e.preventDefault();
          if (e.repeat || heldByKey.current) return;
          heldByKey.current = true;
          begin();
        }}
        onKeyUp={(e) => {
          if (e.key !== ' ' && e.key !== 'Enter') return;
          heldByKey.current = false;
          stopSpeaking();
        }}
        className="flex min-h-14 w-full touch-none select-none flex-col items-center justify-center rounded-xl bg-accent px-6 py-1 text-lg font-medium text-accent-fg [-webkit-touch-callout:none]"
      >
        <Icon kind="speaker" />
        Hold to hear
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
