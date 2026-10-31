// A list in an answer of the Bible talk is read as speech (mw-5r3p30.928): 'First, Daniel...', never 'one dot' or a star, and a bulleted item is said as its own sentence.
// The rule that makes the tutor write such a list is in grinds/bible-talk.instructions/340-how-to-answer.md; the reference finder (Story A, mw-5r3p30.927) links what it names.
import { describe, expect, it } from 'vitest';
import { markdownToSpeech } from '../../src/markdown/plain';
import { answerRuns } from '../../src/speech/answerRuns';
import { referencesIn } from '../../src/markdown/verseLinks';

const TOP_FIVE = [
  'Here is a top five, ordered by how much light each throws on Revelation.',
  '',
  '1. **Daniel**, above all chapters 2, 7 and 10 to 12: the statue and the kingdoms, the Son of Man.',
  '2. **Ezekiel**, chapters 1 and 10, and 37 to 48: the throne, the scroll and the new temple.',
  '3. **Isaiah**, chapters 24 to 27 and 65: the new heavens and the new earth.',
  '4. **Zechariah**, chapter 4: the lampstand and the two olive trees.',
  '5. **Exodus**, chapters 7 to 12: the plagues and the passover lamb.',
].join('\n');

const said = (text: string): string =>
  answerRuns(text)
    .map((run) => run.text)
    .join(' ');

describe('a numbered list in an answer, read aloud', () => {
  it('opens each item with its ordinal word, with no digit, dot or star', () => {
    const speech = said(TOP_FIVE);
    expect(speech).toContain('First, Daniel, above all chapters 2, 7 and 10 to 12');
    expect(speech).toContain('Second, Ezekiel');
    expect(speech).toContain('Third, Isaiah');
    expect(speech).toContain('Fourth, Zechariah');
    expect(speech).toContain('Fifth, Exodus');
    expect(speech).not.toMatch(/\*|\b\d+\./);
    expect(speech).not.toMatch(/\bone dot\b/i);
  });

  it('gives each item its own stop so the voice pauses between items', () => {
    expect(markdownToSpeech('1. Read Daniel.\n2. Then Ezekiel\n3. Then Isaiah!')).toBe('First, Read Daniel. Second, Then Ezekiel. Third, Then Isaiah!');
  });

  it('says a number as the ordinal of its place in the list, and a long list as numbers', () => {
    expect(markdownToSpeech('1) one\n2) two')).toBe('First, one. Second, two.');
    expect(markdownToSpeech('11. the eleventh')).toBe('Number 11, the eleventh.');
  });

  it('reads a bulleted list item by item with no mark', () => {
    expect(markdownToSpeech('The synoptics:\n\n- Matthew has the sermon\n- Mark is shortest\n- Luke has the road to Emmaus')).toBe(
      'The synoptics: Matthew has the sermon. Mark is shortest. Luke has the road to Emmaus.',
    );
  });
});

describe('the references of a list answer', () => {
  it('are found whole, the short forms leaning on the book named in full first', () => {
    const written = referencesIn(TOP_FIVE).map((found) => found.as ?? found.written);
    expect(written).toEqual(expect.arrayContaining(['Daniel 2', 'Daniel 7', 'Daniel 10-12']));
  });
});
