// The Septuagint derivation's bar, known-answer runs, release and report (scripts/lxx/bar.ts, known.ts, choices.ts, release.ts, report.ts;
// docs/lxx-derivation.md 'The bar'; story mw-u2w5klk.4), on the fixtures of tests/unit/lxx-parser.test.ts (its header says how they were cut), never the network.
// tests/fixtures/lxx/choices-jhn-1.tsv is the probe's John 1 choices (MODEL_CHOICES_JOHN of scripts/lxx-derivation-probe.mjs) in the choices file shape.
// The probe made them before the agreement check, so 48 words the check now demotes have no choice in it: --keep-demoted scores those as the probe did.
// Six lines at its end are a blind reader's choices (a fresh subagent given only the verse, the word and its candidates, story mw-u2w5klk.28), each marked so.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { ALWAYS_CHAPTER, BAR, SECOND_CHAPTERS, buildNumber, chaptersOf, secondChapter, verdict, type BookFigures } from '../../scripts/lxx/bar';
import { applyChoices, readChoices, readChoiceFiles, CONFIDENCE_CHOSEN, CONFIDENCE_GUESS, CONFIDENCE_UNSURE, isGuess } from '../../scripts/lxx/choices';
import { deriveBook, type DeriveInput, type PendingWord } from '../../scripts/lxx/derive';
import { chapterRows, knownLines, knownRun, parseChapter, runKnown, type KnownScore } from '../../scripts/lxx/known';
import { ANNOTATION_HEADER, ReleaseRefused, annotationsTsv, currentBuild, runRelease } from '../../scripts/lxx/release';
import { OLD_TESTAMENT, REPORT_END, REPORT_START, disagreement, runReport } from '../../scripts/lxx/report';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8');
const slice = fixture('tagnt-slice.tsv');
const tbesg = fixture('tbesg-slice.txt');
const tagnt = [slice];
function swete(file: string, input: Partial<DeriveInput> = {}): DeriveInput {
  const [versification, words] = fixture(file).split('\n\n');
  return { versification, words, tagnt, tbesg, ...input };
}
const GEN_1 = swete('swete-gen-1.csv');
// John's own rows go in as in the parser test: the chapter's words are read from them, and the book is hidden from the training
const JHN = { tagnt: [slice, fixture('tagnt-jhn-1.tsv')], tbesg };
const PROBE_CHOICES = join(FIXTURES, 'choices-jhn-1.tsv');

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const GREEK = /[Ͱ-Ͽἀ-῿]/;

