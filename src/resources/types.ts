// src/resources/types.ts — what a study resource is. One resource is one file in this folder exporting a StudyResource, and one
// line in index.ts. A resource only builds links; it holds, fetches and shows no text of any lexicon (docs/resources.md).

/** The word a link is built for: the form as the text has it, its lemma (NFC) and its Strong's number ('G4903', no padding). */
export interface StudyWord {
  form: string;
  lemma: string;
  strongs: string;
}

export interface StudyLink {
  /** what the link says on the word sheet */
  label: string;
  /** https, or the scheme of an app the reader owns (accord:) */
  url: string;
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

export interface StudyResource {
  /** kept in the settings store, so it never changes: 'strongs' */
  id: string;
  /** the switch's name in Settings: 'Logos' */
  name: string;
  kind: 'number' | 'app';
  /** one line under the switch: what turning it on adds to the word sheet */
  describe: string;
  option?: ResourceOption;
  /** the links for `word`; `option` is what he typed in the field (empty or missing: the default) */
  linksFor(word: StudyWord, option?: string): StudyLink[];
}

/** The option's value to use: what he typed, trimmed, or the resource's default when it is empty. */
export function optionOf(resource: StudyResource, typed: string | undefined): string {
  return typed?.trim() || resource.option?.default || '';
}
