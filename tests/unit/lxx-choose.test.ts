// The Septuagint derivation's model-choice runner (scripts/lxx/batches.ts, pending.ts, choose.ts; docs/lxx-derivation.md 'A model session'; story mw-u2w5klk.5), on
// the fixtures of tests/unit/lxx-parser.test.ts (its header says how they were cut), never the network and never a paid API.
// tests/fixtures/lxx/choices-gen-1.txt is a choices file for Gen 1's pending words in the shape a model session writes (ref parsing [lemma] [?|guess]).
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { BATCH_SIZE, batchName, batchesOf, chapterOf, cutBatches, nameRefs, runBatches } from '../../scripts/lxx/batches';
import { ChooseRefused, checkChoices, parseModelLines, runChoose } from '../../scripts/lxx/choose';
import { CONFIDENCE_CHOSEN, CONFIDENCE_GUESS, CONFIDENCE_UNSURE, NOTE_GUESS_NO_CANDIDATE, NOTE_UNSURE, applyChoices, readChoiceDir, readChoices } from '../../scripts/lxx/choices';
import { deriveBook, type DeriveInput, type PendingWord } from '../../scripts/lxx/derive';
import { RECHECK_FRACTION, recheckSample, runPending } from '../../scripts/lxx/pending';
import { runReport } from '../../scripts/lxx/report';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8');
const tagnt = [fixture('tagnt-slice.tsv')];
const tbesg = fixture('tbesg-slice.txt');
function swete(file: string): DeriveInput {
  const [versification, words] = fixture(file).split('\n\n');
  return { versification, words, tagnt, tbesg };
}
const GEN_1 = swete('swete-gen-1.csv');
const CHOICES = fixture('choices-gen-1.txt');

/** Gen 1 and a copy of it as Gen 2 (the lines of the copy numbered 10,000 further on): two chapters with the same pending words. */
function twoChapters(): DeriveInput {
  const OFFSET = 10000;
  const shifted = (block: string, rename: (text: string) => string): string =>
    block
      .split('\n')
      .filter((l) => l.includes('\t'))
      .map((l) => {
        const tab = l.indexOf('\t');
        return `${Number(l.slice(0, tab)) + OFFSET}\t${rename(l.slice(tab + 1))}`;
      })
      .join('\n');
  return {
    ...GEN_1,
    versification: `${GEN_1.versification.trimEnd()}\n${shifted(GEN_1.versification, (t) => t.replace('Gen.1:', 'Gen.2:'))}\n`,
    words: `${GEN_1.words.trimEnd()}\n${shifted(GEN_1.words, (t) => t)}\n`,
  };
}

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const gen = deriveBook(GEN_1, 'gen');
const GREEK_LETTER = /[Ͱ-Ͽἀ-῿]/;

/** The choices file written to a temporary place: `edit` changes its lines first. */
function choicesFile(edit: (lines: string[]) => string[] = (l) => l): string {
  const path = join(tmp(), 'choices.txt');
  writeFileSync(path, edit(CHOICES.split('\n')).join('\n'));
  return path;
}
const without = (ref: string) => (lines: string[]): string[] => lines.filter((l) => !l.startsWith(`${ref} `));
const fileLines = (path: string): string[] => readFileSync(path, 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));

const pending = (outDir: string, argv: string[] = ['--book', 'gen', '--batch', '1']) => runPending(argv, { input: GEN_1, outDir });
const choose = (outDir: string, from: string, argv: string[] = ['--book', 'gen', '--batch', '1']) => runChoose([...argv, '--from', from], { input: GEN_1, outDir });

