// src/script/rustyFace.ts — how a rusty item's title is drawn (mw-gdcyf98.22), in Welcome back and under the tutor's offer to move the rust back: a word in its own script's face, Greek in the Greek one and
// Hebrew (the lemma holds Hebrew letters) right to left in the Hebrew one; an idea in the plain face, whatever its language.
import { languageOfLemma } from '../data/lemma';
import { faceOf } from './greekLang';

/** The attributes and class of the title of `item`: a word's by the script of its lemma (the id), an idea's none. */
export const rustyFace = (item: { kind: 'word' | 'idea'; id: string }): { lang?: 'he' | 'el'; 'data-lang'?: 'hbo' | 'grc'; dir?: 'rtl'; className?: string } =>
  item.kind === 'word' ? faceOf(languageOfLemma(item.id), { greek: 'text-[length:var(--lp-greek-size)]', hebrew: 'hebrew-choice' }) : {};
