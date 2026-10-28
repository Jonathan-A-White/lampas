// scripts/data/variants.ts: the RP 2018 apparatus (byztxt v3.3.2, csv-unicode/ccat/with-variants) parsed and aligned to the MSB Greek words,
// on rows of the real files written here (nothing of byztxt is committed as a file) and never the network (mw-9ji6ek0.1).
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBuild } from '../../scripts/data-build';
import {
  VARIANTS_FILES,
  VARIANTS_RAW_DIR,
  VARIANTS_SHA256,
  VARIANTS_TAG,
  alignChapter,
  parseApparatus,
  parseVariantsCsv,
  variantsReport,
} from '../../scripts/data/variants';
import type { Chapter } from '../../src/data/chapter';

// Revelation 3:1-3 as REV.csv has it, and the same verses' words in the MSB table, in Greek order.
const REV_3 = `chapter,verse,text
3,1,"Καὶ τῷ ἀγγέλῳ τῆς ἐν Σάρδεσιν ἐκκλησίας γράψον, ¶Τάδε λέγει ὁ ἔχων τὰ ἑπτὰ πνεύματα τοῦ θεοῦ καὶ τοὺς ἑπτὰ ἀστέρας· Οἶδά σου τὰ ἔργα, ὅτι ὄνομα ἔχεις ὅτι {Byz ὅτι ζῇς > καὶ ζῇς } ζῇς, καὶ νεκρὸς εἶ."
3,2,"Γίνου γρηγορῶν, καὶ στήρισον {Byz στήρισον > στήριξον = τήρησον } τὰ λοιπὰ ἃ ἔμελλες {Byz ἔμελλες ἀποβάλλειν > ἠμελλες ἀποβάλλειν = ἐμέλλον ἀποθάνειν } {NA ἔμελλες ἀποβάλλειν > ἔμελλον ἀποθανεῖν } ἀποβάλλειν· οὐ γὰρ εὕρηκά σου τὰ ἔργα πεπληρωμένα ἐνώπιον τοῦ θεοῦ μου."
3,3,"Μνημόνευε οὖν πῶς εἴληφας καὶ {Byz καὶ ἤκουσας καὶ τήρει > - } ἤκουσας, καὶ τήρει, καὶ μετανόησον. Ἐὰν οὖν μὴ γρηγορήσῃς, ἥξω ἐπί {NA ἐπί σε ὡς > ὡς } σε ὡς κλέπτης, καὶ οὐ μὴ γνῷς {Byz γνῷς > γνώσῃ } ποίαν ὥραν ἥξω ἐπί σε."
`;
const MSB_REV_3 = [
  { n: 1, words: 'Καὶ τῷ ἀγγέλῳ τῆς ἐν Σάρδεσιν ἐκκλησίας γράψον Τάδε λέγει ὁ ἔχων τὰ ἑπτὰ πνεύματα τοῦ θεοῦ καὶ τοὺς ἑπτὰ ἀστέρας Οἶδά σου τὰ ἔργα ὅτι ὄνομα ἔχεις ὅτι ζῇς καὶ νεκρὸς εἶ'.split(' ') },
  { n: 2, words: 'Γίνου γρηγορῶν καὶ στήρισον τὰ λοιπὰ ἃ ἔμελλες ἀποβάλλειν οὐ γὰρ εὕρηκά σου τὰ ἔργα πεπληρωμένα ἐνώπιον τοῦ θεοῦ μου'.split(' ') },
  { n: 3, words: 'Μνημόνευε οὖν πῶς εἴληφας καὶ ἤκουσας καὶ τήρει καὶ μετανόησον Ἐὰν οὖν μὴ γρηγορήσῃς ἥξω ἐπί σε ὡς κλέπτης καὶ οὐ μὴ γνῷς ποίαν ὥραν ἥξω ἐπί σε'.split(' ') },
];

