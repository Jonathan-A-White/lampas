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
  // the credit and licence wording a licence asks to be kept whole: CC BY 4.0 (credit, link, changes) for STEPBible's three tables, the maps' required citation and the three OFL notices; and the line of CCEL's terms the Spurgeon index is used under, quoted as the sermon-index source.toml has it
  // and the wake word's model (mw-rl10piw.6): CC BY 4.0 data named with its changes, and every file voice-kit's licences.json lists as used to make it
  const LICENCE_NOTICES: [string, number][] = [['Tyndale House', 300], ['TIPNR', 260], ['Bible Mapper', 200], ['Literata', 340], ['Spurgeon', 260], ['Hey Lampas wake word', 460]];
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

  // mw-5r3p30.1187: the MSB, Berean and Swete entries sat at 145, 150 and 146, so a change to what a text is used for (the poetry lines) had no room;
  // each keeps 30 characters free, so a longer Changes line still passes
  it('leaves the MSB, Berean and Swete entries 30 characters of room under the limit for a longer Changes line', () => {
    for (const name of ['Majority Standard Bible', 'Berean Standard Bible', 'Swete\'s Septuagint']) {
      const entry = plain.find((e) => e.startsWith(name)) ?? '';
      expect(entry, name).not.toBe('');
      expect(entry.length, name).toBeLessThanOrEqual(ENTRY_MAX - 30);
    }
  });

  it('holds no how-to: no step in Settings, no tap, no switch to turn on', () => {
    for (const text of [plainText(attribution.intro), ...plain]) expect(text, text.slice(0, 60)).not.toMatch(/Settings >|\bin Settings\b|\b[Tt]ap\b|switch(ed)? (it )?on|turn(s|ed)? (it )?on/);
  });

  it('credits only what the app ships: no trial voice, no unlinked page', () => {
    // the one place Coqui may stand is the wake word's bullet: the model Lampas ships was trained on sayings its VCTK VITS voice spoke (voice-kit's licences.json,
    // mw-rl10piw.6); the letter-sound trial's voices are still credited nowhere, and the voice the model's makers did not use (Piper) nowhere at all
    const wake = attribution.entries.find((e) => plainText(e).startsWith('Hey Lampas wake word')) ?? '';
    const lines = file.split('\n');
    const at = lines.findIndex((l) => l.startsWith('- **[Hey Lampas wake word]'));
    let end = at + 1;
    while (at >= 0 && end < lines.length && lines[end].startsWith('  ')) end++;
    const others = at >= 0 ? [...lines.slice(0, at), ...lines.slice(end)].join('\n') : file;
    expect(plainText(others)).not.toMatch(/Piper|Coqui|Chatterbox|sounds-trial|listening page|\btrial\b/i);
    expect(plainText(wake)).not.toMatch(/Piper|Chatterbox|sounds-trial|listening page|\btrial\b/i);
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

// the poetry lines (mw-5r3p30.1166): the MSB and Berean tables' lines and indents are drawn in the English tab and borrowed for the Greek tab, so About names them
// (mw-5r3p30.1186: a revert for the 150-character limit had dropped the credit; the two entries are worded to hold both)
describe('ATTRIBUTION.md credits the tables for the poetry lines', () => {
  it('says the MSB and the Berean entries keep the table\'s poetry lines', () => {
    for (const name of ['Majority Standard Bible', 'Berean Standard Bible']) {
      const entry = attribution.entries.map(plainText).find((e) => e.startsWith(name)) ?? '';
      expect(entry, name).toMatch(/poetry lines/);
    }
  });
});
