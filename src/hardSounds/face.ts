// src/hardSounds/face.ts — how a word of a Hard sounds lesson is drawn (Word.tsx, Contrast.tsx): Greek in its face, Hebrew in its own, right to left (mw-5r3p30.912).
import { GREEK_LANG } from '../script/greekLang';
import type { SpeechLanguage } from '../speech/languages';

/** The attributes of the word's own face: the Greek one, or the Hebrew one, right to left (src/script/greekLang.ts faceOf). */
export const wordFace = (language: SpeechLanguage): { lang: 'el' | 'he'; 'data-lang': 'grc' | 'hbo'; dir?: 'rtl'; className: string } =>
  language === 'hebrew' ? { lang: 'he', 'data-lang': 'hbo', dir: 'rtl', className: 'script-he hebrew-choice' } : { ...GREEK_LANG, className: 'font-greek text-3xl' };
