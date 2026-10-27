// src/settings/definitions/grammarExtent.ts — the settings whose choices are grammar extents (src/data/grammar/extent.ts, mw-irpgqi.2, docs/paradigm-components.md):
// the Weave's Grammar dial ('weaveGrammar'), New words at ('pickerGrammar') and How much of a table ('paradigmExtent'). One table says, for each, its stored
// values (kept as they were: a phone's saved choice still reads), its labels and the extent each stands for; the registry's entries, the Settings controls
// (controls/grammarExtent.tsx ExtentChips) and the table screen's header switch all read it, so there is one list of options and one rule behind them.
import { DEFAULT_EXTENT, EXTENTS, EXTENT_LABELS, type GrammarExtent } from '../../data/grammar/extent';
import { PICKER_GRAMMARS, pickerDial } from '../../data/grammar/formLevel';
import { defineSetting } from '../define';
import { depthFrom } from './interest';

export interface ExtentOption {
  /** the value saved in the settings store */
  value: string;
  /** the word on the chip, and the registry's label for the value */
  label: string;
  extent: GrammarExtent;
}

export interface ExtentSetting {
  /** a subset of the three extents, in the order the chips show them */
  options: readonly ExtentOption[];
  /** the stored value a value the setting does not have reads as (the setting's own default) */
  fallback: string;
}

export type ExtentKey = 'weaveGrammar' | 'pickerGrammar' | 'paradigmExtent';

/** The Weave's Grammar dial keeps its words (Any | Solid | + Frontier, one line beside its label at 390 px); New words at keeps Solid grammar | Frontier grammar. */
export const EXTENT_SETTINGS: Readonly<Record<ExtentKey, ExtentSetting>> = {
  weaveGrammar: {
    options: [
      { value: 'any', label: 'Any', extent: 'any' },
      { value: 'solid', label: 'Solid', extent: 'solid' },
      { value: 'solid+frontier', label: '+ Frontier', extent: 'solid+frontier' },
    ],
    fallback: 'any',
  },
  pickerGrammar: {
    options: PICKER_GRAMMARS.map((level) => ({ value: level, label: level === 'solid' ? 'Solid grammar' : 'Frontier grammar', extent: pickerDial(level) })),
    fallback: 'frontier',
  },
  paradigmExtent: {
    options: EXTENTS.map((extent) => ({ value: extent, label: EXTENT_LABELS[extent], extent })),
    fallback: DEFAULT_EXTENT,
  },
};

/** The extent a setting's stored value stands for; a value the setting does not have is its fallback's. */
export function extentOf(key: ExtentKey, value: string): GrammarExtent {
  const { options, fallback } = EXTENT_SETTINGS[key];
  const found = options.find((o) => o.value === value) ?? options.find((o) => o.value === fallback);
  if (!found) throw new Error(`${key} has no option ${fallback}`);
  return found.extent;
}

/** The registry's values of an extent setting: the table's options, value and label. */
export const extentChoices = (key: ExtentKey): { value: string; label: string }[] => EXTENT_SETTINGS[key].options.map(({ value, label }) => ({ value, label }));

/** How much of a table (Settings > Greek > Paradigms, and the switch in a table's header): which cells a paradigm table shows. */
export const paradigmExtentSetting = defineSetting<GrammarExtent>({
  key: 'paradigmExtent',
  default: DEFAULT_EXTENT,
  allowed: { kind: 'choice', values: extentChoices('paradigmExtent') },
  section: 'paradigms',
  dependsOn: depthFrom(5),
  label: 'How much of a table',
  hint: 'Which forms a paradigm table shows: all of them, yours, or only the solid ones.',
  help: 'A form is yours once every grammar idea it needs is solid or at the frontier:\n\n- **Solid and frontier**: shows your forms and locks the rest.\n- **Any**: shows every form, the ones you do not have yet marked not yet, with what each needs.\n- **Solid only**: hides the forms whose grammar is still at the frontier.\n\nIn Learn the shown forms are filled in; in Drill they are blank until you tap them. The same switch sits in the header of every table.',
});
