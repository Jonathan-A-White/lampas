// src/resources/workIds.ts — the ids the answer's `work` link may name (mw-rfjjzd.10): the id of a work of several volumes (WORK_GROUPS: Calvin's commentaries, the Institutes) and the Resource ID of every other
// commentary, grammar, Greek text or interlinear of the catalogue. `npm run grind:build` writes them into the `work` enum of grinds/bible-talk.answer.schema.json (scripts/grind-build.ts),
// as it writes the setting keys, so the enum is never typed by hand and an id the catalogue lacks cannot be named.
import { CATALOGUE, WORK_GROUPS, type Kind } from './catalogue';

/** The kinds of the catalogue the tutor is told of and may link: not the lexicons (the app draws their links from the pinned set), the Bibles or the devotionals. */
export const TUTOR_KINDS: readonly Kind[] = ['commentary', 'grammar', 'greek-text', 'interlinear'];

/** Every id a `work` link may name, the works first, then the books by Resource ID in the catalogue's order. */
export const WORK_LINK_IDS: readonly string[] = [...WORK_GROUPS.map((g) => g.id), ...CATALOGUE.filter((e) => e.work === undefined && TUTOR_KINDS.includes(e.kind)).map((e) => e.resource)];

type Json = Record<string, unknown>;

/** `schema` (the bible-talk answer schema) with the ids a `work` link may name set to exactly WORK_LINK_IDS. */
export function withWorkIds<T extends object>(schema: T): T {
  const links = ((schema as Json).properties as Json).links as Json;
  const options = (links.items as Json).anyOf as Json[];
  const work = options.find((o) => ((o.properties as Json).kind as Json).const === 'work');
  if (!work) throw new Error('the answer schema has no link of kind work');
  ((work.properties as Json).work as Json).enum = [...WORK_LINK_IDS];
  return schema;
}
