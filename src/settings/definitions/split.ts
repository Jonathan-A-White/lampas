// The Reader split (docs/design/reader-split.md, mw-5r3p30.1129.1): whether the dock stands below the passage, and how big it is. Neither is a row of Settings or a setting the tutor
// reads or changes: the split is chosen, sized and closed in place, so they are declared here and kept out of the registry and DEFINITIONS like Hand (src/settings/hand.ts); the tutor's
// table says so in src/tutor/knows.ts (NOT_IN_THE_REGISTRY). They are rows of the settings store all the same, so a reload brings the split back as it was.
import { defineSetting } from '../define';
import { FIRST_FRACTION } from '../../reader/split/splitSize';
import { decodeSplitMap } from '../../maps/splitMap';
import { SPLIT_TEXT_KEYS } from '../../reader/split/splitTexts';

export type ReaderSplit = 'on' | 'off';

/** Whether the dock is open. What is in it is `splitText` (a text beside the passage) or, while that is empty, `splitMap` (a map). */
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

/** The map the dock holds (mw-5r3p30.1129.2): the chapter it was opened from and the card, as src/maps/splitMap.ts writes it; empty while the dock holds none. A reload brings the same map back. */
export const splitMapSetting = defineSetting<string>({
  key: 'splitMap',
  default: '',
  allowed: {
    kind: 'text',
    valid: (value) => value === '' || decodeSplitMap(value) !== null,
    example: 'gen|14|biblemapper|BattleAtValleyOfSiddim',
    note: "the book, chapter, map source and map id joined by '|', or empty for no map",
  },
  parse: (raw) => (typeof raw === 'string' && (raw === '' || decodeSplitMap(raw) !== null) ? raw : ''),
  section: 'tools',
  label: 'Split map',
  hint: 'The map the dock holds.',
});

/** The text the dock holds (mw-5r3p30.1130): one of src/reader/split/splitTexts.ts SPLIT_TEXT_KEYS ('hebrew', 'greek', 'english', 'lxx-greek', 'lxx-english'), or empty for none; while it is set the dock shows the text, not the map. A reload brings the same text back. */
export const splitTextSetting = defineSetting<string>({
  key: 'splitText',
  default: '',
  allowed: {
    kind: 'text',
    valid: (value) => value === '' || SPLIT_TEXT_KEYS.some((key) => key === value),
    example: 'lxx-greek',
    note: `one of ${SPLIT_TEXT_KEYS.join(', ')}, or empty for no text`,
  },
  parse: (raw) => (typeof raw === 'string' && (raw === '' || SPLIT_TEXT_KEYS.some((key) => key === raw)) ? raw : ''),
  section: 'tools',
  label: 'Split text',
  hint: 'The text the dock holds beside the passage.',
});

export type SplitLink = 'on' | 'off';

/** Whether the two panes of a text split keep to the same verse as either scrolls (the Link on the dock's handle row; mw-5r3p30.1130). On until he turns it off. */
export const splitLinkSetting = defineSetting<SplitLink>({
  key: 'splitLink',
  default: 'on',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'tools',
  label: 'Split link',
  hint: 'Keep the passage and the dock on the same verse as either scrolls.',
});

/** The settings of the split, for the tutor's table (src/tutor/knows.ts). */
export const SPLIT_SETTINGS = [readerSplitSetting, splitSizeSetting, splitMapSetting, splitTextSetting, splitLinkSetting] as const;
