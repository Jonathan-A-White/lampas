// src/data/grammar/formLevel.ts — whether one form's grammar stands at the Weave's grammar dial (mw-hqd5bz.9). Pure. The dial is a grammar extent
// (extent.ts, mw-irpgqi.2): the one rule for an idea's level is withinExtent, shared with the paradigm tables.
import type { GreekWord } from '../chapter';
import type { GrammarLevel } from '../db';
import { withinExtent, type GrammarExtent } from './extent';
import { ALWAYS_NEEDED, ideasOf } from './ladder';

/** The Weave's grammar dial: 'any' ignores grammar; 'solid' wants every idea of the form solid; 'solid+frontier' also takes frontier ones. A grammar extent. */
export type WeaveGrammar = GrammarExtent;

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
  return ideas.every((id) => withinExtent(levels.get(id)?.level, dial));
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

/** How near a form is to what he is learning, the order the Parsing drill asks forms in (mw-indx1x6.9): 0 uses the idea he is learning now (the Goal screen's 'Learning now'),
 * 1 uses an idea at the frontier, 2 has every idea solid, 3 uses an idea with no level yet. A form the ladder cannot read is 3. */
export type FormTier = 0 | 1 | 2 | 3;

export function formTier(code: string, levels: ReadonlyMap<string, GrammarLevel>, learningId: string | undefined): FormTier {
  let ideas: string[];
  try {
    ideas = ideasOf(code);
  } catch {
    return 3;
  }
  if (learningId !== undefined && ideas.includes(learningId)) return 0;
  const of = (id: string) => levels.get(id)?.level;
  if (ideas.some((id) => of(id) === 'frontier')) return 1;
  return ideas.every((id) => of(id) === 'solid') ? 2 : 3;
}
