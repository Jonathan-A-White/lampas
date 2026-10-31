import { describe, expect, it } from 'vitest';
import { talkPlainText } from '../../src/talk/talkText';
import type { TalkTurn } from '../../src/data/repositories/talks';

const turn = (q: string, a: string, extra: Partial<TalkTurn> = {}): TalkTurn => ({ ref: 'rom.8.28', q, a, words: [], when: 1, ...extra });

describe('talkPlainText (Copy the whole talk, mw-5r3p30.930)', () => {
  it('writes the place, then each of his questions and each answer in order, as plain text', () => {
    const text = talkPlainText('rom.8.28', [turn('Why?', 'Because **God** works.\n\n- one\n- two'), turn('And then?', 'He finishes it.')]);
    expect(text).toBe(
      ['Talk about Romans 8:28', '', 'Me: Why?', '', 'Tutor: Because God works.', '', '- one', '- two', '', 'Me: And then?', '', 'Tutor: He finishes it.'].join('\n'),
    );
  });

  it('writes a link as its words and a reference out as the passage it names, with no addresses', () => {
    const text = talkPlainText('rom.8', [
      turn('Where else?', 'See [Philippians 4:13](https://lampas.allmymind.org/#/?ref=Phil.4.13) and `agapaō`, and [here](https://example.com/x).'),
    ]);
    expect(text).toContain('Tutor: See Philippians 4:13 and agapaō, and here.');
    expect(text).not.toMatch(/https?:|\]\(|\*\*|`/);
  });

  it('gives his question as the screen shows it (cleaned when the tutor cleaned it)', () => {
    expect(talkPlainText('rom.8.28', [turn('um why is it', 'It is.', { cleanQ: 'Why is it so?' })])).toContain('Me: Why is it so?');
  });

  it('names a chapter, a passage and a talk from a screen', () => {
    expect(talkPlainText('rom.8', [turn('q', 'a')]).split('\n')[0]).toBe('Talk about Romans 8');
    expect(talkPlainText('rom.8.1-11:quiz', [turn('q', 'a')]).split('\n')[0]).toBe('Talk about Romans 8:1-11');
    expect(talkPlainText('screen.my-study-way', [turn('q', 'a')]).split('\n')[0]).toBe('Talk about Lampas: my study way');
  });

  it('is empty for a talk with no turns', () => {
    expect(talkPlainText('rom.8.28', [])).toBe('');
  });
});