// Revelation 17:8, the one verse of Revelation in tests/fixtures/data/msb-slice.tsv; Romans 16:24, a verse the NA text leaves out.
const REV_17_8 =
  '17,8,"Τὸ θηρίον, ὃ εἶδες, ἦν, καὶ οὐκ ἔστιν, καὶ μέλλει ἀναβαίνειν ἐκ τῆς ἀβύσσου, καὶ εἰς ἀπώλειαν ὑπάγειν. {NA ὑπάγειν > ὑπάγει } Καὶ θαυμάσονται {NA θαυμάσονται > θαυμασθήσονται } οἱ κατοικοῦντες ἐπὶ {Byz ἐπὶ τῆς γῆς > τὴν γῆν } τῆς γῆς, ὧν οὐ γέγραπται τὰ {NA τὰ ὀνόματα > τὸ ὄνομα } ὀνόματα {Byz τὰ ὀνόματα > τὸ ὄνομα } ἐπὶ τὸ {Byz τὸ βιβλίον > τοῦ βιβλίου } βιβλίον τῆς ζωῆς ἀπὸ καταβολῆς κόσμου, βλεπόντων ὅτι {Byz ὅτι ἦν τὸ θηρίον > τὸ θηρίον ὅτι ἦν } {NA ὅτι ἦν τὸ θηρίον > τὸ θηρίον ὅτι ἦν } ἦν τὸ θηρίον, καὶ οὐκ ἔστιν, καὶ παρέσται."';
const ROM_16_24 = '16,24,Ἡ χάρις τοῦ κυρίου ἡμῶν Ἰησοῦ χριστοῦ μετὰ πάντων ὑμῶν. Ἀμήν. {NA ~ }';

describe('an apparatus verse', () => {
  it('is cut into the edition’s words and its units, each with its code, its base and its readings', () => {
    const { words, units } = parseApparatus(parseVariantsCsv(REV_3).get('3:2')!);
    expect(words.slice(0, 9)).toEqual(['Γίνου', 'γρηγορῶν', 'καὶ', 'στήρισον', 'τὰ', 'λοιπὰ', 'ἃ', 'ἔμελλες', 'ἀποβάλλειν']);
    expect(words).toHaveLength(20);
    expect(units).toEqual([
      { code: 'B', base: 'στήρισον', after: 3, alts: ['στήριξον', 'τήρησον'], whole: false },
      { code: 'B', base: 'ἔμελλες ἀποβάλλειν', after: 7, alts: ['ἠμελλες ἀποβάλλειν', 'ἐμέλλον ἀποθάνειν'], whole: false },
      { code: 'N', base: 'ἔμελλες ἀποβάλλειν', after: 7, alts: ['ἔμελλον ἀποθανεῖν'], whole: false },
    ]);
  });

  it('reads a reading that leaves the words out (-) as empty, and {NA ~ } as the whole verse left out', () => {
    expect(parseApparatus(parseVariantsCsv(REV_3).get('3:3')!).units[0]).toMatchObject({ code: 'B', base: 'καὶ ἤκουσας καὶ τήρει', alts: [''] });
    const rom = parseApparatus(parseVariantsCsv(`chapter,verse,text\n${ROM_16_24}\n`).get('16:24')!);
    expect(rom.words).toHaveLength(11);
    expect(rom.units).toEqual([{ code: 'N', base: '', after: 10, alts: [''], whole: true }]);
  });

  it('refuses a code it does not know, so a new tag cannot slip a siglum past the build', () => {
    expect(() => parseApparatus('λόγος {XYZ λόγος > λόγου }')).toThrow(/XYZ/);
  });
});

