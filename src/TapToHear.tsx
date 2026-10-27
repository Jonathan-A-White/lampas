// src/TapToHear.tsx — the wide bar under a Quick test word, a flashcard or a grammar question: one tap says the word, a second tap while it speaks stops it.
// Hearing is always a tap, even one word (docs/pwa-best-practices.md section 12; nothing needs a finger kept down). The shared tap bar (src/ui/TapBar.tsx, the
// look of the Talk bar), the same engine as a long press on a word of the reader (speakWord in speech/greek.ts). The bar follows its word, whoever said it: the
// Quick test's answer says it by itself, and the bar still shows the stop square and stops it on a tap (useWordSaid; mw-5r3p30.324).
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasGreekVoice, hasVoice, noVoiceHelp, speakSound, speakWord, stopSpeaking, useWordSaid, warmVoices } from './speech/greek';
import type { SpeechLanguage } from './speech/languages';
import { Icon } from './speech/SpeakButton';
import { TapBar } from './ui/TapBar';

const HELP_MS = 7000;

/** `text` is the Greek said on a tap; `letter` says it is a letter or pair asked about by ear (a sound question), whose sound is said (speakSound: a vowel
 * doubled to the Greek voice, a consonant still named; mw-5r3p30.421). */
export function TapToHear({ text, letter = false, language = 'greek' }: { text: string; letter?: boolean; language?: SpeechLanguage }) {
  const [help, setHelp] = useState<string | null>(null);
  const playing = useWordSaid(text);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const tap = useCallback(() => {
    if (playing) {
      stopSpeaking();
      return;
    }
    // with no Greek voice the phone would say it in another one: nothing is spoken, the help says where to get one (as a speaker button does)
    // (a Hebrew letter or word is said in the phone's Hebrew voice, mw-gdcyf98.11)
    const spoken = language === 'hebrew' ? hasVoice('hebrew') !== false && speakWord(text, 'hebrew') : hasGreekVoice() !== false && (letter ? speakSound(text) : speakWord(text, 'greek'));
    if (!spoken) {
      setHelp(noVoiceHelp(language));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHelp(null), HELP_MS);
      return;
    }
    setHelp(null);
  }, [text, letter, language, playing]);

  useEffect(() => {
    void warmVoices();
    return () => {
      clearTimeout(timer.current);
      stopSpeaking();
    };
  }, [text]);

  return (
    <>
      <TapBar onTap={tap} name="Tap to hear" label="Tap to hear" icon={<Icon kind={playing ? 'stop' : 'speaker'} />} testId="tap-to-hear" active={playing} />
      {help ? (
        <p
          role="status"
          className="pointer-events-none fixed inset-x-3 toast-top z-20 rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg shadow-lg"
        >
          {help}
        </p>
      ) : null}
    </>
  );
}
