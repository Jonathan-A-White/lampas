import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { attribution, parseAttribution, plainText } from '../../src/attribution';

const file = readFileSync('ATTRIBUTION.md', 'utf8');

describe('parseAttribution', () => {
  it('reads a title, an intro and bullets, joining continuation lines', () => {
    const doc = parseAttribution('# T\n\nIntro line.\n\n- **A.** one\n  two https://x.org/y.\n- three `c`\n');
    expect(doc.intro).toBe('Intro line.');
    expect(doc.entries).toEqual(['**A.** one two https://x.org/y.', 'three `c`']);
  });

  it('keeps every bullet of ATTRIBUTION.md as an entry', () => {
    const bullets = file.split('\n').filter((l) => l.startsWith('- ')).length;
    expect(parseAttribution(file).entries).toHaveLength(bullets);
  });

  it('turns markdown into plain text', () => {
    expect(plainText('**A.** see `f` and https://x.org/y.')).toBe('A. see f and https://x.org/y.');
  });
});

describe('ATTRIBUTION.md carries what CC BY 4.0 requires', () => {
  const text = plainText(file);
  it('names STEPBible, Tyndale House, the licence link and the changes', () => {
    expect(text).toContain('STEPBible');
    expect(text).toContain('Tyndale House');
    expect(file).toContain('[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)');
    expect(text).toContain('Changes:');
  });
  it('says the MSB is public domain', () => {
    expect(text).toMatch(/Majority Standard Bible[^]*Public domain/);
  });
});

describe('ATTRIBUTION.md credits Biblical Mastery Academy for the ladder', () => {
  const text = plainText(file);
  it('names Biblical Mastery Academy for the sequence and says the lessons are Lampas\'s own', () => {
    expect(text).toContain('Biblical Mastery Academy');
    expect(text).toMatch(/sequence/);
    expect(text).toMatch(/no course text, image or exercise/);
  });
  it('shows on the About screen', () => {
    expect(attribution.entries.some((e) => plainText(e).includes('Biblical Mastery Academy'))).toBe(true);
  });
});

// About is credits, not a tutorial (mw-5r3p30.875): each entry says what the source is, why it is in Lampas and what its licence needs, in four
// lines on a phone (about 200 characters). Only a notice a licence requires whole may run longer, and is named here with the most it may take.
describe('About is short credits, not a tutorial', () => {
  const ENTRY_MAX = 150; // about 36 characters a line at 390 px, so four lines; the story's own guide is 200
  // the credit and licence wording a licence asks to be kept whole: CC BY 4.0 (credit, link, changes) for STEPBible's three tables, the maps' required citation and the three OFL notices
  const LICENCE_NOTICES: [string, number][] = [['Tyndale House', 300], ['TIPNR', 260], ['Bible Mapper', 200], ['Literata', 340]];
  const plain = attribution.entries.map(plainText);
  const maxFor = (entry: string): number => LICENCE_NOTICES.find(([start]) => entry.startsWith(start))?.[1] ?? ENTRY_MAX;

  it('keeps the intro and every entry to 150 characters of rendered text (four lines on a phone), but the named licence notices', () => {
    expect(plainText(attribution.intro).length, 'the intro').toBeLessThanOrEqual(ENTRY_MAX);
    const long = plain.filter((entry) => entry.length > maxFor(entry)).map((entry) => `${entry.length}: ${entry.slice(0, 60)}`);
    expect(long, 'an entry is too long for four lines: say what it is and why, link, licence').toEqual([]);
  });

  it('lets only the named licence notices run past 150 characters', () => {
    expect(plain.filter((entry) => entry.length > ENTRY_MAX).length).toBeLessThanOrEqual(LICENCE_NOTICES.length + 1);
  });

  it('holds no how-to: no step in Settings, no tap, no switch to turn on', () => {
    for (const text of [plainText(attribution.intro), ...plain]) expect(text, text.slice(0, 60)).not.toMatch(/Settings >|\bin Settings\b|\b[Tt]ap\b|switch(ed)? (it )?on|turn(s|ed)? (it )?on/);
  });

  it('credits only what the app ships: no trial voice, no unlinked page', () => {
    expect(plainText(file)).not.toMatch(/Piper|Coqui|Chatterbox|sounds-trial|listening page|\btrial\b/i);
  });

  it('lets Hebrew stand beside Greek under Texts and data: a text, a lexicon and a type each', () => {
    const texts = attribution.sections.find((s) => s.title === 'Texts and data')?.entries.map(plainText) ?? [];
    const type = attribution.sections.find((s) => s.title === 'Type')?.entries.map(plainText) ?? [];
    for (const name of ['Westminster Leningrad Codex', 'TBESH', 'Berean Standard Bible']) expect(texts.some((e) => e.includes(name)), name).toBe(true);
    for (const name of ['Majority Standard Bible', 'TBESG']) expect(texts.some((e) => e.includes(name)), name).toBe(true);
    expect(type.some((e) => e.includes('Gentium Plus'))).toBe(true);
    expect(type.some((e) => e.includes('Noto Serif Hebrew'))).toBe(true);
    expect(plainText(file)).toMatch(/Israeli Hebrew/);
    expect(plainText(file)).not.toMatch(/Hebrew twin|its Hebrew/i);
  });
});
