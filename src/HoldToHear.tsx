// src/HoldToHear.tsx — the wide bar under a Quick test word: hold it (half a second) to hear the word, let go to stop.
// The shared hold bar (src/ui/HoldBar.tsx), the same as the Talk bar and the same engine as a long press on a word of the reader (speakWord in
// speech/greek.ts); a tap without a hold says nothing, a slide off the bar drops the word.
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasGreekVoice, noVoiceHelp, speakWord, stopSpeaking, warmVoices } from './speech/greek';
import { Icon } from './speech/SpeakButton';
import { HoldBar } from './ui/HoldBar';

const HELP_MS = 7000;

/** `text` is the Greek said while the bar is held. */
export function HoldToHear({ text }: { text: string }) {
  const [help, setHelp] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const begin = useCallback(() => {
    if (!speakWord(text, 'greek') || hasGreekVoice() === false) {
      setHelp(noVoiceHelp());
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHelp(null), HELP_MS);
    }
  }, [text]);

  const hold = { onHold: begin, onRelease: stopSpeaking, onDrop: stopSpeaking };

  useEffect(() => {
    void warmVoices();
    return () => {
      clearTimeout(timer.current);
      stopSpeaking();
    };
  }, [text]);

  return (
    <>
      <HoldBar hold={hold} name="Hold to hear" label="Hold to hear" icon={<Icon kind="speaker" />} testId="hold-to-hear" keys />
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
