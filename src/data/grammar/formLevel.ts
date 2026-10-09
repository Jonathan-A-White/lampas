// src/data/grammar/formLevel.ts — whether one form's grammar stands at the Weave's grammar dial (mw-hqd5bz.9). Pure.
import type { GreekWord } from '../chapter';
import type { GrammarLevel } from '../db';
import { ALWAYS_NEEDED, ideasOf } from './ladder';

/** The Weave's grammar dial: 'any' ignores grammar; 'solid' wants every idea of the form solid; 'solid+frontier' also takes frontier ones. */
export type WeaveGrammar = 'any' | 'solid' | 'solid+frontier';

export const WEAVE_GRAMMARS: readonly WeaveGrammar[] = ['any', 'solid', 'solid+frontier'];

/** True for 'any'. Otherwise true when every idea the RP parsing `code` needs (ideasOf, with ALWAYS_NEEDED) has a level the dial takes;
 * an idea with no level row counts as not yet, and a form with no code, or one the ladder cannot read, does not pass. */
export function formPasses(code: string, levels: ReadonlyMap<string, GrammarLevel>, dial: WeaveGrammar): boolean {
  if (dial === 'any') return true;
  if (!code) return false;
  let ideas: string[];
  try {
    ideas = [...ideasOf(code), ...ALWAYS_NEEDED];
  } catch {
    return false;
  }
  return ideas.every((id) => {
    const level = levels.get(id)?.level;
    return level === 'solid' || (dial === 'solid+frontier' && level === 'frontier');
  });
}

/** At which grammar level the picker offers new words (mw-hqd5bz.11): only words with a form whose grammar he has Solid, or Solid and at the Frontier. */
export type PickerGrammar = 'solid' | 'frontier';

export const PICKER_GRAMMARS: readonly PickerGrammar[] = ['solid', 'frontier'];

/** The Weave dial the picker's level stands for: Solid grammar is 'solid', Frontier grammar also takes the frontier ideas. */
export const pickerDial = (level: PickerGrammar): WeaveGrammar => (level === 'solid' ? 'solid' : 'solid+frontier');

/** The test the frontier picker takes for a form: formPasses on the word's parsing at the picker's level. */
export const pickerPasses = (levels: ReadonlyMap<string, GrammarLevel>, level: PickerGrammar) => {
  const dial = pickerDial(level);
  return (word: GreekWord): boolean => formPasses(word.p, levels, dial);
};