describe('lxx:pending and lxx:batches', () => {
  it('lists every pending word of the chapter under its verse, with its candidates, in the text’s order', async () => {
    const outDir = tmp();
    const lines: string[] = [];
    const out = await runPending(['--book', 'gen', '--batch', '1'], { input: GEN_1, outDir, log: (l) => lines.push(l) });
    expect(out.words.map((w) => w.ref)).toEqual(gen.pending.map((p) => p.ref));
    expect(out.words).toHaveLength(163);
    // stdout and data/lxx/pending/gen-01.md carry the same listing
    expect(lines.join('\n')).toContain(out.text.trimEnd());
    expect(out.path).toBe(join(outDir, 'pending', 'gen-01.md'));
    expect(readFileSync(out.path, 'utf8')).toBe(out.text);
    // every pending word has a line of its own: ref, its form, its candidates (lemma, parsing, support)
    const text = out.text.split('\n');
    const at = (ref: string): string => text.find((l) => l.startsWith(`${ref} `))!;
    let from = -1;
    for (const p of gen.pending) {
      const line = at(p.ref);
      expect(line, p.ref).toBeTruthy();
      const index = text.indexOf(line);
      expect(index, `${p.ref} in the text's order`).toBeGreaterThan(from);
      from = index;
      for (const c of p.candidates) expect(line).toContain(`${c.lemma} ${c.morph} (${c.support})`);
    }
    // a word with no candidate says so
    expect(at('Gen.1:14#5')).toContain('no candidate');
    expect(at('Gen.1:20#10')).toContain('no candidate');
    expect(at('Gen.1:2#9')).not.toContain('no candidate');
  });

  it('shows each verse once, the whole verse’s Greek with the pending words marked', async () => {
    const out = await pending(tmp());
    const verses = out.text.split('\n').filter((l) => /^Gen\.1:\d+ /.test(l));
    const withPending = new Set(gen.pending.map((p) => p.ref.split('#')[0]));
    expect(verses.map((l) => l.split(' ')[0])).toEqual([...withPending]);
    const verse2 = verses.find((l) => l.startsWith('Gen.1:2 '))!;
    const words2 = gen.words.filter((w) => w.verse === 'Gen.1:2');
    for (const w of words2) expect(verse2).toContain(w.display);
    // Gen.1:2#5 is pending, Gen.1:2#1 is not
    expect(verse2).toContain(`⟦${words2[4].display}⟧`);
    expect(verse2).not.toContain(`⟦${words2[0].display}⟧`);
    expect(verse2.match(/⟦/g)).toHaveLength(gen.pending.filter((p) => p.ref.startsWith('Gen.1:2#')).length);
  });

  it('cuts batches of about 700 pending words at a chapter boundary, and a chapter larger than a batch is a batch', () => {
    expect(BATCH_SIZE).toBe(700);
    const word = (chapter: number, i: number): PendingWord => ({ ref: `Gen.${chapter}:1#${i}`, candidates: [], notes: [] });
    const chapter = (n: number, count: number): PendingWord[] => Array.from({ length: count }, (_, i) => word(n, i + 1));
    const sizes = (chapters: number[], size = 700): number[][] => cutBatches(chapters.flatMap((count, i) => chapter(i + 1, count)), size).map((b) => [...new Set(b.map((w) => chapterOf(w.ref)))]);
    // the batch that would run past 700 by less than it falls short is taken whole; otherwise it is cut before the chapter that crosses
    expect(sizes([300, 300, 150, 200])).toEqual([[1, 2, 3], [4]]);
    expect(sizes([300, 300, 300, 200])).toEqual([[1, 2], [3, 4]]);
    expect(sizes([100, 1000, 100])).toEqual([[1], [2], [3]]);
    expect(sizes([50, 50])).toEqual([[1, 2]]);
    expect(sizes([])).toEqual([]);
    // no chapter is ever split, and the words stay in order
    const all = chapter(1, 400).concat(chapter(2, 400), chapter(3, 400));
    const cut = cutBatches(all, 700);
    expect(cut.flat()).toEqual(all);
    for (const b of cut) expect(new Set(b.map((w) => chapterOf(w.ref))).size).toBeLessThanOrEqual(2);
    expect(chapterOf('Psa.118:176#3')).toBe(118);
    expect(batchName('gen', 1)).toBe('gen-01');
    expect(batchName('psa', 12)).toBe('psa-12');
  });

  it('lxx:batches gives one batch for the fixture with the counts the listing has', async () => {
    const lines: string[] = [];
    const batches = await runBatches(['--book', 'gen'], { input: GEN_1, outDir: tmp(), log: (l) => lines.push(l) });
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({ n: 1, name: 'gen-01', firstChapter: 1, lastChapter: 1 });
    expect(batches[0].words).toHaveLength(163);
    expect(batches[0].noCandidate).toBe(2);
    const listing = await pending(tmp());
    expect(listing.words).toHaveLength(batches[0].words.length);
    expect(listing.text.match(/no candidate/g)!.length).toBeGreaterThanOrEqual(2);
    const text = lines.join('\n');
    expect(text).toMatch(/^batch\tchapters\tpending\tno candidate$/m);
    expect(text).toMatch(/^1\t1\t163\t2$/m);
    expect(text).toMatch(/^total\t\t163\t2$/m);
    expect(batchesOf('gen', gen.pending)[0].words).toEqual(gen.pending);
  });

  it('lxx:batches --all gives a row for each Old Testament book of the file: its words, its pending words, those with no candidate and how many of those are names', async () => {
    const lines: string[] = [];
    await runBatches(['--all'], { input: GEN_1, outDir: tmp(), log: (l) => lines.push(l) });
    expect(lines[0]).toBe(['book', 'words', 'pending', 'no candidate', 'no candidate % of words', 'of those, a name', 'a name from its form alone', 'both % of words'].join('\t'));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(`gen\t${gen.words.length}\t163\t2\t${((100 * 2) / gen.words.length).toFixed(2)}%\t1\t0\t${((100 * 2) / gen.words.length).toFixed(2)}%`);
    expect(lines[2]).toBe(lines[1].replace('gen', 'total'));
    // the one capital among Gen 1's two words with no candidate is Γενηθήτωσαν, which opens what God says (Gen 1:14) and follows no mark: counted, so the count is an upper bound
    const w = (ref: string, display: string): { ref: string; verse: string; form: string; display: string } => ({ ref, verse: ref.split('#')[0], form: display.replace(/[.,·]/g, ''), display });
    const verse = [w('Gen.4:20#1', 'καὶ'), w('Gen.4:20#2', 'ἔτεκεν'), w('Gen.4:20#3', 'Ἀδὰ'), w('Gen.4:20#4', 'τὸν'), w('Gen.4:20#5', 'Ἰωβέλ·'), w('Gen.4:20#6', 'Οὗτος'), w('Gen.4:21#1', 'Ἰουβάλ')];
    expect([...nameRefs(verse)]).toEqual(['Gen.4:20#3', 'Gen.4:20#5']);
    await expect(runBatches(['--all', '--book', 'gen'], { input: GEN_1, outDir: tmp() })).rejects.toThrow(/usage/);
  });

  it('cuts a fixture of two chapters at the chapter boundary', async () => {
    const input = twoChapters();
    const two = deriveBook(input, 'gen');
    expect(two.pending.filter((p) => p.ref.startsWith('Gen.2:'))).toHaveLength(163);
    // a batch size the first chapter falls short of by less than the second would overshoot: two batches, one chapter each
    const cut = await runBatches(['--book', 'gen', '--size', '200'], { input, outDir: tmp() });
    expect(cut.map((b) => [b.firstChapter, b.lastChapter, b.words.length])).toEqual([
      [1, 1, 163],
      [2, 2, 163],
    ]);
    expect(cut[0].words.every((w) => chapterOf(w.ref) === 1)).toBe(true);
    // a size the second chapter overshoots by less than the first falls short: the two chapters are one batch
    const whole = await runBatches(['--book', 'gen', '--size', '300'], { input, outDir: tmp() });
    expect(whole.map((b) => [b.firstChapter, b.lastChapter, b.words.length])).toEqual([[1, 2, 326]]);
    // the listing of batch 2 holds chapter 2 and no word of chapter 1
    const out = await runPending(['--book', 'gen', '--batch', '2', '--size', '200'], { input, outDir: tmp() });
    expect(out.words).toHaveLength(163);
    expect(out.words.every((w) => w.ref.startsWith('Gen.2:'))).toBe(true);
    expect(out.path.endsWith('gen-02.md')).toBe(true);
    await expect(runPending(['--book', 'gen', '--batch', '3', '--size', '200'], { input, outDir: tmp() })).rejects.toThrow(/gen has 2 batches/);
  });

  it('names the batch and the book when they are wrong', async () => {
    await expect(runPending(['--book', 'gen', '--batch', '0'], { input: GEN_1, outDir: tmp() })).rejects.toThrow(/usage/);
    await expect(runPending(['--batch', '1'], { input: GEN_1, outDir: tmp() })).rejects.toThrow(/usage/);
    await expect(runPending(['--book', 'xyz', '--batch', '1'], { input: GEN_1, outDir: tmp() })).rejects.toThrow(/no book 'xyz'/);
    await expect(runBatches([], { input: GEN_1, outDir: tmp() })).rejects.toThrow(/usage/);
  });
});

