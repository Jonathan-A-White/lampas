// mw-5r3p30.848: "what does the Hebrew say for fish?" is answered by writing the Hebrew in `answer`, with `words` left empty;
// `words` lists a Hebrew word only when he asks about it by its form or parsing. The two parts must agree (050 once said Hebrew never goes in `words`).
import { describe, expect, it } from 'vitest';
import { instructionParts, instructionsOf } from '../../scripts/grind-parts';

const flat = (s: string) => s.replace(/\s+/g, ' ');

describe('verse-ask: the Hebrew behind an English word', () => {
  it('says the Hebrew for an English word is written in answer, words left empty', () => {
    const part = instructionParts('verse-ask').find(({ file }) => file.endsWith('055-a-verse-of-the-old-testament.md'));
    expect(part, 'part 055').toBeDefined();
    const text = flat(part!.text);
    expect(text).toMatch(/Hebrew (behind|for) an English word[^.]*write(s|ing)? the Hebrew in `answer`[^.]*`words` (empty|stays empty|left empty)/);
    expect(text).toMatch(/`words` is for a word he asks about by its form or parsing/);
  });

  it('no longer says Hebrew never goes in words, so 050 agrees with 055', () => {
    expect(instructionsOf('verse-ask')).not.toContain('Hebrew never goes in `words`');
    const part = instructionParts('verse-ask').find(({ file }) => file.endsWith('050-hebrew-words.md'));
    expect(flat(part!.text)).toMatch(/`words`[^.]*`language` `he`/);
  });
});
