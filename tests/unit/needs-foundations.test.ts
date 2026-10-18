// Ideas no parsing code names, but the text shows (mw-5r3p30.604, folds mw-86e9r1.37 .40 .42): a goal's needs list compound verbs, the marks that change
// a word, enclitics, words that sound alike and movable letters when a word of the passage shows them, and Learn next walks them in the ladder's order.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ladder } from '../../src/approaches/ladder';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import type { Chapter } from '../../src/data/chapter';
import type { Goal } from '../../src/data/goal';
import { learnNext } from '../../src/data/grammar/goalProgress';
import { ideaOf, ideasOfWord, LADDER } from '../../src/data/grammar/ladder';
import { passageNeeds, type Level } from '../../src/data/grammar/needs';
import { textIdeasOf } from '../../src/data/grammar/textIdeas';

const load = async (book: string, n: number): Promise<Chapter> => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const idsOf = async (goal: Goal): Promise<string[]> => (await passageNeeds(goal, load, BOOK_INDEX)).ideas.map((i) => i.id);
const word = (t: string, l: string, p: string) => ({ t, l, p });

describe('textIdeasOf', () => {
  it('names compound-verbs for a verb the compound data lists, whatever its form', () => {
    expect(textIdeasOf(word('ἐξεβάλομεν', 'ἐκβάλλω', 'V-AAI-1P'))).toContain('compound-verbs');
    expect(textIdeasOf(word('κατέβη', 'καταβαίνω', 'V-2AAI-3S'))).toContain('compound-verbs');
    expect(textIdeasOf(word('ἔβαλεν', 'βάλλω', 'V-2AAI-3S'))).not.toContain('compound-verbs');
  });

  it('names marks-change-word for either word of a pair, and not for a word with no twin', () => {
    expect(textIdeasOf(word('ἢ', 'ἤ', 'CONJ'))).toContain('marks-change-word');
    expect(textIdeasOf(word('Εἰ', 'εἰ', 'COND'))).toContain('marks-change-word');
    expect(textIdeasOf(word('λόγος', 'λόγος', 'N-NSM'))).not.toContain('marks-change-word');
  });

  it('names enclitics for the leaning forms of εἰμί, τις, ἐγώ and σύ, and not for εἶ or the question word', () => {
    expect(textIdeasOf(word('ἐστιν', 'εἰμί', 'V-PAI-3S'))).toContain('enclitics');
    expect(textIdeasOf(word('ἐστὶν', 'εἰμί', 'V-PAI-3S'))).toContain('enclitics');
    expect(textIdeasOf(word('εἶ', 'εἰμί', 'V-PAI-2S'))).not.toContain('enclitics');
    expect(textIdeasOf(word('ἦν', 'εἰμί', 'V-IAI-3S'))).not.toContain('enclitics');
    expect(textIdeasOf(word('τις', 'τις', 'X-NSM'))).toContain('enclitics');
    expect(textIdeasOf(word('τίς', 'τίς', 'I-NSM'))).not.toContain('enclitics');
    expect(textIdeasOf(word('μου', 'ἐγώ', 'P-1GS'))).toContain('enclitics');
    expect(textIdeasOf(word('σοι', 'σύ', 'P-2DS'))).toContain('enclitics');
    expect(textIdeasOf(word('ἐμοῦ', 'ἐγώ', 'P-1GS'))).not.toContain('enclitics');
  });

  it('names words-sound-alike for a word of the three pairs and movable-letters for οὐκ, ἐξ and an elided word', () => {
    expect(textIdeasOf(word('ὑμεῖς', 'σύ', 'P-2NP'))).toContain('words-sound-alike');
    expect(textIdeasOf(word('οὐκ', 'οὐ', 'PRT-N'))).toContain('movable-letters');
    expect(textIdeasOf(word('ἐξ', 'ἐκ', 'PREP'))).toContain('movable-letters');
    expect(textIdeasOf(word("ἀπ'", 'ἀπό', 'PREP'))).toContain('movable-letters');
    expect(textIdeasOf(word('λόγος', 'λόγος', 'N-NSM'))).toEqual([]);
  });

  it('is part of ideasOfWord, so every screen that reads a word reads it', () => {
    expect(ideasOfWord(word('ἐξεβάλομεν', 'ἐκβάλλω', 'V-AAI-1P'))).toContain('compound-verbs');
  });
});

describe('passageNeeds', () => {
  it('lists compound-verbs for Matthew 7:22', async () => {
    expect(await idsOf({ book: 'mat', chapter: 7, verse: 22 })).toContain('compound-verbs');
  });

  it.each([['rom'], ['1jn']])('lists marks-change-word and enclitics after punctuation for %s', async (book) => {
    const ids = await idsOf({ book });
    const at = (id: string) => ids.indexOf(id);
    expect(at('punctuation')).toBeGreaterThanOrEqual(0);
    expect(at('marks-change-word')).toBeGreaterThan(at('punctuation'));
    expect(at('enclitics')).toBeGreaterThan(at('marks-change-word'));
  });

  it('holds only ideas of the ladder', async () => {
    const known = new Set(LADDER.map((i) => i.id));
    for (const id of await idsOf({ book: 'rom' })) expect(known.has(id), id).toBe(true);
  });
});

describe('learnNext on the marks', () => {
  it("returns 'marks-change-word' and then 'enclitics' once everything before them is solid", async () => {
    const needs = await passageNeeds({ book: 'rom' }, load, BOOK_INDEX);
    const levels = new Map<string, Level>();
    const ids = needs.ideas.map((i) => i.id);
    const solidBefore = (stop: string) => {
      levels.clear();
      // every idea of the ladder below `stop`, whether or not the goal needs it, is solid
      for (const idea of LADDER) if (idea.rung < ideaOf(stop).rung) levels.set(idea.id, 'solid');
    };
    expect(ids).toContain('marks-change-word');
    solidBefore('marks-change-word');
    expect(learnNext(needs, ladder, levels)?.idea.id).toBe('marks-change-word');
    levels.set('marks-change-word', 'solid');
    solidBefore('enclitics');
    expect(learnNext(needs, ladder, levels)?.idea.id).toBe('enclitics');
  });
});