describe('Revelation 3:1-3', () => {
  const rp = parseVariantsCsv(REV_3);
  const result = alignChapter('Revelation', 3, MSB_REV_3, rp);

  it('yields its apparatus units with the MSB word indexes, the base and the readings', () => {
    expect(result.units).toEqual([
      // the second ὅτι of 3:1, the one the unit follows, not the first
      { v: 1, w: [28, 29], base: 'ὅτι ζῇς', alts: [{ code: 'B', text: 'καὶ ζῇς' }] },
      { v: 2, w: [3], base: 'στήρισον', alts: [{ code: 'B', text: 'στήριξον' }, { code: 'B', text: 'τήρησον' }] },
      // a Byzantine and an NA unit on the same words are one unit with the readings of both
      {
        v: 2,
        w: [7, 8],
        base: 'ἔμελλες ἀποβάλλειν',
        alts: [
          { code: 'B', text: 'ἠμελλες ἀποβάλλειν' },
          { code: 'B', text: 'ἐμέλλον ἀποθάνειν' },
          { code: 'N', text: 'ἔμελλον ἀποθανεῖν' },
        ],
      },
      { v: 3, w: [4, 5, 6, 7], base: 'καὶ ἤκουσας καὶ τήρει', alts: [{ code: 'B', text: '' }] },
      { v: 3, w: [15, 16, 17], base: 'ἐπί σε ὡς', alts: [{ code: 'N', text: 'ὡς' }] },
      { v: 3, w: [22], base: 'γνῷς', alts: [{ code: 'B', text: 'γνώσῃ' }] },
    ]);
  });

  it('counts each apparatus unit by its code, and every one is aligned', () => {
    expect(result.counts).toEqual({ B: 5, N: 2 });
    expect(result.aligned).toEqual({ B: 5, N: 2 });
    expect(result.unaligned).toEqual([]);
  });

  it('lists a unit whose base the MSB verse lacks, with its reference, and leaves it out of the units', () => {
    const msb = MSB_REV_3.map((v) => (v.n === 3 ? { n: 3, words: v.words.map((w) => (w === 'γνῷς' ? 'γνῶτε' : w)) } : v));
    const r = alignChapter('Revelation', 3, msb, rp);
    expect(r.units.some((u) => u.base === 'γνῷς')).toBe(false);
    expect(r.unaligned).toEqual([{ ref: 'Revelation 3:3', code: 'B', base: 'γνῷς', why: expect.any(String) }]);
    expect(r.counts).toEqual({ B: 5, N: 2 });
    expect(r.aligned).toEqual({ B: 4, N: 2 });
  });

  it('matches words by their letters only: accents, breathings, case and final sigma do not count', () => {
    const msb = MSB_REV_3.map((v) => (v.n === 1 ? { n: 1, words: v.words.map((w) => (w === 'ζῇς' ? 'ΖΗΣ' : w)) } : v));
    expect(alignChapter('Revelation', 3, msb, rp).units[0]).toEqual({ v: 1, w: [28, 29], base: 'ὅτι ζῇς', alts: [{ code: 'B', text: 'καὶ ζῇς' }] });
  });
});

describe('a unit the brace follows the second word of', () => {
  it('finds the base nearest the brace (Revelation 17:8 τὰ ὀνόματα), and lays a verse left out over every word of it', () => {
    const words = parseApparatus(parseVariantsCsv(`chapter,verse,text\n${REV_17_8}\n`).get('17:8')!).words;
    const r = alignChapter('Revelation', 17, [{ n: 8, words }], parseVariantsCsv(`chapter,verse,text\n${REV_17_8}\n`));
    expect(r.units.find((u) => u.base === 'τὰ ὀνόματα')).toEqual({
      v: 8,
      w: [28, 29],
      base: 'τὰ ὀνόματα',
      alts: [{ code: 'N', text: 'τὸ ὄνομα' }, { code: 'B', text: 'τὸ ὄνομα' }],
    });
    const romWords = 'Ἡ χάρις τοῦ κυρίου ἡμῶν Ἰησοῦ χριστοῦ μετὰ πάντων ὑμῶν Ἀμήν'.split(' ');
    const rom = alignChapter('Romans', 16, [{ n: 24, words: romWords }], parseVariantsCsv(`chapter,verse,text\n${ROM_16_24}\n`));
    expect(rom.units).toEqual([{ v: 24, w: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], base: romWords.join(' '), alts: [{ code: 'N', text: '' }] }]);
  });
});