describe('the bar: the probe’s numbers, as data', () => {
  it('holds the probe’s lines: lemma 99%, full parsing 98%, nothing pending, guesses 3%, breaks 5 per 1,000', () => {
    expect(BAR).toEqual({ knownLemma: 99, knownParsing: 98, pending: 0, guesses: 3, breaks: 5 });
  });

  const known = (words: number, lemma: number, full: number, file: string | null = 'jhn-1.tsv'): KnownScore => {
    const t = { words, lemma, full };
    const none = { words: 0, lemma: 0, full: 0 };
    return { chapter: 'Jhn.1', hidden: 'jhn', words, before: { 1: none, 2: none }, by: { '1': t, '2': none, '2a': none, '3': none, kept: none, none }, all: t, guesses: 0, unanswered: 0, choices: { file: file ?? undefined, given: 0, refused: 0, notPending: 0 } };
  };
  const book = (over: Partial<BookFigures> = {}): BookFigures => ({ words: 1000, pending: 0, guesses: 0, breaks: 0, ...over });

  it('passes a book on the lines exactly, and names the line each failure is', () => {
    expect(verdict(book({ guesses: 30, breaks: 5 }), [known(1000, 990, 980)])).toEqual({ shippable: true, failures: [] });
    const lines = (b: BookFigures, k: KnownScore): string[] => verdict(b, [k]).failures.map((f) => f.line);
    expect(lines(book({ pending: 1 }), known(1000, 1000, 1000))).toEqual(['pending: 1 word left without an answer (the bar: none)']);
    expect(lines(book({ guesses: 31 }), known(1000, 1000, 1000))).toEqual(["guesses: 3.1% of the book's words, 31 of 1000 (the bar: at most 3%)"]);
    expect(lines(book({ breaks: 6 }), known(1000, 1000, 1000))).toEqual(['breaks: 6.0 per 1,000 words, 6 in 1000 (the bar: at most 5)']);
    expect(lines(book(), known(1000, 989, 980))).toEqual(['known-answer Jhn.1 lemma: 98.9% of 1000 words (the bar: at least 99%)']);
    expect(lines(book(), known(1000, 1000, 979))).toEqual(['known-answer Jhn.1 full parsing: 97.9% of 1000 words (the bar: at least 98%)']);
    expect(lines(book(), known(1000, 800, 800, null))[0]).toContain('no choices file jhn-1.tsv');
  });

  it('chooses the second known-answer chapter from the list by the build number: another build, another chapter, never John', () => {
    expect(buildNumber('0.7.55')).toBe(55);
    for (let build = 0; build < 3 * SECOND_CHAPTERS.length; build++) {
      expect(secondChapter(build)).not.toBe(secondChapter(build + 1));
      expect(secondChapter(build)).toBe(secondChapter(build + SECOND_CHAPTERS.length));
      expect(secondChapter(build).startsWith('Jhn.')).toBe(false);
    }
    expect(secondChapter(55)).not.toBe(secondChapter(56));
    expect(chaptersOf(55)).toEqual([ALWAYS_CHAPTER, secondChapter(55)]);
    expect(new Set(SECOND_CHAPTERS).size).toBe(SECOND_CHAPTERS.length);
    SECOND_CHAPTERS.forEach((c) => expect(parseChapter(c).chapter).toBeGreaterThan(0));
    expect(currentBuild()).toBe(buildNumber(JSON.parse(readFileSync('package.json', 'utf8')).version));
  });
});

