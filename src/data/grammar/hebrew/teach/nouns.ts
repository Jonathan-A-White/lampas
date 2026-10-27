// src/data/grammar/hebrew/teach/nouns.ts — the cards of the Hebrew nouns tier (mw-gdcyf98.12): gender, number, the article, the construct state and the pronominal suffixes. Written so a total beginner learns
// the idea from the card alone, with worked words from Genesis 1 and Jonah 1 (tests/unit/hebrew-ladder.test.ts reads each against public/data). A card names no sound: that is the Israeli scheme's.
import type { Teach } from '../../teach/types';

export const NOUNS_TEACH: Readonly<Record<string, Teach>> = {
  'he-gender': {
    whatItIs: 'Every Hebrew noun is masculine or feminine; there is no ‘it’. A word has its gender even when it names a thing: a day is masculine, the earth is feminine. A word that describes the noun takes the same gender.',
    howToSpot: 'Look at the end of the word. A ה with a qamats before it, or a ת, marks a feminine. A noun with neither is usually masculine, but a few are feminine with no ending.',
    table: {
      caption: 'Masculine and feminine',
      columns: ['masculine', 'feminine'],
      rows: [
        { label: 'great', cells: ['גָּדוֹל', 'גְּדוֹלָה'] },
        { label: 'living', cells: ['חַי', 'חַיָּה'] },
        { label: 'one', cells: ['אֶחָד', 'אַחַת'] },
      ],
      note: 'The feminine ends in ה with a qamats before it, or in ת.',
    },
    worked: [
      { word: 'בְּהֵמָה', ref: 'Genesis 1:24', gloss: 'livestock', steps: ['The word ends in ה he, with a qamats under the letter before it. That ending marks a feminine noun.', 'So בְּהֵמָה is feminine, and a word that describes it will be feminine too.'] },
      { word: 'יוֹם', ref: 'Genesis 1:5', gloss: 'day', steps: ['The word ends in ם mem. It has no ה or ת ending.', 'So it is an ordinary masculine noun.'] },
      { word: 'אֶרֶץ', ref: 'Genesis 1:10', gloss: 'earth', steps: ['The word ends in ץ tsade, with no feminine ending.', 'But אֶרֶץ is feminine all the same: a few nouns are, and each is learned one by one.'] },
    ],
  },
  'he-number': {
    whatItIs: 'A Hebrew noun is singular (one), plural (many) or dual (a pair). The plural of a masculine noun usually ends in ים, and of a feminine noun in ות. The dual is for things that come in twos, such as hands.',
    howToSpot: 'Look at the last letters. ים or ות marks a plural, and ַיִם a pair. A singular has neither. A few words are plural in form but one in meaning, such as אֱלֹהִים ‘God’.',
    table: {
      caption: 'Singular, plural and dual',
      columns: ['singular', 'plural', 'dual'],
      rows: [
        { label: 'day', cells: ['יוֹם', 'יָמִים', ''] },
        { label: 'sea', cells: ['יָם', 'יַמִּים', ''] },
        { label: 'hand', cells: ['יָד', 'יָדוֹת', 'יָדַיִם'] },
      ],
    },
    worked: [
      { word: 'יַמִּים', ref: 'Genesis 1:10', gloss: 'seas', steps: ['The word ends in ים: a masculine plural.', 'Take that ending away and what is left is the singular יָם ‘sea’.'] },
      { word: 'שָׁמָיִם', ref: 'Genesis 1:8', gloss: 'heavens', steps: ['The word ends in ָיִם, the ending of a pair.', 'Hebrew thinks of the heavens as a pair, so the word has a dual ending.'] },
      { word: 'מַיִם', ref: 'Genesis 1:6', gloss: 'water', steps: ['The word ends in ַיִם, which looks like the ending of a pair.', 'But water is many drops, and the word always works as a plural.'] },
    ],
  },
  'he-article': {
    whatItIs: 'Hebrew has a word for ‘the’ and none for ‘a’. ‘The’ is not a separate word: it is the letter ה written on the front of the noun. So הָאָרֶץ is ‘the earth’. A name needs no article.',
    howToSpot: 'Look for ה at the front of a word, with a patach under it and a dagesh in the next letter: הַיּוֹם. Before א, ע or ר no dagesh can be written, and the vowel under ה is a qamats.',
    table: {
      caption: 'A noun without and with the article',
      columns: ['no article', 'the article'],
      rows: [
        { label: 'day', cells: ['יוֹם', 'הַיּוֹם'] },
        { label: 'earth', cells: ['אֶרֶץ', 'הָאָרֶץ'] },
        { label: 'light', cells: ['אוֹר', 'הָאוֹר'] },
        { label: 'heavens', cells: ['שָׁמַיִם', 'הַשָּׁמַיִם'] },
      ],
    },
    worked: [
      { word: 'הָאָרֶץ', ref: 'Genesis 1:1', gloss: 'the earth', steps: ['The word begins with ה he and a qamats: that is the article, ‘the’.', 'What is left is אֶרֶץ ‘earth’. Its first letter, א alef, cannot take a dagesh, so the vowel under ה is a qamats.'] },
      { word: 'הַיּוֹם', ref: 'Genesis 1:14', gloss: 'the day', steps: ['The word begins with ה he and a patach: the article.', 'The next letter, י yod, has a dagesh, a dot inside it. What is left is יוֹם ‘day’.'] },
      { word: 'הַשָּׁמַיִם', ref: 'Genesis 1:1', gloss: 'the heavens', steps: ['The word begins with ה he and a patach: the article.', 'ש shin has a dagesh, and what is left is שָׁמַיִם ‘heavens’.'] },
    ],
  },
  'he-construct': {
    whatItIs: 'Hebrew writes ‘the face of the waters’ with no word for ‘of’. The first noun is changed, usually shortened, and leans on the second. It is in the construct state, and it never has the article.',
    howToSpot: 'Look for two nouns side by side. The first has a clipped ending: a feminine ה becomes ת, and a plural ים becomes י. The second tells what the first is ‘of’.',
    table: {
      caption: 'The same noun alone and in the construct state',
      columns: ['alone', 'construct'],
      rows: [
        { label: 'beast', cells: ['חַיָּה', 'חַיַּת'] },
        { label: 'face', cells: ['פָּנִים', 'פְּנֵי'] },
        { label: 'God', cells: ['אֱלֹהִים', 'אֱלֹהֵי'] },
      ],
    },
    worked: [
      { word: 'פְּנֵי', ref: 'Genesis 1:2', gloss: 'face of', steps: ['The word ends in י, where the plural would end in ים: a plural construct.', 'It leans on the noun after it, הַמָּיִם, so פְּנֵי הַמָּיִם is ‘the face of the waters’.'] },
      { word: 'חַיַּת', ref: 'Genesis 1:25', gloss: 'beast of', steps: ['The feminine ending ה has become ת: the construct of חַיָּה.', 'It leans on הָאָרֶץ, so חַיַּת הָאָרֶץ is ‘the beast of the earth’.'] },
      { word: 'אֱלֹהֵי', ref: 'Jonah 1:9', gloss: 'God of', steps: ['The plural ending ים of אֱלֹהִים has become י.', 'It leans on the noun after it: ‘the God of heaven’.'] },
    ],
  },
  'he-suffix-pronominal': {
    whatItIs: 'A pronoun can be written on the end of a word. On a noun it means ‘my’, ‘your’ or ‘his’. On a preposition it means ‘me’, ‘you’ or ‘him’. The word it joins is changed, as a construct is.',
    howToSpot: 'Look at the end of a noun or a preposition for a small extra piece, such as ךָ ‘your’ or וֹ ‘his’. Then ask which noun or preposition is left once it is taken away.',
    table: {
      caption: 'Some suffixes on a noun',
      columns: ['suffix', 'example'],
      rows: [
        { label: 'his', cells: ['וֹ', 'בְּצַלְמוֹ'] },
        { label: 'her', cells: ['הּ', 'שְׂכָרָהּ'] },
        { label: 'your (one man)', cells: ['ךָ', 'אַרְצֶךָ'] },
        { label: 'our', cells: ['נוּ', 'בְּצַלְמֵנוּ'] },
        { label: 'their', cells: ['הֶם', 'לְמִינֵהֶם'] },
      ],
      note: 'The parsing gives a suffix as a second group, such as third person masculine singular.',
    },
    worked: [
      { word: 'בְּצַלְמוֹ', ref: 'Genesis 1:27', gloss: 'in his image', steps: ['It begins with בְּ ‘in’, then the noun צֶלֶם ‘image’.', 'The ending וֹ is the suffix ‘his’: ‘in his image’.'] },
      { word: 'אַרְצֶךָ', ref: 'Jonah 1:8', gloss: 'your country', steps: ['The noun is אֶרֶץ ‘country’, a little changed.', 'The ending ךָ is the suffix ‘your’.'] },
      { word: 'אֵלָיו', ref: 'Jonah 1:6', gloss: 'to him', steps: ['The preposition is אֶל ‘to’, a little changed.', 'The ending יו is the suffix ‘him’.'] },
    ],
  },
};
