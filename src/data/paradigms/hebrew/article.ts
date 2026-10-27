// src/data/paradigms/hebrew/article.ts — the article's vowel changes (mw-gdcyf98.13, PROVISIONAL): a noun and the same noun with the article, before a plain letter (יוֹם → הַיּוֹם, the dagesh in the yod), before a guttural or resh
// (אֶרֶץ → הָאָרֶץ, the vowel under ה lengthens to qamats) and before a qamats-first guttural (עָנָן → הֶעָנָן, segol) = 3 rows x 2 columns. A bare noun names only he-gender and is never a word's own cell; the form with the
// article names he-article and the vowel it shows.
import type { Paradigm, ParadigmRow } from '../types';

// [row label, bare noun, with the article, the vowel idea of the article's ה, the kind the cell's tag names]
const KINDS: [string, string, string, string[], string][] = [
  ['Before a plain letter', 'יוֹם', 'הַיּוֹם', ['he-vowel-patach', 'he-dagesh'], 'plain'],
  ['Before a guttural', 'אֶרֶץ', 'הָאָרֶץ', ['he-vowel-qamats'], 'guttural'],
  ['Before a qamats-first noun', 'עָנָן', 'הֶעָנָן', ['he-vowel-segol'], 'qamats'],
];

export const ARTICLE_HEBREW: Paradigm = {
  id: 'he-article',
  name: 'The Hebrew article',
  about: 'a noun, and the noun with ‘the’: יוֹם → הַיּוֹם, אֶרֶץ → הָאָרֶץ',
  ideas: ['he-article'],
  tier: 'nouns',
  columns: [{ label: 'Noun' }, { label: 'With the article', short: 'With ‘the’' }],
  rows: KINDS.map(([label, bare, definite, vowels, kind]): ParadigmRow => ({
    label,
    cells: [
      { form: bare, lang: 'he', ideas: ['he-gender'], tags: [`article:${kind}`, 'with:bare'] },
      { form: definite, lang: 'he', ideas: ['he-article', ...vowels], tags: [`article:${kind}`, 'with:article'] },
    ],
  })),
};
