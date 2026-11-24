// Hands-free's 'Enduring Word' (mw-1l901so.3, features/enduring-word.feature has the whole path): the words that are the command, what it says where there is no chapter on screen or the book has no
// commentary, and the helpers that find the section's paragraph in the words the reader holds.
import { afterEach, describe, expect, it } from 'vitest';
import { route } from 'voice-kit/handsfree';
import { HELP_LINES, NO_COMMENTARY_ON, OPEN_A_CHAPTER, runCommand, SPOKEN_COMMANDS, withoutFiller } from '../../src/handsFree/commands';
import { sectionOfUrl, sectionStart } from '../../src/resources/enduringWord';
import { answerReadHere } from '../../src/nav/readerRequest';
import { openedText, closeSermonText } from '../../src/sermons/sermonText';

let spoken: string[] = [];
const hear = (words: string) =>
  runCommand(words, (text) => {
    spoken.push(text);
    return Promise.resolve();
  });

afterEach(() => {
  spoken = [];
  closeSermonText();
});

describe('the words', () => {
  it.each(['Enduring Word', 'enduring word', 'commentary', 'the commentary', 'what does Guzik say', 'what does David Guzik say', 'please open the commentary', 'read Enduring Word to me', 'listen to the commentary'])(
    "%s is the commentary, not 'read', 'open' or 'play'",
    (words) => {
      expect(route(withoutFiller(words), SPOKEN_COMMANDS)?.name).toBe('commentary');
    },
  );
  it("leaves 'read John 3' and 'open the tutor' to their own commands", () => {
    expect(route('read john 3', SPOKEN_COMMANDS)?.name).toBe('read');
    expect(route('open the tutor', SPOKEN_COMMANDS)?.name).toBe('tutor');
  });
  it('has a help line that says what to say', () => {
    const line = HELP_LINES.find((l) => l.name === 'commentary');
    expect(line?.example).toBe('Enduring Word');
    expect(route(line?.example ?? '', SPOKEN_COMMANDS)?.name).toBe('commentary');
  });
});

describe('where it cannot', () => {
  it('says to open a chapter first when none is on screen', async () => {
    await hear('Enduring Word');
    expect(spoken).toEqual([OPEN_A_CHAPTER]);
    expect(openedText()).toBeNull();
  });
  it('says there is none for a book the commentary does not have, and opens nothing', async () => {
    const off = answerReadHere(() => undefined, 'tob', 1, 1);
    await hear('commentary');
    off();
    expect(spoken).toEqual([NO_COMMENTARY_ON('Tobit')]);
    expect(openedText()).toBeNull();
  });
});

describe('the section in the words the reader holds', () => {
  const words = ['Opening.', '1. (1-3) First', 'a', '2. (4) Second', 'b', '3. (5-8) Third', 'c'];
  it('starts at the Nth outline heading', () => {
    expect(sectionStart(words, 1)).toBe(1);
    expect(sectionStart(words, 3)).toBe(5);
  });
  it('has none for a section the words do not have', () => {
    expect(sectionStart(words, 4)).toBeUndefined();
    expect(sectionStart(['no headings here'], 1)).toBeUndefined();
  });
  it("reads the section out of the page's address", () => {
    expect(sectionOfUrl('https://enduringword.com/bible-commentary/john-3/#section-6')).toBe(6);
    expect(sectionOfUrl('https://enduringword.com/bible-commentary/john-3/')).toBeUndefined();
  });
});
