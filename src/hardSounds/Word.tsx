// src/hardSounds/Word.tsx — a word of a Hard sounds lesson, Greek or Hebrew: its letters of the lesson marked, and its speaker (HardSoundLesson.tsx and Contrast.tsx draw it).
import type { SpeechLanguage } from '../speech/languages';
import { SpeakButton } from '../speech/SpeakButton';
import { markLetters } from './markLetters';
import { GREEK_LANG } from '../script/greekLang';

/** The attributes of the word's own face: the Greek one, or the Hebrew one, right to left (src/script/greekLang.ts faceOf). */
export const wordFace = (language: SpeechLanguage): { lang: 'el' | 'he'; 'data-lang': 'grc' | 'hbo'; dir?: 'rtl'; className: string } =>
  language === 'hebrew' ? { lang: 'he', 'data-lang': 'hbo', dir: 'rtl', className: 'script-he hebrew-choice' } : { ...GREEK_LANG, className: 'font-greek text-3xl' };

/** A word in `language` (Greek unless said), its letters of the lesson marked, and its speaker. */
export function Word({ word, letters, id, language = 'greek' }: { word: string; letters: readonly string[]; id: string; language?: SpeechLanguage }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span {...wordFace(language)}>{markLetters(word, letters)}</span>
      <SpeakButton text={word} id={id} label={`Hear ${word}`} kind="speaker" language={language} />
    </span>
  );
}
