// The English font (Settings > Appearance, mw-5r3p30.311): the face of the English text, from src/appearance/fonts.ts. The Greek and the Hebrew
// keep theirs. src/appearance/appearanceSync.ts paints it.
import { DEFAULT_FONT, FONTS, type FontId } from '../../appearance/fonts';
import { defineSetting } from '../define';

export const fontSetting = defineSetting<FontId>({
  key: 'font',
  default: DEFAULT_FONT,
  allowed: { kind: 'choice', values: FONTS.map((f) => ({ value: f.id, label: f.label })) },
  section: 'appearance',
  label: 'Font',
  hint: 'The face of the English text; the Greek and the Hebrew keep theirs.',
  help: `The face of the English text, in the reader, the sheets and the screens; the Greek and the Hebrew keep theirs, and the size is the same. ${FONTS.map((f) => `${f.label}: ${f.line}`).join(' ')}`,
});
