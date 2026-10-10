// src/resources/accordance.ts — I have Accordance: an 'Open in Accordance' link that searches his own lexicon module (BDAG by default)
// for the word's headword, by Accordance's accord://search scheme (docs/resources.md).
import type { StudyResource } from './types';

export const accordance: StudyResource = {
  id: 'accordance',
  name: 'Accordance',
  kind: 'app',
  describe: 'Adds Open in Accordance: the word in your own lexicon in the Accordance app.',
  option: {
    label: 'Accordance resource',
    default: 'BDAG',
    hint: 'The lexicon module as Accordance names it, such as BDAG. Empty means BDAG.',
  },
  linksFor: (word, option) => {
    const lexicon = option?.trim() || 'BDAG';
    return [{ label: 'Open in Accordance', tile: lexicon, url: `accord://search/${encodeURIComponent(lexicon)}?${encodeURIComponent(word.lemma)}` }];
  },
};