describe('the choices file', () => {
  const text = (...rows: string[]): string => ['ref\tparsing\tlemma\tmark', ...rows].join('\n') + '\n';
  const pending = (ref: string, ...candidates: Array<[string, string]>): PendingWord => ({
    ref,
    candidates: candidates.map(([lemma, morph], i) => ({ lemma, morph, support: 3 - i, share: 0.5 })),
    notes: ['several analyses: for the model'],
  });

  it('reads ref, parsing, lemma and mark, skipping comments and the header, and names a malformed line', () => {
    const c = readChoices(`# a comment\n${text('Jhn.1:3#1\tA-NPN\t\t', 'Jhn.1:5#10\tN-NSF\tσκοτία\tunsure', 'Jhn.1:15#6\tV-2RAI-3S\tκράζω\tguess')}`);
    expect([...c.keys()]).toEqual(['Jhn.1:3#1', 'Jhn.1:5#10', 'Jhn.1:15#6']);
    expect(c.get('Jhn.1:5#10')).toEqual({ ref: 'Jhn.1:5#10', parsing: 'N-NSF', lemma: 'σκοτία', mark: 'unsure' });
    expect(() => readChoices(text('Jhn.1:3\tA-NPN'))).toThrow(/not a reference/);
    expect(() => readChoices(text('Jhn.1:3#1\t'))).toThrow(/no parsing/);
    expect(() => readChoices(text('Jhn.1:3#1\tA-NPN\t\tmaybe'))).toThrow(/not unsure or guess/);
    expect(() => readChoices(text('Jhn.1:3#1\tA-NPN', 'Jhn.1:3#1\tA-NSN'))).toThrow(/chosen twice/);
    expect(() => readChoiceFiles([{ path: 'a.tsv', text: text('Jhn.1:3#1\tA-NPN') }, { path: 'b.tsv', text: text('Jhn.1:3#1\tA-NSN') }])).toThrow(/already chosen/);
  });

  it('takes a choice among the candidates at 0.8, an unsure one at 0.5, a marked guess or one with no candidates at 0.4, and refuses the rest', () => {
    const words = [
      pending('Tst.1:1#1', ['ὁ', 'T-NSN'], ['ὁ', 'T-ASN']),
      pending('Tst.1:1#2', ['λόγος', 'N-NSM'], ['λόγος', 'N-VSM']),
      pending('Tst.1:1#3', ['ἀρχή', 'N-NSF']),
      pending('Tst.1:1#4'),
      pending('Tst.1:1#5', ['ἀρχή', 'N-NSF']),
      pending('Tst.1:1#6', ['ἀρχή', 'N-NSF']),
      pending('Tst.1:1#7'),
      pending('Tst.1:1#8', ['ἀρχή', 'N-NSF']),
    ];
    const choices = readChoices(
      text(
        'Tst.1:1#1\tT-ASN',
        'Tst.1:1#2\tN-VSM\tλόγος\tunsure',
        'Tst.1:1#3\tN-NSF\tἀρχή\tguess',
        'Tst.1:1#4\tN-NSM\tλόγος',
        'Tst.1:1#5\tN-GSF\tἀρχή',
        'Tst.1:1#6\tN-GSF\t\tguess',
        'Tst.1:1#7\tN-NSM\t\tguess',
        'Tst.9:9#9\tN-NSM',
      ),
    );
    const out = applyChoices(words, choices);
    const by = (ref: string) => out.chosen.find((w) => w.ref === ref);
    expect([by('Tst.1:1#1')?.morph, by('Tst.1:1#1')?.confidence]).toEqual(['T-ASN', CONFIDENCE_CHOSEN]);
    expect([by('Tst.1:1#2')?.morph, by('Tst.1:1#2')?.confidence]).toEqual(['N-VSM', CONFIDENCE_UNSURE]);
    expect(by('Tst.1:1#3')?.confidence).toBe(CONFIDENCE_GUESS);
    expect(by('Tst.1:1#3')?.notes).toContain('guess: marked by the model');
    expect(by('Tst.1:1#4')?.notes).toContain('guess: the model answered with no candidates');
    expect(by('Tst.1:1#4')?.lemma).toBe('λόγος');
    expect(by('Tst.1:1#6')?.notes).toContain('guess: the model chose outside the candidates');
    expect(by('Tst.1:1#6')?.lemma).toBe('ἀρχή');
    expect(out.chosen.filter(isGuess).map((w) => w.ref)).toEqual(['Tst.1:1#3', 'Tst.1:1#4', 'Tst.1:1#6']);
    // outside the candidates and not marked a guess, and a guess with no lemma: refused, the word stays pending
    expect(out.refused.map((r) => r.ref)).toEqual(['Tst.1:1#5', 'Tst.1:1#7']);
    expect(out.left.map((w) => w.ref)).toEqual(['Tst.1:1#5', 'Tst.1:1#7', 'Tst.1:1#8']);
    expect(out.unused).toEqual(['Tst.9:9#9']);
  });
});