describe('a base in pieces, and a base the table sets in the next verse', () => {
  it('lays "ἐν... ἐν... ἐν" (Mark 4:8) on each piece in turn, from the brace on', () => {
    const row = '4,8,"Καὶ ἄλλο {NA ἄλλο > ἄλλα } ἔπεσεν εἰς τὴν γῆν τὴν καλήν· καὶ ἐδίδου καρπὸν ἀναβαίνοντα καὶ αὐξάνοντα, {NA αὐξάνοντα > αὐξανόμενα } καὶ ἔφερεν ἐν {NA ἐν... ἐν... ἐν > ἓν... ἓν... ἓν } τριάκοντα, καὶ ἐν ἑξήκοντα, καὶ ἐν ἑκατόν."';
    const words = 'Καὶ ἄλλο ἔπεσεν εἰς τὴν γῆν τὴν καλήν καὶ ἐδίδου καρπὸν ἀναβαίνοντα καὶ αὐξάνοντα καὶ ἔφερεν ἐν τριάκοντα καὶ ἐν ἑξήκοντα καὶ ἐν ἑκατόν'.split(' ');
    const r = alignChapter('Mark', 4, [{ n: 8, words }], parseVariantsCsv(`chapter,verse,text\n${row}\n`));
    expect(r.units.at(-1)).toEqual({ v: 8, w: [16, 19, 22], base: 'ἐν... ἐν... ἐν', alts: [{ code: 'N', text: 'ἓν... ἓν... ἓν' }] });
    expect(r.unaligned).toEqual([]);
  });

  it('finds a base the MSB verse lacks at the end of the verse before (Mark 7:22 κλοπαί, which the table ends 7:21 with)', () => {
    const rows = [
      '7,21,"Ἔσωθεν γάρ, ἐκ τῆς καρδίας τῶν ἀνθρώπων οἱ διαλογισμοὶ οἱ κακοὶ ἐκπορεύονται, μοιχεῖαι, {NA μοιχεῖαι πορνεῖαι > πορνεῖαι κλοπαί } πορνεῖαι, φόνοι,"',
      '7,22,"κλοπαί, {NA κλοπαί > μοιχεῖαι } πλεονεξίαι, πονηρίαι, δόλος, ἀσέλγεια, ὀφθαλμὸς πονηρός, βλασφημία, ὑπερηφανία, ἀφροσύνη·"',
    ];
    const msb = [
      { n: 21, words: 'Ἔσωθεν γάρ ἐκ τῆς καρδίας τῶν ἀνθρώπων οἱ διαλογισμοὶ οἱ κακοὶ ἐκπορεύονται μοιχεῖαι πορνεῖαι φόνοι κλοπαί'.split(' ') },
      { n: 22, words: 'πλεονεξίαι πονηρίαι δόλος ἀσέλγεια ὀφθαλμὸς πονηρός βλασφημία ὑπερηφανία ἀφροσύνη'.split(' ') },
    ];
    const r = alignChapter('Mark', 7, msb, parseVariantsCsv(`chapter,verse,text\n${rows.join('\n')}\n`));
    expect(r.units).toEqual([
      { v: 21, w: [12, 13], base: 'μοιχεῖαι πορνεῖαι', alts: [{ code: 'N', text: 'πορνεῖαι κλοπαί' }] },
      { v: 21, w: [15], base: 'κλοπαί', alts: [{ code: 'N', text: 'μοιχεῖαι' }] },
    ]);
  });
});

