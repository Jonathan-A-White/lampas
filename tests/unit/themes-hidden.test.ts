// Hiding a single theme (mw-qtu3zvz.91, docs/sermons.md 'Hiding a theme'): the hidden set is one setting kept on the phone ('themesHidden', the names, one a line); a hidden theme is left out of the Themes line, of 'On the same theme'
// and of the tutor's themes, and Show again brings it back. A name is hidden by its themeKey, so a theme two lists give under one name (mw-qtu3zvz.90) is hidden in both. The sources and sermons are the tests' own.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { sameThemeFor, sermonsFor } from '../../src/sermons';
import { talkSermonsFor } from '../../src/sermons/forTutor';
import { hiddenThemes, hideTheme, showTheme, themesFor } from '../../src/themes';
import { hiddenText, isHidden, parseHidden } from '../../src/themes/hidden';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../support/test-themes';

const here = { book: 'rom', chapter: 5, from: 8 };
const names = async () => (await themesFor(here)).map((theme) => theme.label);

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  registerTestThemes();
  registerTestSermons();
});
afterEach(() => {
  forgetTestThemes();
  forgetTestSermons();
});

describe('the hidden set as text', () => {
  it('is empty where nothing is saved, and reads a name a line, a name once whatever its case or punctuation', () => {
    expect(parseHidden(undefined)).toEqual([]);
    expect(parseHidden('')).toEqual([]);
    expect(parseHidden('Atonement\nLove-Hatred')).toEqual(['Atonement', 'Love-Hatred']);
    expect(parseHidden('Atonement\nATONEMENT.\n\n  \nGrace')).toEqual(['Atonement', 'Grace']);
  });

  it('says a name is hidden by its themeKey: the same name written two ways is one', () => {
    expect(isHidden('Atonement', ['atonement'])).toBe(true);
    expect(isHidden('FAITH.', ['Faith'])).toBe(true);
    expect(isHidden('Faith-Unbelief', ['Faith'])).toBe(false);
    expect(isHidden('Atonement', [])).toBe(false);
  });

  it('writes the names back a line each', () => {
    expect(hiddenText(['Atonement', 'Grace'])).toBe('Atonement\nGrace');
    expect(hiddenText([])).toBe('');
  });
});

describe('a phone with no hidden themes yet', () => {
  it('behaves as before: every theme of the verse', async () => {
    expect(await hiddenThemes()).toEqual([]);
    expect(await names()).toEqual(['Atonement', 'Love-Hatred', 'God']);
  });
});

describe('a hidden theme', () => {
  it('is left out of the verse\'s themes, and Show again brings it back', async () => {
    await hideTheme('Love-Hatred');
    expect(await hiddenThemes()).toEqual(['Love-Hatred']);
    expect(await names()).toEqual(['Atonement', 'God']);
    await showTheme('Love-Hatred');
    expect(await hiddenThemes()).toEqual([]);
    expect(await names()).toEqual(['Atonement', 'Love-Hatred', 'God']);
  });

  it('is kept across a reload: the set is a setting saved on the phone', async () => {
    await hideTheme('Atonement');
    expect((await db.settings.get('themesHidden'))?.value).toBe('Atonement');
    // a new start reads it from the store, with nothing held in memory
    expect(await names()).toEqual(['Love-Hatred', 'God']);
  });

  it('is hidden once however often it is hidden, and Show again of a theme not hidden changes nothing', async () => {
    await hideTheme('Atonement');
    await hideTheme('atonement');
    expect(await hiddenThemes()).toEqual(['Atonement']);
    await showTheme('Grace');
    expect(await hiddenThemes()).toEqual(['Atonement']);
  });

  it('is left out of the sermons on the same theme', async () => {
    const place = { book: 'rom', chapter: 5, from: 8 };
    const found = await sermonsFor(place);
    const topics = async () => (await sameThemeFor(place, found)).groups.map((group) => group.topic.label);
    expect(await topics()).toContain('Love-Hatred');
    await hideTheme('Love-Hatred');
    expect(await topics()).not.toContain('Love-Hatred');
    expect(await topics()).toContain('Atonement');
    await showTheme('Love-Hatred');
    expect(await topics()).toContain('Love-Hatred');
  });

  it('is left out of the themes the tutor is told, and of the sermons it came in by', async () => {
    const before = await talkSermonsFor(here);
    expect(before?.told.themes.map((t) => t.label)).toContain('Love-Hatred');
    await hideTheme('Love-Hatred');
    const after = await talkSermonsFor(here);
    expect(after?.told.themes.map((t) => t.label)).not.toContain('Love-Hatred');
    expect(after?.told.themes.map((t) => t.label)).toContain('Atonement');
    expect(after?.rows.some((row) => row.theme === 'Love-Hatred')).toBe(false);
  });

  it('is hidden in both lists that give it under one name', async () => {
    registerTestThemes({ second: true });
    await hideTheme('Commendation');
    expect((await themesFor(here)).map((theme) => theme.label)).toEqual(['Atonement', 'Love-Hatred', 'God']);
  });
});