describe('lxx:known on John 1, John hidden (the probe’s known-answer run)', async () => {
  const lines: string[] = [];
  const [kept] = await runKnown(['--chapter', 'Jhn.1', '--choices', PROBE_CHOICES, '--keep-demoted'], { input: JHN, log: (l) => lines.push(l) });
  const [strict] = await runKnown(['--chapter', 'Jhn.1', '--choices', PROBE_CHOICES], { input: JHN });
  // an empty directory stands for a chapter with no choices file (data/lxx/known/jhn-1.tsv is committed now, mw-u2w5klk.7)
  const [bare] = await runKnown(['--chapter', 'Jhn.1', '--choices-dir', tmp()], { input: JHN });

  it('scores layers 1 and 2 as the probe did, within one word: 672 of 673 on the lemma and 670 on full parsing for layer 1, 16 of 16 for layer 2 (25 before mw-u2w5klk.28 and .30 left nine lone candidates on thin support pending)', () => {
    expect(kept.words).toBe(829);
    expect(kept.hidden).toBe('jhn');
    expect(kept.before[1].words).toBe(673);
    expect(Math.abs(kept.before[1].lemma - 672)).toBeLessThanOrEqual(1);
    expect(Math.abs(kept.before[1].full - 670)).toBeLessThanOrEqual(1);
    expect(kept.before[2]).toEqual({ words: 16, lemma: 16, full: 16 });
  });

  it('given the probe’s John choices scores the whole chapter at 828 of 829 on the lemma and 825 on full parsing', () => {
    expect(kept.all).toEqual({ words: 829, lemma: 828, full: 825 });
    expect(kept.unanswered).toBe(0);
    // 138 of the probe's choices and seven of a blind reader's, for the words mw-u2w5klk.28 and .30 leave pending
    expect(kept.choices).toMatchObject({ given: 145, refused: 0 });
    // the probe's marks: three, and Jhn.1:32#6, which a candidate now covers and the probe had marked a guess (mw-u2w5klk.30 leaves it pending)
    expect(kept.guesses).toBe(4);
    // the guesses the probe made were right
    expect(kept.by['3'].lemma).toBe(kept.by['3'].words);
    const text = lines.join('\n');
    expect(text).toContain('all: 829 words, lemma 828 (99.9%), lemma and full parsing 825 (99.5%)');
    expect(text).toContain('layer 2a: 32 words');
  });

  it('counts a pending word with no choice wrong unless --keep-demoted asks for the probe’s reading, and with no choices file counts every pending word wrong', () => {
    expect(strict.by.kept.words).toBe(0);
    expect(strict.unanswered).toBe(kept.by.kept.words);
    expect(strict.all.lemma).toBe(kept.all.lemma - kept.by.kept.words);
    expect(100 * strict.all.lemma).toBeLessThan(BAR.knownLemma * strict.words);
    expect(bare.unanswered).toBeGreaterThan(strict.unanswered);
    expect(knownLines(bare).join('\n')).toContain('no choices file');
    expect(bare.choices.file).toBeUndefined();
  });

  it('scores the layers apart: what layers 1, 2 and 2a answer after the check, then the choices', () => {
    expect(kept.by['1'].words + kept.by['2'].words + kept.by['2a'].words + kept.by['3'].words + kept.by.kept.words).toBe(829);
    expect(kept.by['2a'].lemma).toBe(kept.by['2a'].words);
  });
});

describe('lxx:known on another chapter', () => {
  it('runs a chapter of the New Testament with its book hidden from the form index and the parser', () => {
    const rows = chapterRows(tagnt, parseChapter('Mat.1'));
    expect(rows.length).toBeGreaterThan(100);
    expect(rows.every((r) => r.book === 'Mat' && /n/i.test(r.editions))).toBe(true);
    const s = knownRun('Mat.1', { tagnt, tbesg });
    expect(s.hidden).toBe('mat');
    expect(s.words).toBe(rows.length);
    expect(s.all.words).toBe(rows.length);
  });

  it('refuses a chapter TAGNT lacks and a name that is not a chapter', () => {
    expect(() => chapterRows(tagnt, parseChapter('Rom.99'))).toThrow(/no NA28 words/);
    expect(() => parseChapter('Romans 8')).toThrow(/not a chapter/);
  });
});

/** The John 1 score as the probe scored it: the build's known-answer run, passing the bar (99.9% and 99.5%). */
const john = knownRun('Jhn.1', JHN, readChoices(fixture('choices-jhn-1.tsv')), { keepDemoted: true, file: PROBE_CHOICES });
/** A known-answer run for the chapters a build asks for, John 1's score under each name (the second chapter's own run is shown above). */
const passing = (asked: string[]) => (chapters: readonly string[]): KnownScore[] => {
  asked.push(...chapters);
  return chapters.map((chapter) => ({ ...john, chapter }));
};

