// Variants (Settings > Reading > Variants, mw-9ji6ek0.4): whether the Reader marks the places where the manuscripts differ, and whose readings count. 'english' is the places
// where the reading changes the English; 'all' every place. Witnesses are cumulative: the Byzantine split alone, with Nestle-Aland, or with ECM too (every witness, the default).
// The Witnesses row is drawn only while Variants is not Off; nothing in the Reader changes while it is Off.
import { defineSetting } from '../define';

export type Variants = 'off' | 'english' | 'all';
export type VariantWitnesses = 'byz' | 'na' | 'ecm';

export const variantsSetting = defineSetting<Variants>({
  key: 'variants',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'off', label: 'Off' },
      { value: 'english', label: 'Those that change the English' },
      { value: 'all', label: 'All' },
    ],
  },
  section: 'variants',
  label: 'Variants',
  hint: 'Whether the Reader shows where the manuscripts differ.',
  help: 'Marks where manuscripts differ: **Those that change the English** keeps readings that change it; **All**, every one.',
});

export const variantWitnessesSetting = defineSetting<VariantWitnesses>({
  key: 'variantWitnesses',
  default: 'ecm',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'byz', label: 'Byzantine splits only' },
      { value: 'na', label: 'also Nestle-Aland' },
      { value: 'ecm', label: 'also ECM' },
    ],
  },
  section: 'variants',
  dependsOn: { key: 'variants', shown: (value) => value !== 'off' },
  label: 'Witnesses',
  hint: 'Whose readings count.',
  help: 'Whose readings count: the Byzantine split, Nestle-Aland 27/28, ECM.',
});
