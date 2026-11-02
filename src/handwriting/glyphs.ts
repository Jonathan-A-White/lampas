// src/handwriting/glyphs.ts — the strokes of every glyph Write it knows, Greek and Hebrew (mw-5r3p30.913), found by the glyph. The checker (recognizer.ts) compares a writing with the
// templates of ONE script, so a Hebrew letter is never taken for a Greek one nor the reverse; the model Write it draws and the line under it look a glyph up here.
import { HEBREW_STROKES, HEBREW_STROKE_NOTES } from './hebrewTemplates';
import { GLYPHS, STROKE_NOTES, type Variant } from './templates';

/** The scripts Write it has strokes for: Koine Greek ('grc') and Biblical Hebrew ('hbo'). */
export type WriteScript = 'grc' | 'hbo';

/** The script a glyph is written in: Hebrew for a letter of the Hebrew block, else Greek. */
export const scriptOfGlyph = (glyph: string): WriteScript => (/^[֐-׿]/u.test(glyph) ? 'hbo' : 'grc');

/** The glyphs (letter -> its ways of being written) of a script. */
export const glyphsOfScript = (script: WriteScript): Readonly<Record<string, readonly Variant[]>> => (script === 'hbo' ? HEBREW_STROKES : GLYPHS);

/** The ways a glyph is written, Greek or Hebrew; none for a glyph that has no strokes. */
export const variantsOf = (glyph: string): readonly Variant[] | undefined => {
  const all = glyphsOfScript(scriptOfGlyph(glyph));
  return Object.prototype.hasOwnProperty.call(all, glyph) ? all[glyph] : undefined;
};

/** What each stroke of a glyph drawn with more than one is, in the order its first variant draws them. */
export const strokeNotesOf = (glyph: string): readonly string[] | undefined => {
  const notes = scriptOfGlyph(glyph) === 'hbo' ? HEBREW_STROKE_NOTES : STROKE_NOTES;
  return Object.prototype.hasOwnProperty.call(notes, glyph) ? notes[glyph] : undefined;
};