describe('lxx:release', async () => {
  const gen = deriveBook(GEN_1, 'gen');
  const words = gen.words.length;

  /** A choices file for Gen 1's pending words: each takes its first candidate; `guesses` are marked a guess, `leave` words are left out. */
  function choicesFile(guesses: number, leave: number): string {
    const rows = ['ref\tparsing\tlemma\tmark'];
    let guessed = 0;
    gen.pending.forEach((p, i) => {
      if (i < leave) return;
      const c = p.candidates[0];
      if (!c) {
        rows.push(`${p.ref}\tN-NSM\tλόγος\tguess`);
        guessed++;
      } else if (guessed < guesses) {
        rows.push(`${p.ref}\t${c.morph}\t${c.lemma}\tguess`);
        guessed++;
      } else rows.push(`${p.ref}\t${c.morph}\t${c.lemma}\t`);
    });
    return rows.join('\n') + '\n';
  }
  const release = async (choices: string, extra: { build?: string; asked?: string[] } = {}) => {
    const outDir = tmp();
    const choicesDir = tmp();
    writeFileSync(join(choicesDir, 'gen-01.tsv'), choices);
    const argv = ['--book', 'gen', ...(extra.build ? ['--build', extra.build] : [])];
    const options = { input: GEN_1, outDir, choicesDir, known: passing(extra.asked ?? []) };
    return { outDir, run: () => runRelease(argv, options), path: join(outDir, 'annotations', 'gen.tsv') };
  };
  const noGuess = gen.pending.filter((p) => p.candidates.length === 0).length;

  it('the fixture book has pending words for the model, a few with no candidate, and few enough breaks', () => {
    expect(gen.pending.length).toBeGreaterThan(100);
    expect(noGuess).toBeLessThan(0.03 * words);
    expect(1000 * gen.agreement.breaks).toBeLessThanOrEqual(BAR.breaks * words);
  });

  it('refuses a book with one pending word left, naming "pending: 1", and writes nothing', async () => {
    const r = await release(choicesFile(0, 1));
    const error = await r.run().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReleaseRefused);
    expect((error as ReleaseRefused).message).toContain('pending: 1 word left without an answer');
    expect((error as ReleaseRefused).verdict.failures.map((f) => f.key)).toEqual(['pending']);
    expect(existsSync(r.path)).toBe(false);
    expect(existsSync(join(r.outDir, 'annotations'))).toBe(false);
  });

  it('refuses a book with guesses at 4% of its words, naming the guesses line', async () => {
    const r = await release(choicesFile(Math.ceil(0.04 * words), 0));
    const error = (await r.run().catch((e: unknown) => e)) as ReleaseRefused;
    expect(error).toBeInstanceOf(ReleaseRefused);
    expect(error.message).toMatch(/guesses: 4\.\d% of the book's words/);
    expect(error.message).not.toContain('pending:');
    expect(existsSync(r.path)).toBe(false);
  });

  it('refuses when the build’s known-answer run falls short, and when a book has no choices at all', async () => {
    const failing = (chapters: readonly string[]): KnownScore[] => chapters.map((chapter) => ({ ...john, chapter, all: { words: 829, lemma: 800, full: 790 } }));
    const choicesDir = tmp();
    writeFileSync(join(choicesDir, 'gen-01.tsv'), choicesFile(0, 0));
    const error = (await runRelease(['--book', 'gen'], { input: GEN_1, outDir: tmp(), choicesDir, known: failing }).catch((e: unknown) => e)) as ReleaseRefused;
    expect(error.message).toContain('known-answer Jhn.1 lemma: 96.5%');
    expect(error.message).toContain('known-answer Jhn.1 full parsing: 95.3%');
    const none = (await runRelease(['--book', 'gen'], { input: GEN_1, outDir: tmp(), choicesDir: tmp(), known: passing([]) }).catch((e: unknown) => e)) as ReleaseRefused;
    expect(none.message).toContain(`pending: ${gen.pending.length} words left without an answer`);
  });

  it('with every line met writes data/lxx/annotations/gen.tsv: one row a word, no token’s own form, the same bytes on a second run', async () => {
    const asked: string[] = [];
    const r = await release(choicesFile(0, 0), { build: '56', asked });
    const done = await r.run();
    expect(done.verdict).toEqual({ shippable: true, failures: [] });
    expect(done.path).toBe(r.path);
    expect(asked).toEqual(chaptersOf(56));
    const text = readFileSync(r.path, 'utf8');
    const rows = text.trimEnd().split('\n').map((l) => l.split('\t'));
    expect(rows[0]).toEqual(ANNOTATION_HEADER);
    expect(rows[0]).toEqual(['ref', 'lemma', 'parsing', 'layer', 'confidence', 'notes']);
    expect(rows.slice(1).map((r) => r[0])).toEqual(gen.words.map((w) => w.ref));
    expect(text.endsWith('\n')).toBe(true);
    for (const [i, row] of rows.slice(1).entries()) {
      expect(row).toHaveLength(6);
      // the lemma may be Greek; no other column is, and the token as Swete prints it (brackets, punctuation, accents of the form) is nowhere
      expect(GREEK.test(row[0] + row[2] + row[3] + row[4] + row[5])).toBe(false);
      const w = gen.words[i];
      if (row[1] !== w.form) expect(row.includes(w.display)).toBe(false);
      expect(['1', '2', '2a', '3']).toContain(row[3]);
    }
    expect(rows.slice(1).some((r) => r[3] === '3')).toBe(true);
    expect(rows.slice(1).some((r) => r[5].startsWith('guess:') || r[5].includes('guess:'))).toBe(noGuess > 0);
    // a second run in the same place writes the same bytes
    const before = readFileSync(r.path);
    await r.run();
    expect(Buffer.compare(readFileSync(r.path), before)).toBe(0);
    expect(annotationsTsv([])).toBe(`${ANNOTATION_HEADER.join('\t')}\n`);
  });

  it('refuses a choices file that names a word twice, and a book Swete’s file lacks', async () => {
    const choicesDir = tmp();
    mkdirSync(choicesDir, { recursive: true });
    const one = choicesFile(0, 0);
    writeFileSync(join(choicesDir, 'gen-01.tsv'), one);
    writeFileSync(join(choicesDir, 'gen-02.tsv'), one);
    await expect(runRelease(['--book', 'gen'], { input: GEN_1, outDir: tmp(), choicesDir, known: passing([]) })).rejects.toThrow(/already chosen in another file/);
    await expect(runRelease(['--book', 'xyz'], { input: GEN_1, outDir: tmp(), choicesDir: tmp(), known: passing([]) })).rejects.toThrow(/no book 'xyz'/);
  });
});

