// The Reader split (docs/design/reader-split.md, mw-5r3p30.1129.1): whether the dock stands below the passage, and how big it is. Neither is a row of Settings or a setting the tutor
// reads or changes: the split is chosen, sized and closed in place, so they are declared here and kept out of the registry and DEFINITIONS like Hand (src/settings/hand.ts); the tutor's
// table says so in src/tutor/knows.ts (NOT_IN_THE_REGISTRY). They are rows of the settings store all the same, so a reload brings the split back as it was.
import { defineSetting } from '../define';
import { FIRST_FRACTION } from '../../reader/split/splitSize';

export type ReaderSplit = 'on' | 'off';

/** Whether the dock is open. S2 and S3 of mw-5r3p30.1129 say what is in it (a map, a text). */
export const readerSplitSetting = defineSetting<ReaderSplit>({
  key: 'readerSplit',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'tools',
  label: 'Split',
  hint: 'A dock below the passage, which stays open while you read.',
});

/** The share of the Reader's box the dock takes (along its length: its height, or its width side by side), between 0 and 1, kept as it was left so a box that turns keeps it. Half until he has dragged it. */
export const SPLIT_FRACTION_MIN = 0.05;
export const SPLIT_FRACTION_MAX = 0.95;
export const splitSizeSetting = defineSetting<number>({
  key: 'splitSize',
  default: FIRST_FRACTION,
  allowed: { kind: 'number', min: SPLIT_FRACTION_MIN, max: SPLIT_FRACTION_MAX, step: 0.0001 },
  parse: (raw) => {
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= SPLIT_FRACTION_MIN && n <= SPLIT_FRACTION_MAX ? n : FIRST_FRACTION;
  },
  section: 'tools',
  label: 'Split size',
  hint: 'How much of the screen the dock takes.',
});

/** The settings of the split, for the tutor's table (src/tutor/knows.ts). */
export const SPLIT_SETTINGS = [readerSplitSetting, splitSizeSetting] as const;