describe('Matthew 15:4-6, where the table starts 15:6 with the end of 15:5', () => {
  it('lays καὶ on the καὶ that begins 15:6, not the καί that ends 15:4', () => {
    const rows = [
      '15,4,"Ὁ γὰρ θεὸς ἐνετείλατο, {NA ἐνετείλατο λέγων > εἶπεν } λέγων, Τίμα τὸν πατέρα καὶ τὴν μητέρα· καί, Ὁ κακολογῶν πατέρα ἢ μητέρα θανάτῳ τελευτάτω·"',
      '15,5,"ὑμεῖς δὲ λέγετε, Ὃς ἂν εἴπῃ τῷ πατρὶ ἢ τῇ μητρί, Δῶρον, ὃ ἐὰν ἐξ ἐμοῦ ὠφεληθῇς, καὶ {NA καὶ > - } οὐ μὴ τιμήσῃ {NA τιμήσῃ > τιμήσει } τὸν πατέρα αὐτοῦ {NA αὐτοῦ ἢ τὴν μητέρα > - } ἢ τὴν μητέρα αὐτοῦ·"',
    ];
    const msb = [
      { n: 4, words: 'Ὁ γὰρ θεὸς ἐνετείλατο λέγων Τίμα τὸν πατέρα καὶ τὴν μητέρα καί Ὁ κακολογῶν πατέρα ἢ μητέρα θανάτῳ τελευτάτω'.split(' ') },
      { n: 5, words: 'ὑμεῖς δὲ λέγετε Ὃς ἂν εἴπῃ τῷ πατρὶ ἢ τῇ μητρί Δῶρον ὃ ἐὰν ἐξ ἐμοῦ ὠφεληθῇς'.split(' ') },
      { n: 6, words: 'καὶ οὐ μὴ τιμήσῃ τὸν πατέρα αὐτοῦ ἢ τὴν μητέρα αὐτοῦ καὶ ἠκυρώσατε τὴν ἐντολὴν τοῦ θεοῦ διὰ τὴν παράδοσιν ὑμῶν'.split(' ') },
    ];
    const r = alignChapter('Matthew', 15, msb, parseVariantsCsv(`chapter,verse,text\n${rows.join('\n')}\n`));
    expect(r.units.filter((u) => u.v === 6)).toEqual([
      { v: 6, w: [0], base: 'καὶ', alts: [{ code: 'N', text: '' }] },
      { v: 6, w: [3], base: 'τιμήσῃ', alts: [{ code: 'N', text: 'τιμήσει' }] },
      { v: 6, w: [6, 7, 8, 9], base: 'αὐτοῦ ἢ τὴν μητέρα', alts: [{ code: 'N', text: '' }] },
    ]);
    expect(r.units.filter((u) => u.v === 4)).toEqual([{ v: 4, w: [3, 4], base: 'ἐνετείλατο λέγων', alts: [{ code: 'N', text: 'εἶπεν' }] }]);
  });

  it('keeps words that stand together in the base together (Mark 6:28 Ὁ δὲ, which the table ends 6:27 with, after an earlier ὁ)', () => {
    const rows = [
      '6,27,Καὶ εὐθέως {NA εὐθέως > εὐθὺς } ἀποστείλας ὁ βασιλεὺς σπεκουλάτορα ἐπέταξεν ἐνεχθῆναι {NA ἐνεχθῆναι > ἐνέγκαι } τὴν κεφαλὴν αὐτοῦ.',
      '6,28,"Ὁ {NA Ὁ δὲ > Καὶ } δὲ ἀπελθὼν ἀπεκεφάλισεν αὐτὸν ἐν τῇ φυλακῇ, καὶ ἤνεγκεν τὴν κεφαλὴν αὐτοῦ ἐπὶ πίνακι, καὶ ἔδωκεν αὐτὴν τῷ κορασίῳ· καὶ τὸ κοράσιον ἔδωκεν αὐτὴν τῇ μητρὶ αὐτῆς."',
    ];
    const msb = [
      { n: 27, words: 'Καὶ εὐθέως ἀποστείλας ὁ βασιλεὺς σπεκουλάτορα ἐπέταξεν ἐνεχθῆναι τὴν κεφαλὴν αὐτοῦ Ὁ δὲ ἀπελθὼν ἀπεκεφάλισεν αὐτὸν ἐν τῇ φυλακῇ'.split(' ') },
      { n: 28, words: 'καὶ ἤνεγκεν τὴν κεφαλὴν αὐτοῦ ἐπὶ πίνακι καὶ ἔδωκεν αὐτὴν τῷ κορασίῳ καὶ τὸ κοράσιον ἔδωκεν αὐτὴν τῇ μητρὶ αὐτῆς'.split(' ') },
    ];
    const r = alignChapter('Mark', 6, msb, parseVariantsCsv(`chapter,verse,text\n${rows.join('\n')}\n`));
    expect(r.units.find((u) => u.base === 'Ὁ δὲ')).toEqual({ v: 27, w: [11, 12], base: 'Ὁ δὲ', alts: [{ code: 'N', text: 'Καὶ' }] });
  });
});