describe('lxx:report', async () => {
  /** A file with one verse for each of the 39 books, the word ἐν, which layer 1 settles: the 39 rows without Swete's file. */
  const thirtyNine: DeriveInput = {
    versification: OLD_TESTAMENT.map(([code], i) => `${i + 1}\t${code}.1:1`).join('\n'),
    words: OLD_TESTAMENT.map((_, i) => `${i + 1}\tἐν`).join('\n'),
    tagnt,
    tbesg,
  };

  const report = async (build: number, known: (chapters: readonly string[]) => KnownScore[], doc = join(tmp(), 'lxx-report.md')) => {
    const out = await runReport(['--build', String(build)], { input: thirtyNine, doc, choicesDir: tmp(), recheckDir: tmp(), morpheusDir: tmp(), known });
    return { ...out, doc };
  };

  it('lists the 39 books of the Old Testament in Swete’s codes, once each', () => {
    expect(OLD_TESTAMENT).toHaveLength(39);
    expect(new Set(OLD_TESTAMENT.map(([c]) => c)).size).toBe(39);
    expect(OLD_TESTAMENT[0]).toEqual(['Gen', 'Genesis']);
    expect(OLD_TESTAMENT[38]).toEqual(['Mal', 'Malachi']);
  });

  it('writes the doc between its markers with a row for each of the 39 books and SHIPPABLE, the same bytes on a second run', async () => {
    const asked: string[] = [];
    const a = await report(55, passing(asked));
    const text = readFileSync(a.doc, 'utf8');
    expect(text.indexOf(REPORT_START)).toBeGreaterThan(0);
    expect(text.indexOf(REPORT_END)).toBeGreaterThan(text.indexOf(REPORT_START));
    expect(a.rows).toHaveLength(39);
    const table = text.split('### The books')[1];
    expect(table.match(/^\| .+ \([1-3A-Za-z]{3}\) \|/gm)).toHaveLength(39);
    expect(table.match(/SHIPPABLE/g)!.length).toBeGreaterThanOrEqual(39);
    expect(table).toContain('| Genesis (Gen) | 1 | 100.0% |');
    expect(asked).toEqual(chaptersOf(55));
    expect(text).toContain('Build 55.');
    const again = await report(55, passing([]), a.doc);
    expect(again.text).toBe(a.text);
    expect(readFileSync(a.doc, 'utf8')).toBe(text);
  });

  it('writes NOT, with the failing bar line named, for a book that falls short, and keeps what is outside the markers', async () => {
    const doc = join(tmp(), 'lxx-report.md');
    writeFileSync(doc, `# my notes\n\n${REPORT_START}\nold\n${REPORT_END}\n\nafter\n`);
    const failing = (chapters: readonly string[]): KnownScore[] => chapters.map((chapter) => ({ ...john, chapter, all: { words: 829, lemma: 700, full: 690 } }));
    const out = await report(55, failing, doc);
    const text = readFileSync(doc, 'utf8');
    expect(text.startsWith('# my notes')).toBe(true);
    expect(text.endsWith(`${REPORT_END}\n\nafter\n`)).toBe(true);
    expect(text).not.toContain('old\n');
    expect(text).toContain('NOT: known answer');
    expect(out.rows.every((r) => !r.shippable)).toBe(true);
    // a book with words pending is named by its pending count
    const withPending: DeriveInput = { ...GEN_1, versification: GEN_1.versification, words: GEN_1.words };
    const genOnly = await runReport(['--build', '55'], { input: withPending, doc: join(tmp(), 'r.md'), choicesDir: tmp(), recheckDir: tmp(), morpheusDir: tmp(), known: passing([]), books: [['Gen', 'Genesis']] });
    expect(genOnly.text).toContain(`NOT: pending: ${deriveBook(GEN_1, 'gen').pending.length}`);
    expect(genOnly.rows[0].failures.map((f) => f.key)).toEqual(['pending']);
  });

  it('names a different second known-answer chapter for two builds', async () => {
    const a = await report(55, passing([]));
    const b = await report(56, passing([]));
    const chapterOf = (r: { known: KnownScore[] }): string => r.known[1].chapter;
    expect(chapterOf(a)).toBe(secondChapter(55));
    expect(chapterOf(b)).toBe(secondChapter(56));
    expect(chapterOf(a)).not.toBe(chapterOf(b));
    expect(a.text).toContain(`| ${secondChapter(55)} |`);
    expect(b.text).toContain(`| ${secondChapter(56)} |`);
  });

  it('shows the second pass’s disagreement rate for a book that has recheck files, and a dash for one that has none', () => {
    const one = readChoices('ref\tparsing\tlemma\tmark\nGen.1:1#1\tN-NSM\tλόγος\t\nGen.1:1#2\tN-NSF\t\t\nGen.1:1#3\tT-NSN\t\t\nGen.1:1#4\tT-GSN\t\t\n');
    const two = readChoices('ref\tparsing\tlemma\tmark\nGen.1:1#1\tN-NSM\tἄνθρωπος\t\nGen.1:1#2\tN-NSF\t\t\nGen.1:1#3\tT-ASN\t\t\nGen.1:7#7\tT-ASN\t\t\n');
    expect(disagreement(one, two)).toEqual({ sample: 3, differ: 2 });
    expect(disagreement(one, new Map())).toEqual({ sample: 0, differ: 0 });
  });

  it('the report names the second pass’s files by book: a recheck file shows in the book’s row', async () => {
    const recheckDir = tmp();
    const choicesDir = tmp();
    const gen = deriveBook(GEN_1, 'gen');
    const first = gen.pending.filter((p) => p.candidates.length > 1).slice(0, 10);
    const rows = (pick: (p: PendingWord, i: number) => string): string => ['ref\tparsing\tlemma\tmark', ...first.map((p, i) => `${p.ref}\t${pick(p, i)}\t${p.candidates[0].lemma}\t`)].join('\n') + '\n';
    writeFileSync(join(choicesDir, 'gen-01.tsv'), rows((p) => p.candidates[0].morph));
    writeFileSync(join(recheckDir, 'gen-01.tsv'), rows((p, i) => (i < 3 ? p.candidates[1].morph : p.candidates[0].morph)));
    const out = await runReport(['--build', '55'], { input: GEN_1, doc: join(tmp(), 'r.md'), choicesDir, recheckDir, morpheusDir: tmp(), known: passing([]), books: [['Gen', 'Genesis']] });
    expect(out.rows[0].secondPass).toEqual({ sample: 10, differ: 3 });
    expect(out.text).toContain('30.0% of 10');
  });
});

