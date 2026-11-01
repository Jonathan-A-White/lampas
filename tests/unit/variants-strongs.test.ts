// scripts/data/tagnt.ts and the Strong's numbers of variant words (mw-9ji6ek0.44): a word of a reading carries its number from the text's own forms or
// the lexicon's lemmas ('lexicon'), STEPBible's TAGNT ('tagnt') or, only where neither has one, the nearest lemma marked 'guess'. Rows of the real files
// written here, and never the network.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseLexicon } from '../../scripts/data-build';
import { TAGNT_FILES, TAGNT_RAW_DIR, TAGNT_SHA256, loadTagnt, parseTagnt, tagntUrl } from '../../scripts/data/tagnt';
import {
  formIndex,
  guessedText,
  lemmaIndex,
  tagReading,
  tagVariants,
  taggedLine,
  tagntIndex,
  untaggedText,
} from '../../scripts/data/variantWords';
import type { Chapter, GreekWord } from '../../src/data/chapter';

// Revelation 10:2 and Matthew 2:5 as TAGNT has them (tab separated; the header and '#' rows of the real file come first and are skipped)
const ROWS = [
  'TAGNT Act-Rev - Translators Amalgamated Greek NT -  STEPBible.org CC BY 4.0\t\t\t',
  '# Rev.10.2\tκαὶ \tἔχων \t\t',
  'Rev.10.2#02=N(k)O\tἔχων (echōn)\thaving\tG2192=V-PAP-NSM\tἔχω=to have/be\tNA28+NA27+Tyn+SBL+WH+Treg+Byz\tεἴχεν (t=eichen) had - G2192=V-IAI-3S in: TR\t\testando\tto have\t#02\tG2192\t\t',
  'Rev.10.2#07=NK(o)\tβιβλαρίδιον (biblaridion)\ta little scroll\tG0974=N-ASN\tβιβλαρίδιον=little scroll\tNA28+NA27+Tyn+SBL+WH+Treg+TR\tβιβλίον (o=biblion) a scroll - G0975=N-ASN in: Byz\t\trollito\tlittle scroll\t#07\tG0974\tG0975\t\t',
  'Rev.10.9#11=NKO\tβιβλαρίδιον. (biblaridion)\tlittle scroll.\tG0974=N-ASN\tβιβλαρίδιον=little scroll\tNA28+NA27+Tyn+SBL+WH+Treg+TR+Byz\t\tByz: βιβλιδάριον ; \trollito\tlittle scroll\t#11\tG0974\t\t',
  'Mat.2.5#03=NKO\tεἶπαν (eipan)\tthey said\tG2036=V-2AAI-3P\tἔπω, ἐρῶ, εἶπον=to say\tNA28+NA27+Tyn+SBL+WH+Treg+TR+Byz\t\tTyn+TR: εἶπον ; WH: εἴπαμεν ; \tdijeron\tto say\t#03\tG2036\t\t',
  'Act.9.26#01=NKO\tἸερουσαλὴμ (Ierousalēm)\tJerusalem\tG2419=N-ASF-L\tἹερουσαλήμ=Jerusalem\tNA28\t\t\t\tJerusalén\tJerusalem\t#01\tG2419\t\t',
  'Mat.5.3#01=NKO\tΜακάριοι (Makarioi)\tBlessed\tG3107=A-NPM\tμακάριος=blessed\tNA28\t\t\tdichosos\tblessed\t#01\tG3107\t\t',
].join('\n');

