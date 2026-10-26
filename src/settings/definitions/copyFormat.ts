// When you copy (Settings > Reading, mw-9txn0x1.1): what the Verse view's Copy and Share give for a verse, a passage or a chapter (src/copy/format.ts copyText).
// Four rows, each a setting of its own: Text (as you read it | English | the original | both), Reference (after | before | off), Verse numbers (on | off), Link (on | off).
// The defaults copy the text as he reads it (his view on now, the Weave included), the reference after it, the verse numbers of more than one verse, and the link.
import { defineSetting } from '../define';
import type { CopyReference, CopyText, OnOffChoice } from '../../copy/format';

export const copyTextSetting = defineSetting<CopyText>({
  key: 'copyText',
  default: 'asread',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'asread', label: 'As you read it' },
      { value: 'english', label: 'English' },
      { value: 'original', label: 'The original' },
      { value: 'both', label: 'Both' },
    ],
  },
  section: 'reading',
  label: 'Copy: text',
  hint: 'When you copy: the words as you read them, in English, the Greek or Hebrew, or both.',
  help: 'What Copy and Share give for a verse, a passage or a chapter: **As you read it**, the default, the text in the view on now (English, Greek, Hebrew or the Weave); **English**; **The original**, Greek or Hebrew; or **Both**, English then the original.',
});

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
