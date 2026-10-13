// src/TapToHear.tsx — the wide bar under a Quick test word, a flashcard or a grammar question: one tap says the word, a second tap while it speaks stops it.
// Hearing is always a tap, even one word (docs/pwa-best-practices.md section 12; nothing needs a finger kept down). The shared tap bar (src/ui/TapBar.tsx, the
// look of the Talk bar), the same engine as a long press on a word of the reader (speakWord in speech/greek.ts).
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasGreekVoice, isWordSaid, noVoiceHelp, speakLetter, speakWord, stopSpeaking, warmVoices, watchWordEnd } from './speech/greek';
import { Icon } from './speech/SpeakButton';
import { TapBar } from './ui/TapBar';

const HELP_MS = 7000;

/** `text` is the Greek said on a tap; `letter` says it is a letter asked about (a letter drill), which is named, not turned into a sound. */
export function TapToHear({ text, letter = false }: { text: string; letter?: boolean }) {
  const [help, setHelp] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unwatch = useRef<(() => void) | undefined>(undefined);

  const tap = useCallback(() => {
    if (playing && isWordSaid()) {
      stopSpeaking();
      return;
    }
    unwatch.current?.();
    // with no Greek voice the phone would say it in another one: nothing is spoken, the help says where to get one (as a speaker button does)
    if (hasGreekVoice() === false || !(letter ? speakLetter(text) : speakWord(text, 'greek'))) {
      setPlaying(false);
      setHelp(noVoiceHelp());
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHelp(null), HELP_MS);
      return;
    }
    setHelp(null);
    setPlaying(true);
    unwatch.current = watchWordEnd(() => setPlaying(false));
  }, [text, letter, playing]);

  useEffect(() => {
    void warmVoices();
    return () => {
      clearTimeout(timer.current);
      unwatch.current?.();
      setPlaying(false);
      stopSpeaking();
    };
  }, [text]);

  return (
    <>
      <TapBar onTap={tap} name="Tap to hear" label="Tap to hear" icon={<Icon kind={playing ? 'stop' : 'speaker'} />} testId="tap-to-hear" active={playing} />
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
