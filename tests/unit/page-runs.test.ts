// A line of a page of prose is read with each Greek or Hebrew stretch in its own voice (src/speech/pageRuns.ts).
import { describe, expect, it } from 'vitest';
import { pageRuns } from '../../src/speech/pageRuns';

describe('pageRuns', () => {
  it('keeps plain English as one run', () => {
    expect(pageRuns('Credit is owed whether or not a licence asks for it.')).toEqual([{ text: 'Credit is owed whether or not a licence asks for it.', language: 'english' }]);
  });

  it('puts each Greek phrase and each Hebrew word in a run of its own, in order', () => {
    expect(pageRuns('The word λόγος means word, and צֶדֶק is righteousness; ἐν ἀρχῇ begins John.')).toEqual([
      { text: 'The word', language: 'english' },
      { text: 'λόγος', language: 'greek' },
      { text: 'means word, and', language: 'english' },
      { text: 'צֶדֶק', language: 'hebrew' },
      { text: 'is righteousness;', language: 'english' },
      { text: 'ἐν ἀρχῇ', language: 'greek' },
      { text: 'begins John.', language: 'english' },
    ]);
  });

  it('leaves out a run with nothing to say', () => {
    expect(pageRuns(' — ')).toEqual([]);
    expect(pageRuns('λόγος, ')).toEqual([{ text: 'λόγος', language: 'greek' }]);
  });
});
