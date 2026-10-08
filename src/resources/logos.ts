// src/resources/logos.ts — I have Logos: an 'Open in Logos' link to the word's headword in his own lexicon (BDAG by default).
// A ref.ly logosres link opens the resource in the Logos app on the phone (docs/resources.md names where the form is documented).
import type { StudyResource } from './types';

export const logos: StudyResource = {
  id: 'logos',
  name: 'Logos',
  kind: 'app',
  describe: 'Adds Open in Logos: the word in your own lexicon in the Logos app.',
  option: {
    label: 'Logos resource',
    default: 'bdag',
    hint: 'The lexicon as Logos names it, such as bdag. Empty means bdag.',
  },
  linksFor: (word, option) => [
    { label: 'Open in Logos', url: `https://ref.ly/logosres/${encodeURIComponent(option?.trim() || 'bdag')}?hw=${encodeURIComponent(word.lemma)}` },
  ],
};