describe('lxx:choose', () => {
  it('reads a model session’s lines and writes data/lxx/choices/gen-01.tsv with confidences 0.8, 0.5 and 0.4', async () => {
    const outDir = tmp();
    const written = await choose(outDir, choicesFile());
    expect(written.path).toBe(join(outDir, 'choices', 'gen-01.tsv'));
    expect(written.rows).toHaveLength(163);
    const rows = fileLines(written.path).map((l) => l.split('\t'));
    expect(rows[0]).toEqual(['ref', 'parsing', 'lemma', 'mark', 'confidence', 'note']);
    const row = (ref: string): string[] => rows.find((r) => r[0] === ref)!;
    // a plain line: 0.8; the lemma is the candidate's
    expect(row('Gen.1:2#9')).toEqual(['Gen.1:2#9', 'N-ASN', 'σκότος', '', '0.80', '']);
    // a ? line: 0.5
    expect(row('Gen.1:2#16')).toEqual(['Gen.1:2#16', 'V-IPI-3S', 'ἐπιφέρω', 'unsure', '0.50', NOTE_UNSURE]);
    // a guess line: 0.4, whether the word has a candidate with that parsing or not
    expect(row('Gen.1:9#35').slice(3, 5)).toEqual(['guess', '0.40']);
    expect(row('Gen.1:14#5')).toEqual(['Gen.1:14#5', 'V-APM-3P', 'γίνομαι', 'guess', '0.40', NOTE_GUESS_NO_CANDIDATE]);
    // the confidence column agrees with the reader's own: choices.ts reads the file and gives each word the same confidence
    const choices = readChoices(readFileSync(written.path, 'utf8'), written.path);
    const applied = applyChoices(gen.pending, choices);
    expect(applied.refused).toEqual([]);
    expect(applied.left).toEqual([]);
    expect(applied.unused).toEqual([]);
    for (const w of applied.chosen) {
      const r = row(w.ref);
      expect(w.confidence.toFixed(2), w.ref).toBe(r[4]);
      expect([CONFIDENCE_CHOSEN, CONFIDENCE_UNSURE, CONFIDENCE_GUESS]).toContain(w.confidence);
    }
    expect(rows.slice(1).filter((r) => r[4] === '0.80').length + rows.slice(1).filter((r) => r[4] === '0.50').length + rows.slice(1).filter((r) => r[4] === '0.40').length).toBe(163);
    expect(rows.slice(1).filter((r) => r[4] === '0.40')).toHaveLength(4);
    // the batches’ files are found by the readers of release and report
    expect(readChoiceDir(join(outDir, 'choices'), 'gen-').files).toEqual(['gen-01.tsv']);
    // Swete’s Greek is not in the file: only the lemma is
    expect(readFileSync(written.path, 'utf8')).not.toMatch(/Γενηθήτωσαν|ζωσῶν/);
    expect(GREEK_LETTER.test(readFileSync(written.path, 'utf8'))).toBe(true);
    // a second run in the same place writes the same bytes
    const before = readFileSync(written.path);
    await choose(outDir, choicesFile());
    expect(Buffer.compare(readFileSync(written.path), before)).toBe(0);
  });

  /** The offences a refused file is told, each with its ref; nothing is written anywhere. */
  async function refused(edit: (lines: string[]) => string[]): Promise<string[]> {
    const outDir = tmp();
    const error = await choose(outDir, choicesFile(edit)).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ChooseRefused);
    // no file of any kind
    expect(existsSync(join(outDir, 'choices')) ? readdirSync(join(outDir, 'choices')) : []).toEqual([]);
    expect(existsSync(join(outDir, 'recheck'))).toBe(false);
    return (error as ChooseRefused).offences;
  }

  it('refuses a line whose lemma and parsing are not a candidate and that does not say guess, naming the ref', async () => {
    // Gen.1:2#9 σκότος has N-ASN and N-NSN
    const offences = await refused((lines) => lines.map((l) => (l.startsWith('Gen.1:2#9 ') ? 'Gen.1:2#9 N-DSN' : l)));
    expect(offences).toHaveLength(1);
    expect(offences[0]).toContain('Gen.1:2#9');
    expect(offences[0]).toMatch(/not among the candidates/);
    // a lemma the candidates lack for that parsing is outside too
    const lemma = await refused((lines) => lines.map((l) => (l.startsWith('Gen.1:2#9 ') ? 'Gen.1:2#9 N-ASN φῶς' : l)));
    expect(lemma).toHaveLength(1);
    expect(lemma[0]).toContain('Gen.1:2#9');
    // the same line marked guess is taken, at 0.4
    const outDir = tmp();
    const done = await choose(outDir, choicesFile((lines) => lines.map((l) => (l.startsWith('Gen.1:2#9 ') ? 'Gen.1:2#9 N-DSN guess' : l)).filter((l) => l !== '')));
    const guess = readChoices(readFileSync(done.path, 'utf8')).get('Gen.1:2#9')!;
    expect(guess).toMatchObject({ parsing: 'N-DSN', mark: 'guess' });
    expect(done.rows.find((r) => r.ref === 'Gen.1:2#9')!.confidence).toBe(CONFIDENCE_GUESS);
  });

  it('refuses a plain line for a word with no candidate (it is a guess and says so), and a guess that names no lemma', async () => {
    const plain = await refused((lines) => lines.map((l) => (l.startsWith('Gen.1:14#5 ') ? 'Gen.1:14#5 V-APM-3P γίνομαι' : l)));
    expect(plain).toHaveLength(1);
    expect(plain[0]).toContain('Gen.1:14#5');
    expect(plain[0]).toMatch(/no candidate/);
    const nameless = await refused((lines) => lines.map((l) => (l.startsWith('Gen.1:14#5 ') ? 'Gen.1:14#5 V-APM-3P guess' : l)));
    expect(nameless).toHaveLength(1);
    expect(nameless[0]).toContain('Gen.1:14#5');
    expect(nameless[0]).toMatch(/lemma/);
  });

  it('refuses a ref outside the batch, a ref given twice, and a file missing a ref of the batch', async () => {
    const outside = await refused((lines) => [...lines, 'Gen.1:1#1 N-NSF']);
    expect(outside).toHaveLength(1);
    expect(outside[0]).toContain('Gen.1:1#1');
    expect(outside[0]).toMatch(/not in this batch/);
    const twice = await refused((lines) => [...lines, 'Gen.1:2#9 N-NSN']);
    expect(twice).toHaveLength(1);
    expect(twice[0]).toContain('Gen.1:2#9');
    expect(twice[0]).toMatch(/twice/);
    const missing = await refused(without('Gen.1:2#9'));
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain('Gen.1:2#9');
    expect(missing[0]).toMatch(/no choice/);
    // each offence is printed with its ref, all of them at once
    const all = await refused((lines) => without('Gen.1:2#9')(lines).concat(['Gen.1:1#1 N-NSF', 'Gen.1:2#5 A-NSM', 'Gen.1:4#5 T-DSN']));
    expect(all.map((o) => o.split(':')[0] + ':' + o.split(':')[1].split(' ')[0])).toHaveLength(4);
    for (const ref of ['Gen.1:2#9', 'Gen.1:1#1', 'Gen.1:2#5', 'Gen.1:4#5']) expect(all.some((o) => o.includes(ref)), ref).toBe(true);
    await expect(choose(tmp(), choicesFile(without('Gen.1:2#9')))).rejects.toThrow(/Gen\.1:2#9/);
  });

  it('refuses a line that is not a reference and a parsing, naming the line', async () => {
    const offences = await refused((lines) => [...lines, 'cheese']);
    expect(offences).toHaveLength(1);
    expect(offences[0]).toMatch(/line \d+/);
    await expect(choose(tmp(), join(tmp(), 'nothing.txt'))).rejects.toThrow(/nothing\.txt/);
    await expect(runChoose(['--book', 'gen', '--batch', '1'], { input: GEN_1, outDir: tmp() })).rejects.toThrow(/usage/);
  });

  it('reads a lemma with a comma and a space, a trailing ? and guess, and comments', () => {
    const lines = parseModelLines(['# a comment', '', 'Gen.1:7#15 R-ASN ὅς, ἥ ?', 'Gen.1:9#35  V-API-3S   ὁράω  guess', 'Gen.1:2#5 A-NSM', 'Gen.1:2#6 A-NSM ? guess'].join('\n'));
    expect(lines.offences).toEqual([]);
    expect(lines.lines.map((l) => [l.ref, l.parsing, l.lemma, l.mark])).toEqual([
      ['Gen.1:7#15', 'R-ASN', 'ὅς, ἥ', 'unsure'],
      ['Gen.1:9#35', 'V-API-3S', 'ὁράω', 'guess'],
      ['Gen.1:2#5', 'A-NSM', '', ''],
      ['Gen.1:2#6', 'A-NSM', '', 'guess'],
    ]);
  });

  it('asks for the lemma when the candidates hold two for the parsing', () => {
    const word: PendingWord = {
      ref: 'Gen.1:5#1',
      candidates: [
        { lemma: 'α', morph: 'N-NSM', support: 4, share: 0.8 },
        { lemma: 'β', morph: 'N-NSM', support: 1, share: 0.2 },
      ],
      notes: [],
    };
    const bad = checkChoices([word], parseModelLines('Gen.1:5#1 N-NSM').lines);
    expect(bad.offences).toHaveLength(1);
    expect(bad.offences[0]).toContain('Gen.1:5#1');
    expect(bad.offences[0]).toMatch(/more than one lemma/);
    const good = checkChoices([word], parseModelLines('Gen.1:5#1 N-NSM β').lines);
    expect(good.offences).toEqual([]);
    expect(good.rows[0]).toMatchObject({ lemma: 'β', confidence: CONFIDENCE_CHOSEN });
  });

  // Gen 5:12 Καινάν: TBESG's lemma is Καϊνάν (a diaeresis), the model wrote the file's Καινάν, and the choice was refused as outside the candidates (story mw-u2w5klk.19)
  it('takes a lemma that differs from a candidate’s by a diaeresis alone for that candidate, and no other difference', () => {
    const word: PendingWord = { ref: 'Gen.5:12#3', candidates: [{ lemma: 'Καϊνάν'.normalize('NFC'), morph: 'N-NSM', support: 0, share: 0, source: 'name' }], notes: [] };
    const said = (lemma: string): string => `Gen.5:12#3 N-NSM ${lemma}`;
    const checked = checkChoices([word], parseModelLines(said('Καινάν')).lines);
    expect(checked.offences).toEqual([]);
    expect(checked.rows[0]).toMatchObject({ lemma: 'Καϊνάν', confidence: CONFIDENCE_CHOSEN });
    const applied = applyChoices([word], readChoices('ref\tparsing\tlemma\tmark\nGen.5:12#3\tN-NSM\tΚαινάν\t\n'));
    expect(applied.refused).toEqual([]);
    expect(applied.chosen[0]).toMatchObject({ lemma: 'Καϊνάν', layer: 3, confidence: CONFIDENCE_CHOSEN });
    // an accent is not a diaeresis
    expect(checkChoices([word], parseModelLines(said('Καίνάν')).lines).offences).toHaveLength(1);
  });
});