describe('TAGNT', () => {
  const words = parseTagnt(ROWS);
  const of = (form: string) => words.filter((w) => w.form === form);

  it('reads a row’s own word with its number, no padding, its parsing and its book', () => {
    expect(of('βιβλαρίδιον')).toEqual([
      { form: 'βιβλαρίδιον', s: 'G974', p: 'N-ASN', book: 'rev' },
      { form: 'βιβλαρίδιον', s: 'G974', p: 'N-ASN', book: 'rev' }, // Revelation 10:9 prints a full stop after it
    ]);
    expect(of('Μακάριοι')).toEqual([{ form: 'Μακάριοι', s: 'G3107', p: 'A-NPM', book: 'mat' }]);
  });

  it('reads the other word a column of meanings names, with that word’s number and parsing', () => {
    expect(of('βιβλίον')).toEqual([{ form: 'βιβλίον', s: 'G975', p: 'N-ASN', book: 'rev' }]);
    expect(of('εἴχεν')).toEqual([{ form: 'εἴχεν', s: 'G2192', p: 'V-IAI-3S', book: 'rev' }]);
  });

  it('reads the other spellings of a word as the word itself', () => {
    expect(of('βιβλιδάριον')).toEqual([{ form: 'βιβλιδάριον', s: 'G974', p: 'N-ASN', book: 'rev' }]);
    expect(of('εἶπον')).toEqual([{ form: 'εἶπον', s: 'G2036', p: 'V-2AAI-3P', book: 'mat' }]);
    expect(of('εἴπαμεν')).toHaveLength(1);
  });

  it('skips the header and the comment rows', () => {
    expect(words.some((w) => w.form === 'TAGNT' || w.form === 'καὶ')).toBe(false);
  });

  it('names the two files and fetches them from STEPBible at the pinned sha256', async () => {
    expect(TAGNT_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(TAGNT_RAW_DIR).toBe('tagnt');
    expect(tagntUrl(TAGNT_FILES[0].remote)).toBe(
      'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',
    );
    const base = mkdtempSync(join(tmpdir(), 'lampas-tagnt-'));
    try {
      const downloads: string[] = [];
      const download = async (url: string, dest: string): Promise<void> => {
        downloads.push(url);
        mkdirSync(join(dest, '..'), { recursive: true });
        writeFileSync(dest, ROWS);
      };
      const sha = createHash('sha256').update(ROWS).update(ROWS).digest('hex');
      const loaded = await loadTagnt(base, download, () => undefined, sha);
      expect(downloads).toHaveLength(2);
      expect(loaded).toHaveLength(words.length * 2);
      expect(readFileSync(join(base, TAGNT_RAW_DIR, TAGNT_FILES[1].local), 'utf8')).toBe(ROWS);
      await loadTagnt(base, download, () => undefined, sha); // the files are there: nothing is fetched again
      expect(downloads).toHaveLength(2);
      await expect(loadTagnt(base, download, () => undefined, '0'.repeat(64))).rejects.toThrow(/sha256/);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------- the three sources

const word = (t: string, s: string, l: string, p: string): GreekWord => ({ t, tr: '', s, l, p });
const chapterOf = (code: string, words: GreekWord[]): Chapter => ({ book: code, code, chapter: 1, lex: {}, parse: {}, verses: [{ n: 1, g: words, e: [] }] });
const TEXT = [
  chapterOf('rev', [word('βιβλιδάριον', 'G974', 'βιβλαρίδιον', 'N-ASN'), word('ζῇς', 'G2198', 'ζάω', 'V-PAI-2S'), word('λόγος', 'G3056', 'λόγος', 'N-NSM'), word('λόγον', 'G3056', 'λόγος', 'N-ASM')]),
  chapterOf('rev', [word('λόγου', 'G3056', 'λόγος', 'N-GSM'), word('λόγῳ', 'G3056', 'λόγος', 'N-DSM'), word('πειρασμοῦ', 'G3986', 'πειρασμός', 'N-GSM')]),
  // the lemmas a guess may name are those the text uses
  chapterOf('rev', [word('ἀπολύει', 'G630', 'ἀπολύω', 'V-PAI-3S'), word('ἐπείραζεν', 'G3985', 'πειράζω', 'V-IAI-3S'), word('Γερασηνοί', 'G1086', 'Γερασηνός', 'A-NPM')]),
];
// a lexicon of a few entries, made by parseLexicon from TBESG's rows (number, disambiguated, unified, headword, translit, morph, gloss, meaning)
const TBESG = [
  ['G0974', 'G0974', 'G0974', 'βιβλαρίδιον', 'biblaridion', 'G:N-N', 'little scroll', 'a little scroll'],
  ['G0975', 'G0975', 'G0975', 'βιβλίον', 'biblion', 'G:N-N', 'scroll', 'a scroll'],
  ['G2419', 'G2419', 'G2419', 'Ἰερουσαλήμ', 'Ierousalem', 'N:N--LG', 'Jerusalem', 'Jerusalem'],
  ['G2036', 'G2036', 'G2036', 'ἔπω', 'epo', 'G:V', 'to say', 'to say'],
  ['G2192', 'G2192', 'G2192', 'ἔχω', 'echo', 'G:V', 'to have', 'to have'],
  ['G2198', 'G2198', 'G2198', 'ζάω', 'zao', 'G:V', 'to live', 'to live'],
  ['G3056', 'G3056', 'G3056', 'λόγος', 'logos', 'G:N-M', 'word', 'a word'],
  ['G0629', 'G0629', 'G0629', 'ἀπολύτρωσις', 'apolutrosis', 'G:N-F', 'release', 'a release'],
  ['G0630', 'G0630', 'G0630', 'ἀπολύω', 'apoluo', 'G:V', 'to release', 'to release'],
  ['G1086', 'G1086', 'G1086', 'Γερασηνός', 'gerasenos', 'G:N-M', 'Gerasene', 'of Gerasa'],
  ['G3985', 'G3985', 'G3985', 'πειράζω', 'peirazo', 'G:V', 'to test', 'to test'],
  ['G3986', 'G3986', 'G3986', 'πειρασμός', 'peirasmos', 'G:N-M', 'testing', 'a test'],
  ['G4777', 'G4777', 'G4777', 'συν', 'sun', 'G:PREP', 'with', 'with'],
  ['G5177', 'G5177', 'G5177', 'τυγχάνω', 'tugchano', 'G:V', 'to happen', 'to happen'],
  ['G5178', 'G5178', 'G5178', 'τυγχανόντως', 'tugchanontos', 'G:ADV', 'by chance', 'by chance'],
]
  .map((r) => r.join('\t'))
  .join('\n');
const lexicon = parseLexicon(TBESG);
const index = formIndex(TEXT);
const sources = { tagnt: tagntIndex(parseTagnt(ROWS), lexicon), lemmas: lemmaIndex(lexicon, index) };

describe('the number of a variant word', () => {
  it('comes from the text’s own forms first, marked lexicon', () => {
    expect(tagReading('ζῇς', index, 'rev', sources).g).toEqual([{ ...word('ζῇς', 'G2198', 'ζάω', 'V-PAI-2S'), src: 'lexicon' }]);
  });

  it('comes from TAGNT for a form the text never has: Revelation 10:2’s βιβλαρίδιον is G974, the NA word’s lemma from the lexicon and its parsing from TAGNT', () => {
    const { g } = tagReading('βιβλαρίδιον', index, 'rev', sources);
    expect(g).toEqual([{ t: 'βιβλαρίδιον', tr: '', s: 'G974', l: 'βιβλαρίδιον', p: 'N-ASN', src: 'tagnt' }]);
    expect(tagReading('εἶπαν', index, 'mat', sources).g[0]).toMatchObject({ s: 'G2036', l: 'ἔπω', p: 'V-2AAI-3P', src: 'tagnt' });
  });

  it('gives a name its parsing without TAGNT’s own last part (N-ASF-L is N-ASF), and leaves a code the app cannot decode out', () => {
    expect(tagReading('Ἰερουσαλὴμ', index, 'act', sources).g[0]).toMatchObject({ s: 'G2419', l: 'Ἰερουσαλήμ', p: 'N-ASF', src: 'tagnt' });
    const odd = tagntIndex([{ form: 'ζῇς', s: 'G2198', p: 'V-NOPE-9X', book: 'rev' }], lexicon);
    expect(tagReading('ζῇς', formIndex([]), 'rev', { tagnt: odd }).g[0]).toMatchObject({ s: 'G2198', p: '', src: 'tagnt' });
  });

  it('is found in TAGNT with a case, a grave accent or an accent set aside, as the text’s forms are', () => {
    expect(tagReading('Βιβλαρίδιον', index, 'rev', sources).g[0]).toMatchObject({ s: 'G974', src: 'tagnt' });
    expect(tagReading('βιβλαριδιον', index, 'rev', sources).g[0]).toMatchObject({ s: 'G974', src: 'tagnt' });
  });

  it('comes from the lexicon by lemma where the form is a lemma neither source has read (no parsing then)', () => {
    expect(tagReading('τυγχανόντως', index, 'rev', sources).g[0]).toEqual({ t: 'τυγχανόντως', tr: '', s: 'G5178', l: 'τυγχανόντως', p: '', src: 'lexicon' });
    expect(tagReading('Τυγχάνω', index, 'rev', sources).g[0]).toMatchObject({ s: 'G5177', src: 'lexicon' });
  });

  it('is a guess, the nearest lemma, only where neither has one: ἀπολύσασα is read as ἀπολύω because it begins with the lemma’s stem', () => {
    const g = tagReading('ἀπολύσασα', index, 'rev', sources).g[0];
    expect(g).toEqual({ t: 'ἀπολύσασα', tr: '', s: 'G630', l: 'ἀπολύω', p: '', src: 'guess' });
  });

  it('is a guess that may begin with an augment: ἐπείραζον and ἠπείραζον are πειράζω', () => {
    expect(tagReading('ἐπείραζον', index, 'rev', sources).g[0]).toMatchObject({ s: 'G3985', l: 'πειράζω', src: 'guess' });
    expect(tagReading('ἠπείραζον', index, 'rev', sources).g[0]).toMatchObject({ s: 'G3985', src: 'guess' });
  });

  it('is a guess from a name for a name only, and from a word for a word', () => {
    expect(tagReading('Γερασηνῶν', index, 'rev', sources).g[0]).toMatchObject({ s: 'G1086', src: 'guess' });
    expect(tagReading('γερασηνῶν', index, 'rev', sources).g[0]).toMatchObject({ s: '' });
    expect(tagReading('Ἀπολύσασα', index, 'rev', sources).g[0]).toMatchObject({ s: '' });
  });

  it('is guessed only from a lemma the text uses: ἀπολύτρωσις is in the lexicon and not in the text, so ἀπολυτρώσεως is not read as it', () => {
    expect(tagReading('ἀπολυτρώσεως', index, 'rev', sources).g[0]).toMatchObject({ s: '' });
  });

  it('is not guessed from a stem under four letters, nor from a form far longer than its stem, nor for a numeral letter', () => {
    expect(tagReading('συνφοβουμένων', index, 'rev', sources).g[0]).toMatchObject({ s: '', l: '', p: '' });
    expect(tagReading('ΙΒ', index, 'rev', sources).g[0]).toMatchObject({ s: '' });
    expect(tagReading('ἀπολυσεωσαμενων', index, 'rev', sources).g[0]).toMatchObject({ s: '' });
  });

  it('is left with no number when no lexicon is given, as before', () => {
    expect(tagReading('ἀπολύσασα', index, 'rev').g[0]).toEqual(word('ἀπολύσασα', '', '', ''));
  });

  it('counts each source, prints the counts, lists the guesses and keeps the forms left', () => {
    const chapter: Chapter = {
      ...chapterOf('rev', [word('ζῇς', 'G2198', 'ζάω', 'V-PAI-2S')]),
      lex: { G2198: { g: 'to live', d: 'live' } },
      parse: { 'V-PAI-2S': 'verb' },
      variants: [
        {
          v: 1,
          w: [0],
          base: 'ζῇς',
          alts: [{ code: 'N', text: 'βιβλαρίδιον ζῇς ἀπολύσασα ἀπολύσασα τυγχανόντως ΙΒ' }],
          english: { source: 'lampas', base: 'live', alts: ['a'] },
          changesEnglish: true,
          witness: 'na',
        },
      ],
    };
    const tally = tagVariants([chapter], index, lexicon, sources.tagnt);
    expect(tally.total).toBe(6);
    expect(tally.by).toEqual({ lexicon: 2, tagnt: 1, guess: 2 });
    expect(taggedLine(tally)).toBe('variant words tagged: 5 of 6 (lexicon 2, tagnt 1, guess 2)');
    const g = chapter.variants![0].alts[0].g!;
    expect(g.map((w) => [w.s, w.src])).toEqual([['G974', 'tagnt'], ['G2198', 'lexicon'], ['G630', 'guess'], ['G630', 'guess'], ['G5178', 'lexicon'], ['', undefined]]);
    // lex gains the numbers the words use; parse gains only the parsings that are there (a lemma or a guess has none)
    expect(Object.keys(chapter.lex)).toEqual(['G630', 'G974', 'G2198', 'G5178']);
    expect(Object.keys(chapter.parse)).toEqual(['N-ASN', 'V-PAI-2S']);
    expect(guessedText(tally)).toContain('ἀπολύσασα\t2\tG630 ἀπολύω\trev 1:1');
    expect(untaggedText(tally)).toContain('ΙΒ\t1\t');
    expect(untaggedText(tally)).not.toContain('ἀπολύσασα');
  });
});

describe('the committed chapters’ variant words', () => {
  const chapter = (code: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${code}/${n}.json`, 'utf8')) as Chapter;

  it('give Revelation 10:2’s NA βιβλαρίδιον the number G974 from TAGNT, with its lemma and parsing', () => {
    const rev = chapter('rev', 10);
    const na = rev.variants!.filter((u) => u.v === 2).flatMap((u) => u.alts).find((a) => a.code === 'N' && a.text.startsWith('βιβλαρίδιον'))!;
    expect(na.g![0]).toEqual({ t: 'βιβλαρίδιον', tr: '', s: 'G974', l: 'βιβλαρίδιον', p: 'N-ASN', src: 'tagnt' });
    expect(rev.lex.G974).toBeDefined();
  });

  it('give every tagged word a source, and a lex entry', () => {
    for (const [code, n] of [['mat', 2], ['mrk', 2], ['act', 1], ['rom', 5], ['rev', 10]] as const) {
      const c = chapter(code, n);
      for (const a of c.variants?.flatMap((u) => u.alts) ?? []) {
        for (const w of a.g!) {
          if (w.s) {
            expect(['lexicon', 'tagnt', 'guess']).toContain(w.src);
            expect(c.lex[w.s]).toBeDefined();
            if (w.p) expect(c.parse[w.p]).toBeDefined();
          } else expect(w.src).toBeUndefined();
        }
      }
    }
  });
});
