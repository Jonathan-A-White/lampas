// src/memorize/source.ts — the language a reference's own words are in (mw-gdcyf98.15): 'hbo' for the Old Testament, 'grc' for the New. The one place Memorize decides which dial and which script a verse follows.
import { listedOf } from '../lists/canonical';
import type { InterestLang } from '../settings/definitions/interest';

/** 'hbo' for a reference of the Old Testament, 'grc' for any other (the New Testament, and a string that names no verse). */
export const sourceOf = (canonical: string): InterestLang => (listedOf(canonical)?.testament === 'ot' ? 'hbo' : 'grc');
