// When you copy (Settings > Reading, mw-9txn0x1.1): what the Verse view's Copy and Share give for a verse, a passage or a chapter (src/copy/format.ts copyText).
// Three rows, each a setting of its own: Reference (after | before | off), Verse numbers (on | off), Link (on | off).
// Copy always gives the text as he reads it (his view on now, the Weave and the variants included; the Text row went in mw-5r3p30.873); the defaults put the reference after it, number the verses of more than one verse, and add the link.
import { defineSetting } from '../define';
import type { CopyReference, OnOffChoice } from '../../copy/format';

export const copyReferenceSetting = defineSetting<CopyReference>({
  key: 'copyReference',
  default: 'after',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'after', label: 'After' },
      { value: 'before', label: 'Before' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'reading',
  label: 'Copy: reference',
  hint: 'When you copy: the reference after the words, before them, or left out.',
  help: 'Where Copy puts the reference, such as Colossians 3:1 (MSB): **After**, the default; **Before**; or **Off**.',
});

export const copyNumbersSetting = defineSetting<OnOffChoice>({
  key: 'copyNumbers',
  default: 'on',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'reading',
  label: 'Copy: verse numbers',
  hint: 'When you copy more than one verse: each verse led by its number.',
  help: 'Number each verse of a passage or chapter; a single verse never is.',
});

export const copyLinkSetting = defineSetting<OnOffChoice>({
  key: 'copyLink',
  default: 'on',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'reading',
  label: 'Copy: link',
  hint: 'When you copy: the link to the verse on a last line of its own.',
  help: 'End with the https link that opens it in Lampas; Share sends the link too.',
});
