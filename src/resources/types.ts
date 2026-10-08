// src/resources/types.ts — what a study resource is. One resource is one file in this folder exporting a StudyResource, and one
// line in index.ts. A resource only builds links; it holds, fetches and shows no text of any lexicon (docs/resources.md).

/** A verse as the data names it: the book's code ('act', as in public/data/index.json), the chapter and the verse. */
export interface StudyRef {
  book: string;
  chapter: number;
  verse: number;
}

/** The word a link is built for: the form as the text has it, its lemma (NFC), its Strong's number ('G4903', no padding)
 *  and, where the sheet knows it, the verse it was tapped in. */
export interface StudyWord {
  form: string;
  lemma: string;
  strongs: string;
  ref?: StudyRef;
}

export interface StudyLink {
  /** what the link says on the word sheet */
  label: string;
  /** the app's own scheme (logosres:, logos4:, accord:), or https for a web page */
  url: string;
  /** an https address opened only when `url` is an app scheme the phone could not open (src/resources/openApp.ts) */
  fallback?: string;
}

/** A text field a resource may ask for in Settings, such as the name of the lexicon in his own copy. */
export interface ResourceOption {
  /** the field's name in Settings: 'Logos resource' */
  label: string;
  /** what is used while the field is empty */
  default: string;
  /** one line under the field */
  hint: string;
}

/** A list of choices he ticks in Settings, such as the lexicons of his Logos library. Kept as a JSON array of ids. */
export interface ResourceChoices {
  /** the group's name in Settings: 'Logos lexicons' */
  label: string;
  /** one line under the group */
  hint: string;
  /** in the order Settings lists them; `id` is what is kept, so it never changes */
  items: { id: string; name: string }[];
  /** the ids ticked while none were kept */
  default: string[];
}

export interface StudyResource {
  /** kept in the settings store, so it never changes: 'strongs' */
  id: string;
  /** the switch's name in Settings: 'Logos' */
  name: string;
  kind: 'number' | 'app';
  /** one line under the switch: what turning it on adds to the word sheet */
  describe: string;
  option?: ResourceOption;
  choices?: ResourceChoices;
  /** the links for `word`; `option` is `optionOf(resource, kept)`: the typed field, or the ticked ids joined by a comma */
  linksFor(word: StudyWord, option?: string): StudyLink[];
}

/** The ids ticked in a kept JSON array; the default when nothing was kept or it cannot be read. */
export function tickedOf(resource: StudyResource, kept: string | undefined): string[] {
  const choices = resource.choices;
  if (!choices) return [];
  if (kept === undefined || kept === '') return choices.default;
  try {
    const ids: unknown = JSON.parse(kept);
    if (Array.isArray(ids)) return choices.items.filter((i) => ids.includes(i.id)).map((i) => i.id);
  } catch {
    // not JSON: nothing was kept
  }
  return choices.default;
}

/** The option's value to use: the ticked ids joined by commas (items' order) for a resource with choices; else what he typed, trimmed, or the
 *  resource's default when it is empty. */
export function optionOf(resource: StudyResource, kept: string | undefined): string {
  if (resource.choices) return tickedOf(resource, kept).join(',');
  return kept?.trim() || resource.option?.default || '';
}
