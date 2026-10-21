// The first question of a paradigm table's talk (mw-irpgqi.3): it names the table and, when he is on one, the cell and the word he came from, so a first question
// 'why is this one different?' needs no explaining; with neither it is the table question it always was.
import { describe, expect, it } from 'vitest';
import { paradigmQuestion } from '../../src/services/talk';

describe('paradigmQuestion', () => {
  it('names the table and asks for its pattern when no cell is in focus', () => {
    expect(paradigmQuestion('The article', 2)).toContain('quiz me on the forms I have revealed');
    expect(paradigmQuestion('The article', 0)).toContain('have not revealed any form yet');
  });

  it('names the cell he is on with its form, or its place alone when the form is not shown', () => {
    expect(paradigmQuestion('The article', 1, { cell: { parse: 'Genitive Singular Feminine', form: 'τῆς' } })).toContain('looking at Genitive Singular Feminine: τῆς.');
    const locked = paradigmQuestion('The article', 0, { cell: { parse: 'Dative Plural Neuter' } });
    expect(locked).toContain('looking at Dative Plural Neuter.');
    expect(locked).not.toContain(': undefined');
  });

  it('names the word he came from', () => {
    const q = paradigmQuestion('Contract verbs', 1, { word: { form: 'ἀγαπῶ', parse: 'present active indicative, 1st person singular' } });
    expect(q).toContain('came to it from the word ἀγαπῶ (present active indicative, 1st person singular)');
  });
});
