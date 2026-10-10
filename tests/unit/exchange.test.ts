import { describe, expect, it } from 'vitest';
import { exchangeMarkdown, exchangeReference } from '../../src/share/exchange';
import { LINK_ORIGIN } from '../../src/config';

describe('exchangeReference', () => {
  it('names a verse, a passage and a chapter, each with its Lampas link', () => {
    expect(exchangeReference('rom.8.28')).toEqual({ label: 'Romans 8:28', url: `${LINK_ORIGIN}/#/?ref=Rom.8.28` });
    expect(exchangeReference('rom.8.1-11')).toEqual({ label: 'Romans 8:1-11', url: `${LINK_ORIGIN}/#/?ref=Rom.8.1-11` });
    expect(exchangeReference('rom.8')).toEqual({ label: 'Romans 8', url: `${LINK_ORIGIN}/#/?ref=Rom.8` });
    expect(exchangeReference('1jn.1.9')).toEqual({ label: '1 John 1:9', url: `${LINK_ORIGIN}/#/?ref=1John.1.9` });
  });

  it('takes a quiz talk for the passage it quizzes on', () => {
    expect(exchangeReference('rom.8.1-11:quiz')).toEqual({ label: 'Romans 8:1-11', url: `${LINK_ORIGIN}/#/?ref=Rom.8.1-11` });
  });

  it('gives a talk from a screen the app itself and the screen name', () => {
    expect(exchangeReference('screen.my-study-way')).toEqual({ label: 'Lampas: my study way', url: LINK_ORIGIN });
  });

  it('falls back to the app for a key it does not know', () => {
    expect(exchangeReference('whatever')).toEqual({ label: 'Lampas', url: LINK_ORIGIN });
  });
});

describe('exchangeMarkdown', () => {
  it('writes the reference as a link, the question after **Q:** and then the answer as it is', () => {
    expect(exchangeMarkdown('rom.8.28', 'Why?', 'Because **God** works.\n\n- one\n- two')).toBe(
      `[Romans 8:28](${LINK_ORIGIN}/#/?ref=Rom.8.28)\n\n**Q:** Why?\n\nBecause **God** works.\n\n- one\n- two`,
    );
  });

  it('keeps a question of several lines on its own lines', () => {
    expect(exchangeMarkdown('rom.8', 'One.\nTwo.', 'A.')).toContain('**Q:** One. Two.\n\nA.');
  });
});