describe('docs/lxx-derivation.md says the bar', () => {
  const doc = readFileSync('docs/lxx-derivation.md', 'utf8');

  it('names each line of the bar with its number and why, and says the annotation file is the MIT release', () => {
    expect(doc).toMatch(/^## The bar$/m);
    for (const s of [
      `at least ${BAR.knownLemma}%`,
      `at least ${BAR.knownParsing}%`,
      'John 1',
      'no word of the book',
      `${BAR.guesses}%`,
      `${BAR.breaks} per 1,000`,
      'scripts/lxx/bar.ts',
      'data/lxx/annotations/<book>.tsv',
      'MIT',
      'npm run lxx:known',
      'npm run lxx:release',
      'npm run lxx:report',
      'docs/lxx-report.md',
      'data/lxx/choices/',
      'data/lxx/known/',
    ]) {
      expect(doc, s).toContain(s);
    }
    for (const chapter of SECOND_CHAPTERS) expect(doc).toContain(chapter);
  });

  it('the committed report is a table of the 39 books between its markers', () => {
    const report = readFileSync('docs/lxx-report.md', 'utf8');
    const block = report.slice(report.indexOf(REPORT_START), report.indexOf(REPORT_END));
    expect(block.match(/^\| .+ \([1-3A-Za-z]{3}\) \|/gm)).toHaveLength(39);
    for (const [, name] of OLD_TESTAMENT) expect(block).toContain(`| ${name} (`);
    expect(block).toMatch(/SHIPPABLE|NOT/);
  });
});

// The Governor's answer of 2026-11-02, "A: Count only words with no candidate" (story mw-u2w5klk.20, B9; decision card direct:cca660c0...7d2a on mw-u2w5klk): the bar's guesses
// are the words a model had to guess: one with no candidate, one outside the candidates, one it marked a guess. A word read from its own form (candidate support `form`,
// derive.ts withFormNames) that a model chooses among is a reading, however little a lexicon vouches for it, and does not count.
describe('the bar counts only the words with no candidate, or marked a guess: not a choice among form candidates (B9)', () => {
  const formName = (ref: string): PendingWord => ({
    ref,
    notes: ['a name no lexicon has: its form read as its own lemma, every case of every gender: for the agreement check or the model'],
    candidates: ['N-NSF', 'N-GSF', 'N-DSF'].map((morph) => ({ lemma: 'Βήθ', morph, support: 0, share: 0, via: ['a name no lexicon has'], source: 'form' as const })),
  });
  const none = (ref: string): PendingWord => ({ ref, notes: ['no candidate: for the model to guess'], candidates: [] });

  it('does not count a choice among form candidates, even an unsure one, and counts one on a word with no candidates or one marked a guess', () => {
    const words = [formName('Tst.1:1#1'), formName('Tst.1:1#2'), formName('Tst.1:1#3'), none('Tst.1:1#4'), none('Tst.1:1#5')];
    const choices = readChoices(
      ['Tst.1:1#1\tN-NSF\tΒήθ', 'Tst.1:1#2\tN-GSF\tΒήθ\tunsure', 'Tst.1:1#3\tN-DSF\tΒήθ\tguess', 'Tst.1:1#4\tN-NSF\tΒήθ', 'Tst.1:1#5\tN-NSF\tΒήθ\tguess'].join('\n'),
    );
    const { chosen, left } = applyChoices(words, choices);
    expect(left).toEqual([]);
    const byRef = (ref: string) => chosen.find((w) => w.ref === ref)!;
    expect(isGuess(byRef('Tst.1:1#1'))).toBe(false);
    expect(isGuess(byRef('Tst.1:1#2'))).toBe(false);
    expect(byRef('Tst.1:1#1').notes.some((n) => n.startsWith('guess:'))).toBe(false);
    // a form candidate the model marks a guess is one; so is a word with no candidate at all
    expect(isGuess(byRef('Tst.1:1#3'))).toBe(true);
    expect(isGuess(byRef('Tst.1:1#4'))).toBe(true);
    expect(isGuess(byRef('Tst.1:1#5'))).toBe(true);
    // the bar's figure is the count of isGuess: 3 of the 5, not 5
    expect(chosen.filter(isGuess)).toHaveLength(3);
    expect(verdict({ words: 100, pending: 0, guesses: chosen.filter(isGuess).length, breaks: 0 }, []).shippable).toBe(true);
    expect(verdict({ words: 100, pending: 0, guesses: chosen.length, breaks: 0 }, []).shippable).toBe(false);
  });
});
