// mw-qtu3zvz.179: the live example grc-dictation-sounds-alike-john-1-5 failed 8 runs in 20 on `words.9.mark` and `words.12.mark` held right. In every one of those runs the
// model wrote `written` = the request's word (σκοτία, κατέλαβεν) and still marked it wrong, 'the model has σκοτία with no accent': it reads the request's own accent as bare
// (mw-qtu3zvz.152 tried three rule wordings, .125 the `written` field). The app already shows such a word right (markedWords, isWrittenAsAsked, mw-qtu3zvz.254), and eval
// reads the raw answer, so the example holds what the app cannot repair: the page was read right, `written` equal to the word. Its mark lines stay out for these two words.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { markedWords, type CopyworkAnswer } from '../../src/practise/copywork';

const example = JSON.parse(readFileSync(resolve(__dirname, '../../grinds/examples/copywork/grc-dictation-sounds-alike-john-1-5.json'), 'utf8')) as {
  request: { words: string[]; language: 'grc' };
  expect: Record<string, { equals?: unknown; matches?: string; present?: boolean }>;
};

describe('grc-dictation-sounds-alike-john-1-5 holds what the app cannot repair', () => {
  it.each([9, 12])('holds word %i by its `written` (the page read right), not by a mark the app repairs', (i) => {
    expect(example.expect[`words.${i}.mark`]).toBeUndefined();
    expect(example.expect[`words.${i}.written`]).toEqual({ equals: example.request.words[i].normalize('NFC') });
  });

  it('keeps the marks of the words the app does not repair', () => {
    for (const i of [0, 1, 2, 3, 4, 7, 11]) expect(example.expect[`words.${i}.mark`]).toEqual({ equals: 'right' });
    expect(example.expect['words.5.mark']).toEqual({ equals: 'wrong' });
    expect(example.expect['words.6.mark']).toEqual({ equals: 'wrong' });
  });

  it('shows a word right that the model marked wrong with its written the same as the word (the recorded answers of the 20-run baseline)', () => {
    const { words } = example.request;
    const answer: CopyworkAnswer = {
      readable: true,
      fix_first: 'x',
      words: words.map((word, i) =>
        i === 9 || i === 12
          ? { word, written: word, mark: 'wrong' as const, problem: `you wrote ${word} with an acute on ί; the model has ${word} with no accent`, sounds_alike: false }
          : { word, written: word, mark: 'right' as const },
      ),
    };
    const shown = markedWords(example.request, answer);
    expect(shown?.[9]).toEqual({ word: 'σκοτία', mark: 'right' });
    expect(shown?.[12]).toEqual({ word: 'κατέλαβεν', mark: 'right' });
  });
});