describe('the blind recheck', () => {
  /** A book whose first pass is done: the fixture’s choices in outDir. */
  async function firstPass(): Promise<string> {
    const outDir = tmp();
    await choose(outDir, choicesFile());
    return outDir;
  }
  const recheck = (outDir: string) => runPending(['--recheck', '--book', 'gen'], { input: GEN_1, outDir });

  it('lists 5% of the chosen words, at least one, the same words on a second run', async () => {
    expect(RECHECK_FRACTION).toBe(0.05);
    const outDir = await firstPass();
    const a = await recheck(outDir);
    expect(a.words).toHaveLength(Math.max(1, Math.round(0.05 * 163)));
    expect(a.path).toBe(join(outDir, 'pending', 'gen-recheck.md'));
    const b = await recheck(outDir);
    expect(b.words.map((w) => w.ref)).toEqual(a.words.map((w) => w.ref));
    expect(b.text).toBe(a.text);
    // in the text's order, and among the chosen words
    const order = gen.pending.map((p) => p.ref);
    expect(a.words.map((w) => order.indexOf(w.ref))).toEqual([...a.words.map((w) => order.indexOf(w.ref))].sort((x, y) => x - y));
    expect(new Set(a.words.map((w) => w.ref)).size).toBe(a.words.length);
    // another book code is another sample
    const refs = order.slice(0, 100);
    expect(recheckSample('gen', refs)).toEqual(recheckSample('gen', refs));
    expect(recheckSample('gen', refs)).not.toEqual(recheckSample('psa', refs));
    expect(recheckSample('gen', ['a', 'b', 'c'])).toHaveLength(1);
    expect(recheckSample('gen', [])).toEqual([]);
    expect(recheckSample('gen', refs)).toHaveLength(5);
  });

  it('shows no first choice: each word is printed as the pending listing prints it', async () => {
    const outDir = await firstPass();
    const a = await recheck(outDir);
    const normal = (await pending(tmp())).text.split('\n');
    const lines = a.text.split('\n');
    for (const w of a.words) {
      const line = lines.find((l) => l.startsWith(`${w.ref} `))!;
      expect(normal).toContain(line);
    }
    // the first pass's marks, and its confidences, are nowhere in the listing
    expect(a.text).not.toMatch(/unsure|0\.80|0\.50|0\.40|chosen|first choice \S/);
    expect(a.text).toMatch(/blind/i);
    // a listing of a book with no first pass is refused
    await expect(recheck(tmp())).rejects.toThrow(/no choices/);
  });

  it('lxx:choose --recheck writes data/lxx/recheck/gen.tsv for the sample, and lxx:report shows the disagreement rate', async () => {
    const outDir = await firstPass();
    const sample = (await recheck(outDir)).words;
    const first = readChoices(readFileSync(join(outDir, 'choices', 'gen-01.tsv'), 'utf8'));
    // the second pass disagrees on the first two words of the sample: it takes the candidate that is not the first pass's
    const other = (w: PendingWord, i: number): string => {
      const was = first.get(w.ref)!;
      return i < 2 ? `${w.ref} ${w.candidates.find((c) => c.morph !== was.parsing)!.morph}` : `${w.ref} ${was.parsing}`;
    };
    const from = join(tmp(), 'second.txt');
    writeFileSync(from, sample.map(other).join('\n') + '\n');
    const written = await runChoose(['--recheck', '--book', 'gen', '--from', from], { input: GEN_1, outDir });
    expect(written.path).toBe(join(outDir, 'recheck', 'gen.tsv'));
    expect(written.rows).toHaveLength(sample.length);
    expect(readChoices(readFileSync(written.path, 'utf8')).size).toBe(sample.length);
    // the batch's own file is untouched
    expect(readdirSync(join(outDir, 'choices'))).toEqual(['gen-01.tsv']);
    const out = await runReport(['--build', '55'], {
      input: GEN_1,
      doc: join(tmp(), 'r.md'),
      choicesDir: join(outDir, 'choices'),
      recheckDir: join(outDir, 'recheck'),
      morpheusDir: tmp(),
      known: () => [],
      books: [['Gen', 'Genesis']],
    });
    expect(out.rows[0].secondPass).toEqual({ sample: sample.length, differ: 2 });
    expect(out.text).toContain(`25.0% of ${sample.length}`);
  });

  it('refuses a recheck line for a word outside the sample, a missing word, and a twice-given one; and writes nothing', async () => {
    const outDir = await firstPass();
    const sample = (await recheck(outDir)).words;
    const ok = sample.map((w) => `${w.ref} ${w.candidates[0].morph}`);
    const outsider = gen.pending.find((p) => !sample.some((w) => w.ref === p.ref))!;
    const tryFile = async (lines: string[]): Promise<string[]> => {
      const from = join(tmp(), 'second.txt');
      writeFileSync(from, lines.join('\n') + '\n');
      const error = await runChoose(['--recheck', '--book', 'gen', '--from', from], { input: GEN_1, outDir }).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(ChooseRefused);
      expect(existsSync(join(outDir, 'recheck'))).toBe(false);
      return (error as ChooseRefused).offences;
    };
    const outside = await tryFile([...ok, `${outsider.ref} ${outsider.candidates[0].morph}`]);
    expect(outside).toHaveLength(1);
    expect(outside[0]).toContain(outsider.ref);
    const missing = await tryFile(ok.slice(1));
    expect(missing[0]).toContain(sample[0].ref);
    const twice = await tryFile([...ok, ok[0]]);
    expect(twice[0]).toContain(sample[0].ref);
  });
});