describe('the report', () => {
  it('prints the units by code, the share aligned, and each unit not aligned', () => {
    const lines = variantsReport({
      counts: { B: 3, N: 1 },
      aligned: { B: 2, N: 1 },
      unaligned: [{ ref: 'Revelation 3:3', code: 'B', base: 'γνῷς', why: 'the MSB verse lacks the base' }],
      books: [{ name: 'Revelation', counts: { B: 3, N: 1 } }],
    });
    expect(lines).toContain(`variants (byztxt ${VARIANTS_TAG}): 4 units: B 3, N 1`);
    expect(lines).toContain('variants aligned: 3 of 4 (75.0%), 1 not aligned');
    expect(lines).toContain('  Revelation: B 3, N 1');
    expect(lines).toContain('  not aligned: Revelation 3:3 B "γνῷς": the MSB verse lacks the base');
  });
});

describe('the build', () => {
  const msb = readFileSync('tests/fixtures/data/msb-slice.tsv', 'utf8');
  const tbesg = readFileSync('tests/fixtures/data/tbesg-slice.txt', 'utf8');
  const fileOf = (name: string): string => (name === 'REV' ? `chapter,verse,text\n${REV_17_8}\n` : 'chapter,verse,text\n');
  const sha = createHash('sha256');
  for (const name of Object.values(VARIANTS_FILES)) sha.update(fileOf(name));
  const fixtureSha = sha.digest('hex');

  async function build(checksum?: string) {
    const base = mkdtempSync(join(tmpdir(), 'lampas-variants-'));
    const raw = join(base, 'raw');
    mkdirSync(raw, { recursive: true });
    writeFileSync(join(raw, 'msb_nt_tables.tsv'), msb);
    writeFileSync(join(raw, 'tbesg.txt'), tbesg);
    const downloads: string[] = [];
    const log: string[] = [];
    try {
      await runBuild({
        rawDir: raw,
        outDir: join(base, 'out'),
        log: (line) => log.push(line),
        variantsSha256: checksum,
        rp2026: false,
        download: async (url, dest) => {
          downloads.push(url);
          mkdirSync(join(dest, '..'), { recursive: true });
          writeFileSync(dest, fileOf(url.split('/').pop()!.replace(/\.csv$/, '')));
        },
      });
      return { downloads, log, rev: JSON.parse(readFileSync(join(base, 'out', 'rev', '17.json'), 'utf8')) as Chapter, raw };
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  }

  it('fetches each book of the apparatus at the pinned tag into data/raw and writes its units into the chapter file', async () => {
    const { downloads, log, rev } = await build(fixtureSha);
    expect(downloads.filter((u) => u.includes('byztxt'))).toHaveLength(27);
    expect(downloads).toContain(`https://raw.githubusercontent.com/byztxt/byzantine-majority-text/${VARIANTS_TAG}/csv-unicode/ccat/with-variants/REV.csv`);
    expect(VARIANTS_RAW_DIR).toBe(`byztxt-${VARIANTS_TAG}`);
    expect(rev.variants).toHaveLength(6);
    expect(rev.variants![0]).toEqual({ v: 8, w: [17], base: 'ὑπάγειν', alts: [{ code: 'N', text: 'ὑπάγει' }] });
    expect(log).toContain(`variants (byztxt ${VARIANTS_TAG}): 8 units: B 4, N 4`);
    expect(log).toContain('variants aligned: 8 of 8 (100.0%), 0 not aligned');
    expect(log).toContain('  Revelation: B 4, N 4');
  });

  it('refuses files whose sha256 is not the pinned one', async () => {
    expect(VARIANTS_SHA256).toMatch(/^[0-9a-f]{64}$/);
    await expect(build()).rejects.toThrow(/sha256/);
  });
});
