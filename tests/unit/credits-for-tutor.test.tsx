// What the tutor is told on About (mw-vtjxh4.2): every credit of ATTRIBUTION.md as a name, a use, a licence and a link. The About screen leaves them
// with the Ask the tutor control, the request built on About carries them, and the short list cannot drift from ATTRIBUTION.md.
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { About } from '../../src/About';
import { attribution, plainText } from '../../src/attribution';
import { NO_CHAPTER } from '../../src/data/chapter';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory, type TalkScope } from '../../src/services/talk';
import { CREDITS, MAX_CREDITS_BYTES } from '../../src/tutor/credits';
import { CREDIT_LICENCE_MAX, CREDIT_LINK_MAX, CREDIT_NAME_MAX, CREDIT_USE_MAX, MAX_CREDITS, fitScreen, suggestionsFor } from '../../src/tutor/screen';
import { screenContextNow } from '../../src/tutor/screenContext';

afterEach(cleanup);

const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;
const LINK = /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g;
const linksOf = (entry: string): string[] => [...entry.matchAll(LINK)].map((m) => m[1]);

describe('the credits the tutor is told', () => {
  it('give every credit a name, what it gives this reader, a licence and a link, within the limits', () => {
    expect(CREDITS.length).toBeLessThanOrEqual(MAX_CREDITS);
    for (const c of CREDITS) {
      expect(c.name, JSON.stringify(c)).not.toBe('');
      expect(c.use, c.name).not.toBe('');
      expect(c.licence, c.name).not.toBe('');
      expect(c.link, c.name).toMatch(/^https:\/\//);
      expect(c.name.length, c.name).toBeLessThanOrEqual(CREDIT_NAME_MAX);
      expect(c.use.length, c.name).toBeLessThanOrEqual(CREDIT_USE_MAX);
      expect(c.licence.length, c.name).toBeLessThanOrEqual(CREDIT_LICENCE_MAX);
      expect(c.link.length, c.name).toBeLessThanOrEqual(CREDIT_LINK_MAX);
    }
    expect(fitScreen({ name: 'About', facts: [], credits: CREDITS }).credits).toEqual(CREDITS);
  });

  it('cover every bullet of ATTRIBUTION.md, and each credit is found in a bullet: its name, its link and its licence', () => {
    const entries = attribution.entries;
    for (const entry of entries) {
      expect(CREDITS.some((c) => linksOf(entry).includes(c.link) && plainText(entry).includes(c.name)), plainText(entry).slice(0, 60)).toBe(true);
    }
    for (const c of CREDITS) {
      const home = entries.find((e) => linksOf(e).includes(c.link) && plainText(e).includes(c.name));
      expect(home, `${c.name} (${c.link}) is in no bullet of ATTRIBUTION.md`).toBeDefined();
    }
  });

  it('say the licence the bullet says', () => {
    const text = (name: string) => plainText(attribution.entries.find((e) => plainText(e).includes(name)) ?? '');
    const licence = (name: string) => CREDITS.find((c) => c.name === name)?.licence;
    expect(licence('TBESG')).toBe('CC BY 4.0');
    expect(text('TBESG')).toContain('CC BY 4.0');
    expect(licence('Majority Standard Bible')).toBe('Public domain');
    expect(text('Majority Standard Bible')).toContain('Public domain');
    for (const name of ['Gentium Plus', 'Noto Serif Hebrew']) expect(text(name)).toContain('SIL Open Font License 1.1');
    for (const name of ['React', 'Dexie', 'bsv-kit', 'react-markdown', 'Postern', 'Vite']) expect(text(name)).toMatch(new RegExp(`${licence(name)}`));
  });

  it('weigh little enough that the request still fits with some history', () => {
    expect(bytes(CREDITS)).toBeLessThanOrEqual(MAX_CREDITS_BYTES);
    const scope: TalkScope = { title: 'About', chapter: NO_CHAPTER, verse: null, screen: fitScreen({ name: 'About', facts: [], credits: CREDITS }) };
    const learner = 'solid 400 words; learning: ' + 'λόγος, '.repeat(12) + 'new today: x; due now: 12';
    const solid = Array.from({ length: 300 }, (_, i) => `λέξις${i}`);
    const request = buildTalkRequest(scope, 'Why do you credit all these?', [], solid, {}, undefined, learner);
    expect(bytes(fitHistory(request))).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });
});

describe('the request built on About', () => {
  const scope: TalkScope = { title: 'About', chapter: NO_CHAPTER, verse: null, screen: fitScreen({ name: 'About', facts: [], credits: CREDITS }) };

  it('carries every credit with its name, use and licence and its link, and no verse text', () => {
    const request = buildTalkRequest(scope, 'What does STEPBible give me?', [], ['θεός']);
    expect(request.reference).toBe('About');
    expect(request.screen?.credits).toHaveLength(CREDITS.length);
    for (const c of CREDITS) expect(request.screen?.credits).toContainEqual(c);
    expect('greek' in request).toBe(false);
    const tbesg = request.screen?.credits?.find((c) => c.name === 'TBESG');
    expect(tbesg).toMatchObject({ licence: 'CC BY 4.0', link: 'https://www.stepbible.org' });
  });

  it('is what the About screen leaves with the Ask the tutor control', () => {
    render(<About />);
    const context = screenContextNow();
    expect(context?.name).toBe('About');
    expect(context?.credits).toEqual(CREDITS);
    const bullets = readFileSync('ATTRIBUTION.md', 'utf8').split('\n').filter((l) => l.startsWith('- ')).length;
    expect(CREDITS.length).toBeGreaterThanOrEqual(bullets);
  });

  it('sends his own words nowhere it need not: the credits are the screen, not his solid words', () => {
    const request = buildTalkRequest(scope, 'Why do you credit all these?', [], Array.from({ length: 500 }, (_, i) => `λέξις${i}`));
    expect(request.solid_words).toEqual([]);
  });
});

describe('the questions About suggests', () => {
  it('are about the credits, and one asks why they are all credited', () => {
    const questions = suggestionsFor('About');
    expect(questions).toContain('Why do you credit all these?');
    expect(questions).toContain('What does STEPBible give me?');
    expect(questions.length).toBeLessThanOrEqual(3);
  });
});