describe('docs/lxx-derivation.md says how a model session goes', () => {
  const doc = readFileSync('docs/lxx-derivation.md', 'utf8');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

  it('has “A model session” with the exact commands and the rules', () => {
    expect(doc).toMatch(/^## A model session$/m);
    const section = doc.split(/^## A model session$/m)[1].split(/^## /m)[0];
    for (const s of [
      'npm run lxx:batches -- --book gen',
      'npm run lxx:pending -- --book gen --batch 1',
      'npm run lxx:choose -- --book gen --batch 1 --from <file>',
      'npm run lxx:pending -- --recheck --book gen',
      'npm run lxx:choose -- --recheck --book gen --from <file>',
      'data/lxx/choices/gen-01.tsv',
      'data/lxx/recheck/gen.tsv',
      'data/lxx/pending/gen-01.md',
      'guess',
      'unsure',
      'candidates',
    ]) {
      expect(section, s).toContain(s);
    }
    expect(section).toMatch(/the story template/i);
    expect(section).toMatch(/only from the candidates/i);
    expect(section).toMatch(/read the verse/i);
    expect(section).toMatch(/no paid API/i);
  });

  it('has the three scripts in package.json', () => {
    expect(pkg.scripts['lxx:pending']).toBe('tsx scripts/lxx/pending.ts');
    expect(pkg.scripts['lxx:choose']).toBe('tsx scripts/lxx/choose.ts');
    expect(pkg.scripts['lxx:batches']).toBe('tsx scripts/lxx/batches.ts');
  });

  it('keeps the listings out of git and the choices in it', () => {
    const ignore = readFileSync('.gitignore', 'utf8').split('\n');
    expect(ignore).toContain('data/lxx/pending');
    expect(ignore.some((l) => /data\/lxx\/(choices|recheck)/.test(l))).toBe(false);
  });
});
