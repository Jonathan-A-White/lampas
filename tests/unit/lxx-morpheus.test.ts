// The Septuagint derivation's second method on the words with no candidate (scripts/lxx/morpheus.ts, derive.ts, release.ts, report.ts;
// docs/lxx-derivation.md, 'Morpheus'; story mw-u2w5klk.6): Perseus' Morpheus run from its Docker image, its analyses mapped to TAGNT's codes, kept in a
// git-ignored cache and added to derive.ts as candidates. Never the network, never Docker: tests/fixtures/lxx/morpheus-sample.tsv stands for Morpheus's
// output on the seven forms of the Gen 1 and Ps 22 fixtures that have no candidate (see its header: CAPTURED from the real image, story mw-u2w5klk.14).
// The raw strings of the mapping tests are real output too, from the same run's sweep over the 60 books.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { NOTE_BESIDE, NOTE_MORPHEUS_BESIDE, NOTE_MORPHEUS_OVER, NOTE_THIN, isDerived, runDerive, weighMorpheus, type BookResult, type DeriveInput, type WordCandidate } from '../../scripts/lxx/derive';
import {
  MORPHEUS,
  dockerEngine,
  ensureCache,
  formOf,
  fromBeta,
  mapAnalysis,
  morpheusKey,
  parseAnalysis,
  parseCache,
  parseCruncher,
  toBeta,
  unmappedWhy,
  voicesOf,
  cacheText,
  MAPPING_VERSION,
  type MorpheusEngine,
} from '../../scripts/lxx/morpheus';
import { readChoices } from '../../scripts/lxx/choices';
import { morpheusCounts, runRelease } from '../../scripts/lxx/release';
import { runReport } from '../../scripts/lxx/report';
import { keyOf } from '../../scripts/lxx/swete';
import { checkKnown, coverageOf, crunchForms, offeredRight, verdictOf } from '../../scripts/lxx/morpheus-check';
import type { TagntRow } from '../../scripts/lxx/tagnt';

const FIXTURES = 'tests/fixtures/lxx';
const tagnt = [readFileSync(join(FIXTURES, 'tagnt-slice.tsv'), 'utf8')];
const tbesg = readFileSync(join(FIXTURES, 'tbesg-slice.txt'), 'utf8');
function swete(file: string): DeriveInput {
  const [versification, words] = readFileSync(join(FIXTURES, file), 'utf8').split('\n\n');
  return { versification, words, tagnt, tbesg };
}
const GEN_1 = swete('swete-gen-1.csv');
const PSA_22 = swete('swete-psa-22.csv');

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-morpheus-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const nfc = (s: string): string => s.normalize('NFC');

/** The sample file: Greek form -> the <NL> segments, with ⇥ read as a tab. */
const SAMPLE = new Map(
  readFileSync(join(FIXTURES, 'morpheus-sample.tsv'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l): [string, string] => {
      const [form, segments = ''] = l.split('\t');
      return [toBeta(nfc(form))!, segments.replaceAll('⇥', '\t')];
    }),
);
const SEVEN = ['Γενηθήτωσαν', 'ζωσῶν', 'ἐξέθρεψεν', 'αὐταί', 'ἐλίπανας', 'καταδιώξεται', 'μακρότητα'];

/** Morpheus as the sample file has it: for each beta-code line, the line and the segments (none for a form the file does not give). */
function fakeEngine(calls: string[][] = []): MorpheusEngine {
  return {
    unavailable: () => undefined,
    crunch(forms) {
      calls.push([...forms]);
      // the real cruncher prints a form it does not know on standard error only: no echo line
      return forms.map((f) => (SAMPLE.get(f) ? `${f}\n${SAMPLE.get(f)}\n` : '')).join('');
    },
  };
}

describe('beta code, the letters Morpheus reads and writes', () => {
  it('writes Greek as Perseus beta code: breathing, then accent, then iota subscript, a capital after a star', () => {
    expect(toBeta('ἐξέθρεψεν')).toBe('e)ce/qreyen');
    expect(toBeta('Γενηθήτωσαν')).toBe('*genhqh/twsan');
    expect(toBeta('Ἀρταξέρξης')).toBe('*)artace/rchs');
    expect(toBeta('τῷ')).toBe('tw=|');
    expect(toBeta('ἅγιος')).toBe('a(/gios');
    expect(toBeta('Ἄβελ')).toBe('*)/abel');
  });

  it('reads beta code back as NFC Greek with a final sigma, dropping the marks of quantity and a homograph number', () => {
    expect(fromBeta('gi/gnomai')).toBe(nfc('γίγνομαι'));
    expect(fromBeta('a)/nqrwpos')).toBe(nfc('ἄνθρωπος'));
    expect(fromBeta('*da_rei_/ou')).toBe(nfc('Δαρείου'));
    expect(fromBeta('pa/reimi1')).toBe(nfc('πάρειμι'));
    expect(fromBeta('tw=|')).toBe(nfc('τῷ'));
    expect(fromBeta('*)abraa/m')).toBe(nfc('Ἀβραάμ'));
  });

  it('round-trips a word, whatever its accent', () => {
    for (const w of ['λόγος', 'ἐξέθρεψεν', 'ᾠδή', 'Ἰησοῦς', 'ὑπάρχω', 'μακρότης']) expect(fromBeta(toBeta(nfc(w))!)).toBe(nfc(w));
  });

  it('keys a form as the look-up does (an enclitic’s second accent dropped, grave read as acute), keeping a capital that begins a word with lower case', () => {
    expect(morpheusKey('ἐξέθρεψέν')).toBe(nfc('ἐξέθρεψεν'));
    expect(morpheusKey('Γενηθήτωσαν')).toBe(nfc('Γενηθήτωσαν'));
    expect(morpheusKey('ΕΝ')).toBe('εν');
    expect(morpheusKey('[τοῖ]ς')).toBe(keyOf('τοῖς'));
  });
});

describe('the output of Morpheus (cruncher -S), as its own test/fixture.json shows it', () => {
  it('reads an echo line and the <NL> segments after it, one entry for each form it echoes', () => {
    const out = '*darei/ou\n<NL>N *da_rei_/ou,*darei=os  masc gen sg\t\t\tos_ou</NL>\nne/os\n<NL>N ne/os  masc nom comp sg\t\t\tos_h_on</NL><NL>N ne/os  masc nom comp sg\tattic\t\tos_on</NL>\n';
    const entries = parseCruncher(out);
    expect(entries.map((e) => [e.input, e.raws.length])).toEqual([
      ['*darei/ou', 1],
      ['ne/os', 2],
    ]);
    expect(entries[0].raws[0]).toEqual({ pos: 'N', lemma: '*darei=os', features: 'masc gen sg', dialects: '', flags: '', classes: 'os_ou' });
    expect(entries[1].raws[1].dialects).toBe('attic');
  });

  it('a form the real image does not know has no echo line (it is said on standard error): with the inputs it is an entry with no readings, where it was asked', () => {
    const out = '*darei/ou\n<NL>N *da_rei_/ou,*darei=os  masc gen sg\t\t\tos_ou</NL>\nne/os\n<NL>N ne/os  masc nom comp sg\t\t\tos_h_on</NL>\n';
    const entries = parseCruncher(out, ['zws~n', '*darei/ou', 'lingua', 'ne/os', 'xyz']);
    expect(entries.map((e) => [e.input, e.raws.length])).toEqual([
      ['zws~n', 0],
      ['*darei/ou', 1],
      ['lingua', 0],
      ['ne/os', 1],
      ['xyz', 0],
    ]);
    expect(parseCruncher('', ['a', 'b']).map((e) => e.raws.length)).toEqual([0, 0]);
  });

  it('splits a segment into its part of speech, last lemma, features, dialects, flags and classes', () => {
    expect(parseAnalysis('N kai/,kai/ \t\tindeclform\tconj')).toEqual({ pos: 'N', lemma: 'kai/', features: '', dialects: '', flags: 'indeclform', classes: 'conj' });
    expect(parseAnalysis('V a)sqene/w  imperf ind act 3rd sg\tattic epic ionic\tcontr\tew_pr,ew_denom')).toEqual({
      pos: 'V',
      lemma: 'a)sqene/w',
      features: 'imperf ind act 3rd sg',
      dialects: 'attic epic ionic',
      flags: 'contr',
      classes: 'ew_pr,ew_denom',
    });
    expect(parseAnalysis('not an analysis')).toBeUndefined();
  });

  it('refuses output that echoes a form it was not given, or in another order', () => {
    expect(() => parseCruncher('a\nb\n', ['a'])).toThrow(/answered 'b' where it was not asked/);
    expect(() => parseCruncher('a\n', ['b'])).toThrow(/answered 'a' where it was not asked/);
    expect(() => parseCruncher('b\na\n', ['a', 'b'])).toThrow(/out of order/);
  });
});

describe('the mapping to TAGNT’s codes: one reading to one code, or unmapped', () => {
  const codes = (segment: string): string[] | 'unmapped' => {
    const raw = parseAnalysis(segment.replaceAll('⇥', '\t'))!;
    const mapped = mapAnalysis(raw);
    return mapped ? mapped.map((m) => `${m.lemma}/${m.code}`) : 'unmapped';
  };

  it('verb, finite: tense, voice and mood letters, person and number', () => {
    expect(codes('V bio/w  pres imperat act 2nd sg⇥⇥contr⇥ow_pr,ow_denom')).toEqual(['βιόω/V-PAM-2S']);
    expect(codes('V a)sqene/w  imperf ind act 3rd sg⇥attic epic ionic⇥contr⇥ew_pr,ew_denom')).toEqual(['ἀσθενέω/V-IAI-3S']);
    expect(codes('V gi/gnomai  pres ind mp 3rd pl⇥⇥pres_redupl⇥w_stem,reg_conj')).toEqual(['γίγνομαι/V-PNI-3P']);
    expect(codes('V bou/lomai  fut subj mid 1st sg⇥⇥⇥w_stem,nw')).toEqual(['βούλομαι/V-FMS-1S', 'βούλομαι/V-FDS-1S']);
    expect(codes('V lu/w  pres opt act 3rd pl⇥⇥⇥w_stem')).toEqual(['λύω/V-PAO-3P']);
  });

  it('verb, aorist: first or second by the ending table, passive by aor_pass; with no table that says, unmapped', () => {
    expect(codes('V e)ktre/fw  aor ind act 3rd sg⇥⇥⇥w_stem,aor1')).toEqual(['ἐκτρέφω/V-AAI-3S']);
    expect(codes('V ba/llw  aor ind act 3rd sg⇥⇥⇥w_stem,aor2')).toEqual(['βάλλω/V-2AAI-3S']);
    expect(codes('V genhqh/twsan,gi/gnomai  aor imperat pass 3rd pl⇥attic⇥⇥aor_pass,e_stem')).toEqual(['γίγνομαι/V-APM-3P', 'γίγνομαι/V-AOM-3P']);
    expect(codes('V fai/nw  aor ind pass 3rd sg⇥⇥⇥w_stem,aor2_pass')).toEqual(['φαίνω/V-2API-3S']);
    expect(codes('V i)a_/swntai,i)a/omai  aor subj mp 3rd pl⇥attic⇥⇥aor1,aw_denom')).toEqual(['ἰάομαι/V-ADS-3P', 'ἰάομαι/V-AOS-3P']);
    expect(codes('V pari/hmi  aor inf act⇥⇥⇥ath_secondary')).toBe('unmapped');
  });

  it('verb, infinitive: no person or number', () => {
    expect(codes('V teleuta/w  pres inf act⇥attic⇥contr⇥aw_pr,aw_denom')).toEqual(['τελευτάω/V-PAN']);
    expect(codes('V e)ktre/fw  aor inf mid⇥⇥⇥w_stem,aor1')).toEqual(['ἐκτρέφω/V-AMN']);
  });

  it('participle: voice, then gender, case and number', () => {
    expect(codes('P za/w  pres part act fem gen pl⇥⇥contr⇥aw_pr')).toEqual(['ζάω/V-PAP-GPF']);
    expect(codes('P lu/w  aor part pass neut nom/voc/acc pl⇥⇥⇥aor_pass')).toEqual(['λύω/V-APP-NPN', 'λύω/V-APP-VPN', 'λύω/V-APP-APN']);
  });

  it('noun: N, then case, number and gender; a list of genders or cases is one code each', () => {
    expect(codes('N makro/ths  fem acc sg⇥⇥⇥hs_htos')).toEqual(['μακρότης/N-ASF']);
    expect(codes('N *da_rei_/ou,*darei=os  masc gen sg⇥⇥⇥os_ou')).toEqual(['Δαρεῖος/N-GSM']);
    expect(codes('N do/ru  neut dat sg⇥⇥indeclform⇥irreg_decl3')).toEqual(['δόρυ/N-DSN']);
    expect(codes('N ku/wn  masc/fem gen pl⇥⇥indeclform⇥irreg_decl3')).toEqual(['κύων/N-GPM', 'κύων/N-GPF']);
    expect(codes('N pa=s  masc acc sg⇥⇥indeclform⇥irreg_adj3')).toEqual(['πᾶς/A-ASM']);
    expect(codes('N *)iwa/ ⇥⇥indeclform⇥exclam')).toBe('unmapped');
    expect(codes('N lo/gos  masc nom/voc sg⇥⇥⇥os_ou')).toEqual(['λόγος/N-NSM', 'λόγος/N-VSM']);
    expect(codes('N dw=ron  neut nom/voc/acc pl⇥⇥⇥os_ou')).toEqual(['δῶρον/N-NPN', 'δῶρον/N-VPN', 'δῶρον/N-APN']);
  });

  it('adjective: A, by an adjective’s ending table', () => {
    expect(codes('N a)mfo/teros  masc/neut gen sg⇥⇥⇥os_h_on')).toEqual(['ἀμφότερος/A-GSM', 'ἀμφότερος/A-GSN']);
    expect(codes('N a)lhqh/s  fem acc sg⇥⇥⇥hs_es')).toEqual(['ἀληθής/A-ASF']);
  });

  it('indeclinable words: a conjunction, a particle, an adverb, a preposition, from the class after indeclform', () => {
    expect(codes('N kai/,kai/ ⇥⇥indeclform⇥conj')).toEqual(['καί/CONJ']);
    expect(codes('N me/n,me/n ⇥⇥indeclform⇥particle')).toEqual(['μέν/PRT', 'μέν/CONJ']);
    expect(codes('N tw/,tw=| ⇥⇥indeclform⇥adverb')).toEqual(['τῷ/ADV']);
    expect(codes('N e)n ⇥⇥indeclform⇥prep')).toEqual(['ἐν/PREP']);
    expect(codes('N du/o ⇥⇥indeclform⇥numeral')).toBe('unmapped');
  });

  it('the article: T, by case, number and gender', () => {
    expect(codes('N o(  masc/neut gen sg⇥⇥indeclform⇥article')).toEqual(['ὁ/T-GSM', 'ὁ/T-GSN']);
  });

  it('leaves unmapped what TAGNT has no code for or the mapping cannot tell: the dual, a comparative, a dialect without Attic, an unaugmented form, a pronoun, a pluperfect', () => {
    expect(codes('N a)mfo/teros  masc/neut nom/voc/acc dual⇥⇥⇥os_h_on')).toBe('unmapped');
    expect(codes('N ne/os  masc nom comp sg⇥⇥⇥os_h_on')).toBe('unmapped');
    expect(codes('N a)mfo/teros  masc/neut gen sg⇥doric aeolic⇥⇥os_h_on')).toBe('unmapped');
    expect(codes('V teleuta/w  imperf ind act 3rd pl⇥epic doric aeolic⇥unaugmented⇥ath_primary,aw_denom')).toBe('unmapped');
    expect(codes('V bio/w  imperf ind mp 2nd sg⇥attic epic doric⇥contr unaugmented⇥w_stem')).toBe('unmapped');
    expect(codes('N au)to/s  fem nom pl⇥⇥indeclform⇥demonstr')).toBe('unmapped');
    expect(codes('V lu/w  plup ind act 3rd sg⇥attic epic⇥contr⇥perf_act,reg_conj')).toBe('unmapped');
    expect(codes('V lu/w  pres ind act 3rd dual⇥⇥⇥w_stem')).toBe('unmapped');
    expect(codes('E *ku=ros,Cyrus  masc nom sg⇥⇥⇥os_ou')).toBe('unmapped');
  });

  it('voice: mp is told by the lemma: a deponent’s present is N, its aorist and future D and O; any other verb’s mp is P or M (TAGNT’s E is not offered)', () => {
    expect(codes('V korei=tai,kore/w  pres ind mp 3rd sg⇥attic epic⇥contr⇥ew_pr,ew_denom')).toEqual(['κορέω/V-PPI-3S', 'κορέω/V-PMI-3S']);
    expect(codes('V a)fhge/omai  pres ind mp 3rd sg⇥attic epic doric aeolic⇥contr⇥ew_pr,ew_denom')).toEqual(['ἀφηγέομαι/V-PNI-3S']);
    expect(codes('V e)piske/ptomai  aor ind mp 3rd pl⇥⇥⇥aor2_pass,ptw')).toEqual(['ἐπισκέπτομαι/V-2ADI-3P', 'ἐπισκέπτομαι/V-2AOI-3P']);
    expect(codes('V de/omai  fut ind mp 2nd sg⇥⇥⇥reg_fut,ew_denom')).toEqual(['δέομαι/V-FDI-2S', 'δέομαι/V-FOI-2S']);
    expect(voicesOf('mid', 'A', 'βούλομαι')).toEqual(['M', 'D']);
    expect(voicesOf('mid', 'A', 'λύω')).toEqual(['M']);
    expect(voicesOf('pass', 'P', 'λύω')).toEqual(['P']);
    expect(voicesOf('pass', 'P', 'λέγομαι')).toEqual(['P']);
    expect(voicesOf('act', 'P', 'λύω')).toEqual(['A']);
  });

  it('a pronoun declined as an adjective (αὐτός, art_adj) is not a candidate: TAGNT writes it P, so an A would be false', () => {
    expect(codes('N au)to/s  fem nom/voc pl⇥⇥⇥art_adj')).toBe('unmapped');
    expect(codes('N h(/mos  masc/neut gen pl⇥⇥⇥os_h_on')).toBe('unmapped');
    expect(unmappedWhy(parseAnalysis('N au)to/s  fem nom/voc pl\t\t\tart_adj')!)).toBe('a pronoun');
    expect(codes('N a)/llos  masc nom sg⇥⇥⇥os_h_on')).toEqual(['ἄλλος/A-NSM']);
  });

  it('a noun’s nu_movable and a_priv flags change nothing and map; a superlative’s irreg_superl does not', () => {
    expect(codes('N pri/wn1  masc dat pl⇥⇥nu_movable⇥wn_onos')).toEqual(['πρίων/N-DPM']);
    expect(codes('N a)/nombros  masc/fem acc sg⇥⇥a_priv⇥os_on')).toEqual(['ἄνομβρος/A-ASM', 'ἄνομβρος/A-ASF']);
    expect(codes('N kalo/s  fem gen pl⇥⇥irreg_superl⇥os_h_on')).toBe('unmapped');
    expect(codes('N migh/s  masc/fem/neut dat pl⇥attic epic⇥contr nu_movable poetic⇥hs_es')).toEqual(['μιγής/A-DPM', 'μιγής/A-DPF', 'μιγής/A-DPN']);
    expect(codes('N *)oni/as  masc acc sg⇥⇥poetic⇥hs_ou')).toEqual(['Ὀνίας/N-ASM']);
  });

  it('says why a reading is left out, in the words the coverage count groups them by', () => {
    const why = (segment: string): string | undefined => unmappedWhy(parseAnalysis(segment.replaceAll('⇥', '\t'))!);
    expect(why('V lu/w  futperf ind mp 3rd sg⇥⇥⇥perfp_vow')).toBe('future perfect');
    expect(why('V lu/w  perf ind act 3rd sg⇥⇥⇥perf_act')).toBeUndefined();
    expect(why('V e)pakou/w  plup ind act 3rd pl⇥attic epic doric aeolic⇥attic_redupl⇥perf_act')).toBe('pluperfect');
    expect(why('N da/ra  fem nom/voc/acc dual⇥⇥⇥a_hs')).toBe('the dual');
    expect(why('N du/o ⇥⇥indeclform⇥numeral')).toBe('a numeral');
    expect(why('V kate/dw  pres imperat act 2nd sg⇥epic⇥⇥w_stem')).toBe('a dialect without Attic');
    expect(why('V qale/w  imperf ind act 2nd sg⇥epic ionic⇥unaugmented⇥ew_pr,ew_denom')).toBe('a dialect without Attic');
    expect(why('V bio/w  imperf ind mp 2nd sg⇥attic epic doric⇥contr unaugmented⇥w_stem')).toBe('an unaugmented form');
    expect(why('V pari/hmi  aor inf act⇥⇥⇥ath_secondary')).toBe('an aorist whose table does not say first or second');
    expect(why('N ne/os  masc nom comp sg⇥⇥⇥os_h_on')).toBe('a comparative or superlative');
    expect(why('N megalopreph/s  adverbial⇥attic epic doric⇥contr⇥hs_es')).toBe('an adverb made from an adjective');
    expect(why('N lo/gos  masc nom sg⇥⇥⇥os_ou')).toBeUndefined();
  });

  it('a form: its mapped readings once each in a fixed order, and how many it could not map', () => {
    const entry = parseCruncher('x\n<NL>N lo/gos  masc nom sg\t\t\tos_ou</NL><NL>N lo/gos  masc nom sg\t\t\tos_ou</NL><NL>N lo/gos  masc nom sg\tdoric\t\tos_ou</NL><NL>E lo/gos,word  masc nom sg\t\t\tos_ou</NL>\n')[0];
    expect(formOf(entry)).toEqual({ analyses: [{ lemma: 'λόγος', code: 'N-NSM' }], unmapped: 1 });
  });

  it('the cache is a two-column file: the form, then lemma/code readings joined by | and one "unmapped" for each reading left out; it reads back as it was written', () => {
    const cache = new Map([
      [nfc('ἐξέθρεψεν'), { analyses: [{ lemma: nfc('ἐκτρέφω'), code: 'V-AAI-3S' }], unmapped: 0 }],
      [nfc('καταδιώξεται'), { analyses: [{ lemma: nfc('καταδιώκω'), code: 'V-FMI-3S' }], unmapped: 1 }],
      [nfc('ζωσῶν'), { analyses: [], unmapped: 0 }],
    ]);
    const text = cacheText(cache);
    expect(text.split('\n')[0]).toBe('form\tanalyses');
    expect(text.split('\n')[1]).toBe(`# mapping ${MAPPING_VERSION}`);
    expect(text).toContain('καταδιώξεται\tκαταδιώκω/V-FMI-3S | unmapped\n');
    expect(text.endsWith('\n')).toBe(true);
    expect(parseCache(text)).toEqual(cache);
    expect(cacheText(parseCache(text))).toBe(text);
  });
});

describe('derive.ts with the cache of the sample file (the seven forms with no candidate)', () => {
  const forms = (result: BookResult): string[] => result.pending.filter((w) => w.candidates.length === 0).map((w) => keyOf(result.words.find((x) => x.ref === w.ref)!.form));

  it('has no candidate for the seven forms without Morpheus (the guard for the rest)', async () => {
    const gen = await runDerive(['--book', 'gen'], { input: GEN_1, outDir: tmp() });
    const psa = await runDerive(['--book', 'psa'], { input: PSA_22, outDir: tmp() });
    expect([...forms(gen), ...forms(psa)].map(nfc).sort()).toEqual(SEVEN.map((f) => keyOf(f)).map(nfc).sort());
  });

  async function withMorpheus(book: 'gen' | 'psa'): Promise<{ result: BookResult; outDir: string; log: string[] }> {
    const outDir = tmp();
    const log: string[] = [];
    const result = await runDerive(['--book', book], { input: book === 'gen' ? GEN_1 : PSA_22, outDir, log: (l) => log.push(l), morpheus: fakeEngine() });
    return { result, outDir, log };
  }
  const wordOf = (result: BookResult, form: string) => {
    const word = result.words.find((w) => nfc(keyOf(w.form)) === nfc(keyOf(form)))!;
    return [...result.derived, ...result.pending].find((w) => w.ref === word.ref)!;
  };
  const pairs = (w: { candidates: readonly { lemma: string; morph: string }[] }): string[] => w.candidates.map((c) => `${c.lemma}/${c.morph}`);

  it('gives a word candidates where the sample gives analyses mapped to TAGNT codes, support “morpheus”', async () => {
    const { result: psa, outDir } = await withMorpheus('psa');
    expect(pairs(wordOf(psa, 'ἐξέθρεψεν'))).toEqual([nfc('ἐκτρέφω/V-AAI-3S')]);
    expect(pairs(wordOf(psa, 'καταδιώξεται'))).toEqual([nfc('καταδιώκω/V-FMI-3S')]);
    expect(pairs(wordOf(psa, 'μακρότητα'))).toEqual([nfc('μακρότης/N-ASF')]);
    const { result: gen } = await withMorpheus('gen');
    expect(pairs(wordOf(gen, 'Γενηθήτωσαν'))).toEqual([nfc('γίγνομαι/V-AOM-3P'), nfc('γίγνομαι/V-APM-3P')]);
    const pending = readFileSync(join(outDir, 'pending', 'psa.tsv'), 'utf8');
    expect(pending).toMatch(/ἐκτρέφω\/V-AAI-3S\/morpheus\t/);
    expect(wordOf(psa, 'ἐξέθρεψεν').notes).toContain('morpheus: candidates from the second method, for the model');
  });

  it('leaves “no candidate” where the image does not know the form (ἐλίπανας) or gives only a reading the mapping leaves out (αὐταί, a pronoun)', async () => {
    const { result: gen } = await withMorpheus('gen');
    const { result: psa } = await withMorpheus('psa');
    expect(wordOf(psa, 'ἐλίπανας').candidates).toEqual([]);
    expect(wordOf(psa, 'αὐταί').candidates).toEqual([]);
    expect(pairs(wordOf(gen, 'ζωσῶν'))).toEqual([nfc('ζάω/V-PAP-GPF')]);
    expect([...forms(gen), ...forms(psa)].map(nfc).sort()).toEqual([nfc('ἐλίπανας'), nfc('αὐταί')].sort());
  });

  it('settles nothing by itself: a word given candidates is still waiting for a choice', async () => {
    const { result: psa } = await withMorpheus('psa');
    expect(psa.pending.map((w) => w.ref)).toContain(psa.words.find((w) => nfc(keyOf(w.form)) === nfc('ἐξέθρεψεν'))!.ref);
  });

  it('writes data/lxx/morpheus/<book>.tsv, asks Morpheus only for the forms with no candidate, and asks again for none once they are cached', async () => {
    const calls: string[][] = [];
    const outDir = tmp();
    await runDerive(['--book', 'psa'], { input: PSA_22, outDir, morpheus: fakeEngine(calls) });
    expect(calls).toHaveLength(1);
    expect(calls[0].map(fromBeta).map(nfc).sort()).toEqual(['αὐταί', 'ἐλίπανας', 'ἐξέθρεψεν', 'καταδιώξεται', 'μακρότητα'].map(nfc).sort());
    const file = join(outDir, 'morpheus', 'psa.tsv');
    expect(readFileSync(file, 'utf8')).toContain('ἐξέθρεψεν\tἐκτρέφω/V-AAI-3S\n');
    expect(readFileSync(file, 'utf8')).toContain('αὐταί\tunmapped\n');
    expect(readFileSync(file, 'utf8')).toContain('ἐλίπανας\t\n');
    await runDerive(['--book', 'psa'], { input: PSA_22, outDir, morpheus: fakeEngine(calls) });
    expect(calls).toHaveLength(1);
  });

  it('also asks about the guesses in the choices files, and --no-morpheus leaves the step off', async () => {
    const calls: string[][] = [];
    const outDir = tmp();
    const base = await runDerive(['--book', 'gen'], { input: GEN_1, outDir: tmp() });
    const ref = base.pending.find((w) => w.candidates.length > 0)!.ref;
    mkdirSync(join(outDir, 'choices'), { recursive: true });
    const guessed = base.words.find((w) => w.ref === ref)!.form;
    writeFileSync(join(outDir, 'choices', 'gen-01.tsv'), `ref\tparsing\tlemma\tmark\n${ref}\tN-NSM\tx\tguess\n`);
    await runDerive(['--book', 'gen'], { input: GEN_1, outDir, morpheus: fakeEngine(calls) });
    expect(calls[0].map(fromBeta).map(nfc)).toContain(nfc(morpheusKey(guessed)));
    const off = tmp();
    await runDerive(['--book', 'gen', '--no-morpheus'], { input: GEN_1, outDir: off, morpheus: fakeEngine(calls) });
    expect(calls).toHaveLength(1);
    expect(existsSync(join(off, 'morpheus'))).toBe(false);
  });
});

describe('derive.ts with no Docker', () => {
  const files = (dir: string): Record<string, string> =>
    Object.fromEntries(['derived', 'pending'].flatMap((d) => readdirSync(join(dir, d)).map((f) => [`${d}/${f}`, readFileSync(join(dir, d, f), 'utf8')] as const)));

  it('prints one “Morpheus skipped:” line and writes the same bytes as a run with the step off', async () => {
    const empty = tmp();
    const was = process.env.PATH;
    process.env.PATH = empty;
    try {
      expect(dockerEngine().unavailable()).toMatch(/docker/i);
      const offDir = tmp();
      const offLog: string[] = [];
      await runDerive(['--book', 'psa'], { input: PSA_22, outDir: offDir, log: (l) => offLog.push(l) });
      const onDir = tmp();
      const onLog: string[] = [];
      await runDerive(['--book', 'psa'], { input: PSA_22, outDir: onDir, log: (l) => onLog.push(l), morpheus: dockerEngine() });
      const skipped = onLog.filter((l) => l.startsWith('Morpheus skipped: '));
      expect(skipped).toHaveLength(1);
      expect(onLog.filter((l) => !l.startsWith('Morpheus skipped: ')).map((l) => l.replaceAll(onDir, 'OUT'))).toEqual(offLog.map((l) => l.replaceAll(offDir, 'OUT')));
      expect(files(onDir)).toEqual(files(offDir));
      expect(existsSync(join(onDir, 'morpheus'))).toBe(false);
    } finally {
      process.env.PATH = was;
    }
  });

  it('says it once for a whole run of books, and names how to get the image', () => {
    const log: string[] = [];
    const engine: MorpheusEngine = { unavailable: () => 'the image lampas-morpheus is not here', crunch: () => '' };
    const state = { said: false };
    const dir = tmp();
    for (const book of ['a', 'b']) ensureCache(engine, join(dir, `${book}.tsv`), ['λόγος'], (l) => log.push(l), state);
    expect(log).toEqual(['Morpheus skipped: the image lampas-morpheus is not here']);
    expect(MORPHEUS.build).toContain(MORPHEUS.commit);
  });
});

describe('the guesses against Morpheus: agreed, disagreed, unknown', () => {
  /** The Ps 22 fixture's five words with no candidate, each guessed: two the sample agrees with, one it does not (καταδιώξεται, guessed as a passive), two it cannot say (ἐλίπανας, which Morpheus does not know, and αὐταί, a pronoun it does not map). */
  const GUESSES = [
    ['ἐξέθρεψεν', 'V-AAI-3S', 'ἐκτρέφω'],
    ['ἐλίπανας', 'V-AAI-3S', 'λιπαίνω'],
    ['αὐταί', 'P-NPF', 'αὐτός'],
    ['καταδιώξεται', 'V-FPI-3S', 'καταδιώκω'],
    ['μακρότητα', 'N-ASF', 'μακρότης'],
  ] as const;

  async function setup(): Promise<{ outDir: string; choicesDir: string; input: DeriveInput }> {
    const outDir = tmp();
    const choicesDir = tmp();
    const base = await runDerive(['--book', 'psa'], { input: PSA_22, outDir: tmp() });
    const refOf = (form: string): string => base.words.find((w) => nfc(keyOf(w.form)) === nfc(form))!.ref;
    writeFileSync(join(choicesDir, 'psa-01.tsv'), ['ref\tparsing\tlemma\tmark', ...GUESSES.map(([f, p, l]) => `${refOf(f)}\t${p}\t${nfc(l)}\tguess`)].join('\n') + '\n');
    await runDerive(['--book', 'psa'], { input: PSA_22, outDir, morpheus: fakeEngine(), choicesDir });
    return { outDir, choicesDir, input: PSA_22 };
  }

  it('counts agreed, disagreed and unknown over the guesses of a choices file (release.ts)', async () => {
    const { outDir, choicesDir, input } = await setup();
    const log: string[] = [];
    const error = await runRelease(['--book', 'psa'], { input, outDir, choicesDir, log: (l) => log.push(l), known: () => [] }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(log.some((l) => l.includes('Morpheus: 2 agreed, 1 disagreed, 2 unknown'))).toBe(true);
  });

  it('counts a guess Morpheus agreed with by lemma and parsing, a mapped reading none of which fits as disagreed, and no mapped reading as unknown', () => {
    const cache = parseCache(
      ['form\tanalyses', `${nfc('ἔθηκεν')}\t${nfc('τίθημι')}/V-AAI-3S | ${nfc('τίθημι')}/V-2AAI-3S`, `${nfc('ἔστη')}\t${nfc('ἵστημι')}/V-2AAI-3S`, `${nfc('ζωσῶν')}\tunmapped`].join('\n') + '\n',
    );
    const row = (form: string, lemma: string, morph: string) => ({ form, lemma: nfc(lemma), morph });
    const counts = morpheusCounts(
      [row('ἔθηκεν', 'τίθημι', 'V-2AAI-3S'), row('ἔστη', 'ἵστημι', 'V-AAI-3S'), row('ἔστη', 'ἵστημι', 'V-2AAI-3S'), row('ζωσῶν', 'ζάω', 'V-PAP-GPF'), row('ἄλλο', 'ἄλλος', 'A-NSN')],
      cache,
    );
    expect(counts).toEqual({ agreed: 2, disagreed: 1, unknown: 2 });
    const lemmaOnly = morpheusCounts([row('ἔθηκεν', 'ἄλλο', 'V-AAI-3S')], cache);
    expect(lemmaOnly).toEqual({ agreed: 0, disagreed: 1, unknown: 0 });
  });

  it('lxx:report prints the three numbers for the book, and a dash for a book with no cache', async () => {
    const { outDir, choicesDir, input } = await setup();
    const doc = join(tmp(), 'lxx-report.md');
    const out = await runReport(['--build', '55'], { input, doc, choicesDir, recheckDir: tmp(), morpheusDir: join(outDir, 'morpheus'), known: () => [], books: [['Psa', 'Psalms']] });
    expect(out.rows[0].morpheus).toEqual({ agreed: 2, disagreed: 1, unknown: 2 });
    expect(readFileSync(doc, 'utf8')).toContain('Morpheus agreed / differed / unknown');
    expect(readFileSync(doc, 'utf8')).toMatch(/\| Psalms \(Psa\) \|.*\| 2 \/ 1 \/ 2 \|/);
    const none = await runReport(['--build', '55'], { input, doc: join(tmp(), 'r.md'), choicesDir, recheckDir: tmp(), morpheusDir: tmp(), known: () => [], books: [['Psa', 'Psalms']] });
    expect(none.rows[0].morpheus).toBeUndefined();
    expect(none.text).toMatch(/\| Psalms \(Psa\) \|.*\| — \| /);
    expect(readChoices(readFileSync(join(choicesDir, 'psa-01.tsv'), 'utf8')).size).toBe(5);
  });
});

describe('the known-answer check and the coverage count (morpheus-check.ts) on the sample file', () => {
  const entries = crunchForms(fakeEngine(), SEVEN.map((f) => morpheusKey(f)));
  const row = (form: string, lemma: string, morph: string): TagntRow => ({ book: 'Psa', chapter: 22, verse: 1, word: 1, editions: 'NKO', form, lemma: nfc(lemma), morph, name: false });
  const entryOf = (form: string) => entries.get(nfc(morpheusKey(form)));

  it('asks each form once and answers an unknown form with an entry with no readings', () => {
    expect([...entries.keys()].sort()).toEqual(SEVEN.map((f) => nfc(morpheusKey(f))).sort());
    expect(entryOf('ἐλίπανας')!.raws).toEqual([]);
    expect(entryOf('ἐξέθρεψεν')!.raws).toHaveLength(1);
  });

  it('puts a word against its entry: a hit (lemma by its letters, and the parsing), a lemma with another parsing, another lemma, nothing mapped, nothing known', () => {
    expect(verdictOf(row('ἐξέθρεψεν', 'ἐκτρέφω', 'V-AAI-3S'), entryOf('ἐξέθρεψεν')).outcome).toBe('hit');
    expect(verdictOf(row('ἐξέθρεψεν', 'ἐκτρεφω', 'V-AAI-3S'), entryOf('ἐξέθρεψεν')).outcome).toBe('hit');
    expect(verdictOf(row('ἐξέθρεψεν', 'ἐκτρέφω', 'V-AAI-3P'), entryOf('ἐξέθρεψεν')).outcome).toBe('wrong parsing');
    expect(verdictOf(row('ἐξέθρεψεν', 'τρέφω', 'V-AAI-3S'), entryOf('ἐξέθρεψεν')).outcome).toBe('wrong lemma');
    expect(verdictOf(row('αὐταί', 'αὐτός', 'P-NPF'), entryOf('αὐταί')).outcome).toBe('not mapped');
    expect(verdictOf(row('ἐλίπανας', 'λιπαίνω', 'V-AAI-2S'), entryOf('ἐλίπανας')).outcome).toBe('unknown');
    expect(verdictOf(row('x', 'x', 'N-NSM'), undefined).outcome).toBe('unknown');
  });

  it('counts a chapter: outcomes, what was offered and right by TAGNT’s kind of word, and the misses with their readings', () => {
    const rows = [row('ἐξέθρεψεν', 'ἐκτρέφω', 'V-AAI-3S'), row('μακρότητα', 'μακρότης', 'N-ASF'), row('μακρότητα', 'μακρότης', 'N-DSF'), row('αὐταί', 'αὐτός', 'P-NPF'), row('ἐλίπανας', 'λιπαίνω', 'V-AAI-2S')];
    const c = checkKnown('Psa.22', rows, entries);
    expect(c.outcomes).toEqual({ hit: 2, 'wrong parsing': 1, 'wrong lemma': 0, 'not mapped': 1, unknown: 1 });
    expect(offeredRight(c)).toEqual({ offered: 3, hits: 2 });
    expect(c.byKind.get('N')).toEqual({ words: 2, hits: 1, offered: 2 });
    expect(c.misses).toEqual([{ form: 'μακρότητα', tagnt: nfc('μακρότης/N-DSF'), readings: [nfc('μακρότης/N-ASF')], outcome: 'wrong parsing' }]);
  });

  it('counts the coverage: forms asked and known, readings and how many mapped, the rest by reason, and the forms none of whose readings mapped', () => {
    const c = coverageOf(entries.values());
    expect(c).toMatchObject({ asked: 7, known: 6, readings: 8, mapped: 5, formsMapped: 5, formsLost: 1 });
    expect([...c.unmapped]).toEqual(expect.arrayContaining([['a dialect without Attic', 2], ['a pronoun', 1]]));
    expect(c.lost.get('a pronoun')).toBe(1);
  });
});

describe('where the step is written down', () => {
  const read = (f: string): string => readFileSync(f, 'utf8');
  it('names Morpheus, its commit, the licence and what reaches the data in the derivation doc, the data README and the credits', () => {
    for (const file of ['docs/lxx-derivation.md', 'data/lxx/README.md', 'ATTRIBUTION.md']) {
      const text = read(file);
      expect(text, file).toContain('Morpheus');
      expect(text, file).toContain(MORPHEUS.commit);
      expect(text, file).toContain('MPL-2.0');
    }
    expect(read('docs/lxx-derivation.md')).toMatch(/never its code/);
    expect(read('ATTRIBUTION.md')).toMatch(/build tool/);
    expect(read('.gitignore')).toContain('data/lxx/morpheus');
  });
});

describe('Morpheus’s perfects, and Morpheus asked about a form with one thin candidate (mw-u2w5klk.32)', () => {
  // Morpheus's output as the real image printed it (story mw-u2w5klk.32, the Laptop, `docker run … bin/cruncher -S` on ἐξῆρται, Συντετέλεσται, λέλυκα, γέγονεν, κέκληται, πέπτωκε)
  const segment = (s: string) => parseAnalysis(s.replaceAll('⇥', '\t'))!;
  const codesOf = (s: string, form?: string): string[] | 'unmapped' => mapAnalysis(segment(s), form)?.map((m) => `${m.lemma}/${m.code}`) ?? 'unmapped';
  const EXAIRO = 'V e)cai/rw  perf ind mp 3rd sg⇥⇥⇥perfp_r,airw';
  const LELYKA = 'V lu/w  perf ind act 1st sg⇥⇥⇥perf_act,reg_conj';
  const GEGONEN = 'V gi/gnomai  perf ind act 3rd sg⇥⇥nu_movable⇥perf_act';

  it('maps a perfect: TAGNT’s R, with the voice letters of a middle or passive; ἐξῆρται (Nah 2:1) is ἐξαίρω V-RPI-3S', () => {
    expect(codesOf(EXAIRO, 'ἐξῆρται')).toEqual([nfc('ἐξαίρω/V-RPI-3S'), nfc('ἐξαίρω/V-RMI-3S')]);
    expect(codesOf('P lu/w  perf part mp masc nom sg⇥⇥⇥perfp_vow,reg_conj')).toEqual([nfc('λύω/V-RPP-NSM'), nfc('λύω/V-RMP-NSM')]);
    expect(codesOf('V lu/w  perf inf mp⇥⇥⇥perfp_vow,reg_conj')).toEqual([nfc('λύω/V-RPN'), nfc('λύω/V-RMN')]);
    expect(codesOf('V pi/ptw  perf imperat act 2nd sg⇥⇥⇥perf_act,o_stem', 'πέπτωκε')).toEqual([nfc('πίπτω/V-RAM-2S')]);
  });

  it('tells a first perfect from a second by the form: with a κ before its ending it is R, without one R and 2R (Morpheus’s perf_act holds both)', () => {
    expect(codesOf(LELYKA, 'λέλυκα')).toEqual([nfc('λύω/V-RAI-1S')]);
    expect(codesOf(GEGONEN, 'γέγονεν')).toEqual([nfc('γίγνομαι/V-RAI-3S'), nfc('γίγνομαι/V-2RAI-3S')]);
    expect(codesOf(GEGONEN)).toEqual([nfc('γίγνομαι/V-RAI-3S'), nfc('γίγνομαι/V-2RAI-3S')]);
    expect(codesOf('P a)kou/w  perf part act masc nom sg⇥⇥⇥perf_act', 'ἀκηκοώς')).toEqual([nfc('ἀκούω/V-RAP-NSM'), nfc('ἀκούω/V-2RAP-NSM')]);
    // a middle or passive perfect is R only: TAGNT's second perfect passive is six words
    expect(codesOf('V gra/fw  perf ind mp 3rd sg⇥⇥⇥perfp_f', 'γέγραπται')).toEqual([nfc('γράφω/V-RPI-3S'), nfc('γράφω/V-RMI-3S')]);
  });

  it('gives a deponent’s perfect mp TAGNT’s N or P, not the D and O of its aorist and future', () => {
    expect(voicesOf('mp', 'R', 'δέχομαι')).toEqual(['N', 'P']);
    expect(voicesOf('mp', 'R', 'λύω')).toEqual(['P', 'M']);
    expect(voicesOf('act', 'R', 'λύω')).toEqual(['A']);
    expect(voicesOf('mp', 'A', 'δέχομαι')).toEqual(['D', 'O']);
    expect(codesOf('V de/xomai  perf ind mp 3rd sg⇥⇥⇥perfp_c', 'δέδεκται')).toEqual([nfc('δέχομαι/V-RNI-3S'), nfc('δέχομαι/V-RPI-3S')]);
  });

  it('still leaves out a pluperfect and a future perfect, and a perfect in a dialect without Attic or unaugmented', () => {
    expect(codesOf('V lu/w  plup ind act 3rd sg⇥attic epic⇥contr⇥perf_act,reg_conj')).toBe('unmapped');
    expect(codesOf('V lu/w  futperf ind mp 3rd sg⇥⇥⇥perfp_vow')).toBe('unmapped');
    expect(codesOf('V gi/gnomai  perf ind act 3rd pl⇥epic doric aeolic⇥unaugmented⇥perf_act')).toBe('unmapped');
    expect(unmappedWhy(segment('V lu/w  plup ind act 3rd sg⇥attic epic⇥contr⇥perf_act,reg_conj'))).toBe('pluperfect');
  });

  it('gives formOf the form it was asked about: λέλυκα is R, γέγονεν R and 2R', () => {
    const entry = (beta: string, seg: string) => parseCruncher(`${beta}\n<NL>${seg.replaceAll('⇥', '\t')}</NL>\n`)[0];
    expect(formOf(entry('le/luka', LELYKA))).toEqual({ analyses: [{ lemma: nfc('λύω'), code: 'V-RAI-1S' }], unmapped: 0 });
    expect(formOf(entry('ge/gonen', GEGONEN)).analyses.map((m) => m.code)).toEqual(['V-2RAI-3S', 'V-RAI-3S']);
  });

  it('keeps a cache made by an older mapping out of the way: a file with no current mapping marker is asked again, whole', () => {
    const dir = tmp();
    const file = join(dir, 'nah.tsv');
    writeFileSync(file, 'form\tanalyses\nἐξῆρται\tunmapped\n');
    const calls: string[][] = [];
    const engine: MorpheusEngine = { unavailable: () => undefined, crunch: (forms) => (calls.push([...forms]), `${forms[0]}\n<NL>${EXAIRO.replaceAll('⇥', '\t')}</NL>\n`) };
    const cache = ensureCache(engine, file, ['ἐξῆρται'], () => {}, { said: false });
    expect(calls).toHaveLength(1);
    expect(cache.get(nfc('ἐξῆρται'))!.analyses.map((m) => m.code)).toEqual(['V-RMI-3S', 'V-RPI-3S']);
    expect(readFileSync(file, 'utf8')).toContain(`# mapping ${MAPPING_VERSION}`);
    ensureCache(engine, file, ['ἐξῆρται'], () => {}, { said: false });
    expect(calls).toHaveLength(1);
    // and with Morpheus out of reach the older cache is still what is read
    const old = join(dir, 'old.tsv');
    writeFileSync(old, 'form\tanalyses\nἐξῆρται\tunmapped\n');
    const off: MorpheusEngine = { unavailable: () => 'no docker', crunch: () => '' };
    expect(ensureCache(off, old, ['ἀλλο'], () => {}, { said: false }).get(nfc('ἐξῆρται'))).toEqual({ analyses: [], unmapped: 1 });
  });

  describe('weighing Morpheus’s readings against the one thin candidate of the rules', () => {
    const rule = (lemma: string, morph: string, extra: Partial<WordCandidate> = {}): WordCandidate => ({ lemma: nfc(lemma), morph, support: 33, share: 1, via: ['a rule'], stemSupport: 0, ...extra });
    const m = (lemma: string, code: string) => ({ lemma: nfc(lemma), code });
    const shown = (cs: readonly WordCandidate[] | undefined) => cs?.map((c) => `${c.lemma} ${c.morph}${c.source ? `/${c.source}` : ''}${c.beside ? '+' : ''}`);

    it('leaves the word as it is when Morpheus does not know the form, gave no reading the mapping covers, or reads what the rule reads', () => {
      const lone = [rule('ἐξαρτάω', 'V-IAI-3S')];
      expect(weighMorpheus(lone, undefined)).toBeUndefined();
      expect(weighMorpheus(lone, { analyses: [], unmapped: 0 })).toBeUndefined();
      expect(weighMorpheus(lone, { analyses: [], unmapped: 2 })).toBeUndefined();
      expect(weighMorpheus(lone, { analyses: [m('ἐξαρτάω', 'V-IAI-3S'), m('ἐξαρτάω', 'V-IMI-3S')], unmapped: 0 })).toBeUndefined();
      // the lemma by its letters, accents off
      expect(weighMorpheus(lone, { analyses: [m('εξαρτάω', 'V-IAI-3S')], unmapped: 1 })).toBeUndefined();
    });

    it('sets the rule’s candidate aside for Morpheus’s readings when Morpheus knows the form whole and shares neither its lemma nor its parsing (ἐξῆρται)', () => {
      const lone = [rule('ἐξαρτάω', 'V-IAI-3S'), rule('ἐξαρτάω', 'V-IAI-3S', { beside: true })];
      const got = weighMorpheus(lone, { analyses: [m('ἐξαίρω', 'V-RMI-3S'), m('ἐξαίρω', 'V-RPI-3S')], unmapped: 0 })!;
      expect(shown(got.candidates)).toEqual(['ἐξαίρω V-RMI-3S/morpheus', 'ἐξαίρω V-RPI-3S/morpheus']);
      expect(got.note).toBe(NOTE_MORPHEUS_OVER);
      expect(got.candidates.every((c) => c.support === 0 && c.share === 0)).toBe(true);
    });

    it('puts Morpheus’s readings beside the rule’s when it left a reading out, or shares the rule’s lemma (a spelling it writes otherwise) or its parsing', () => {
      const lone = [rule('γίνομαι', 'V-AMI-3S')];
      for (const form of [
        { analyses: [m('ἐξαίρω', 'V-RPI-3S')], unmapped: 1 },
        { analyses: [m('γίγνομαι', 'V-AMI-3S')], unmapped: 0 },
        { analyses: [m('γίνομαι', 'V-FMI-3S')], unmapped: 0 },
      ]) {
        const got = weighMorpheus(lone, form)!;
        expect(got.note).toBe(NOTE_MORPHEUS_BESIDE);
        expect(shown(got.candidates)).toEqual(['γίνομαι V-AMI-3S', ...form.analyses.map((a) => `${a.lemma} ${a.code}/morpheus`)]);
      }
    });
  });

  describe('through derive.ts, as the Laptop runs it (Nah 2:1, a perfect the rules read as ἐξαρτάω V-IAI-3S)', () => {
    const row = (ref: string, form: string, strong: string, morph: string, lemma: string): string => `${ref}=NKO\t${form} (x)\tgloss\t${strong}=${morph}\t${lemma}=gloss\tNA28+`;
    // the rule -ι for -ω V-IAI-3S, augment undone, from the imperfects of four verbs in -εω (stems in ε), none in -α: the thin lone candidate ἐξαρτάω has stem support 0
    const rows = [
      row('Mrk.6.20#14', 'ἐποίει', 'G4160', 'V-IAI-3S', 'ποιέω'),
      row('Mrk.2.2#20', 'ἐλάλει', 'G2980', 'V-IAI-3S', 'λαλέω'),
      row('Mrk.12.41#9', 'ἐθεώρει', 'G2334', 'V-IAI-3S', 'θεωρέω'),
      row('Mrk.14.11#9', 'ἐζήτει', 'G2212', 'V-IAI-3S', 'ζητέω'),
      row('Mat.1.1#5', 'τοῦ', 'G3588', 'T-GSM', 'ὁ'),
    ];
    const lexicon = [
      'G5368\tG5368 =\tG5368\tφιλέω\tphileō\tG:V\tto love',
      'G1821\tG1821G =\tG1821G\tἐξαρτάω\texartaō\tG:V\tto hang',
      'G1808\tG1808 =\tG1808\tἐξαίρω\texairō\tG:V\tto remove',
      'G4160\tG4160 =\tG4160\tποιέω\tpoieō\tG:V\tto do',
      'G2980\tG2980 =\tG2980\tλαλέω\tlaleō\tG:V\tto speak',
      'G2334\tG2334 =\tG2334\tθεωρέω\ttheōreō\tG:V\tto watch',
      'G2212\tG2212 =\tG2212\tζητέω\tzēteō\tG:V\tto seek',
      'G3588\tG3588 =\tG3588\tὁ\tho\tG:T\tthe',
    ];
    const verses: Array<[string, string[]]> = [
      ['Nah.2:1', ['ἐξῆρται.']],
      ['Gen.37:4', ['ὁ', 'πατὴρ', 'ἐφίλει']],
    ];
    const starts: string[] = [];
    const lines: string[] = [];
    for (const [verse, ws] of verses) {
      starts.push(`${lines.length + 1}\t${verse}`);
      for (const w of ws) lines.push(`${lines.length + 1}\t${w}`);
    }
    const input: DeriveInput = { versification: starts.join('\n'), words: lines.join('\n'), tagnt: [rows.join('\n')], tbesg: lexicon.join('\n') };
    // what the image printed for it (the same bytes, captured): cruncher echoes the form, then its segments
    const engine = (calls: string[][] = []): MorpheusEngine => ({
      unavailable: () => undefined,
      crunch(forms) {
        calls.push([...forms]);
        return forms.map((f) => (f === toBeta('ἐξῆρται') ? `${f}\n<NL>${EXAIRO.replaceAll('⇥', '\t')}</NL>\n` : '')).join('');
      },
    });
    const wordOf = (result: BookResult, display: string) => {
      const w = result.words.find((x) => nfc(x.display) === nfc(display))!;
      return [...result.derived, ...result.pending].find((x) => x.ref === w.ref)!;
    };

    it('is pending on ἐξαρτάω V-IAI-3S, the thin lone candidate, with Morpheus off (the guard)', async () => {
      const off = await runDerive(['--book', 'nah', '--no-morpheus'], { input, outDir: tmp(), morpheus: engine() });
      const w = wordOf(off, 'ἐξῆρται.');
      expect(isDerived(w)).toBe(false);
      expect(w.candidates.map((c) => `${c.lemma} ${c.morph}`)).toEqual([nfc('ἐξαρτάω V-IAI-3S')]);
      expect(w.notes).toContain(NOTE_THIN);
      const gen = await runDerive(['--book', 'gen', '--no-morpheus'], { input, outDir: tmp() });
      expect(isDerived(wordOf(gen, 'ἐφίλει'))).toBe(true);
    });

    it('asks Morpheus about ἐξῆρται and reads it ἐξαίρω V-RPI-3S, never ἐξαρτάω; a word the rules settled is not asked', async () => {
      const calls: string[][] = [];
      const outDir = tmp();
      const result = await runDerive(['--book', 'nah'], { input, outDir, morpheus: engine(calls) });
      expect(calls).toHaveLength(1);
      expect(calls[0].map(fromBeta).map(nfc)).toEqual([nfc('ἐξῆρται')]);
      const w = wordOf(result, 'ἐξῆρται.');
      expect(isDerived(w)).toBe(false);
      expect(w.candidates.map((c) => `${c.lemma} ${c.morph}`)).toEqual([nfc('ἐξαίρω V-RMI-3S'), nfc('ἐξαίρω V-RPI-3S')]);
      expect(w.candidates.every((c) => c.source === 'morpheus')).toBe(true);
      expect(w.notes).toContain(NOTE_MORPHEUS_OVER);
      expect(w.notes).not.toContain(NOTE_THIN);
      expect(w.notes).not.toContain(NOTE_BESIDE);
      expect(readFileSync(join(outDir, 'pending', 'nah.tsv'), 'utf8')).toMatch(/ἐξαίρω\/V-RPI-3S\/morpheus/);
      expect(readFileSync(join(outDir, 'pending', 'nah.tsv'), 'utf8')).not.toMatch(/ἐξαρτάω/);
      // ἐφίλει is settled by the rules, with a stem support of 4 (Gen 37:4): nothing of it is asked
      const gen = await runDerive(['--book', 'gen'], { input, outDir, morpheus: engine(calls) });
      expect(isDerived(wordOf(gen, 'ἐφίλει'))).toBe(true);
      expect(calls.flat().map(fromBeta).map(nfc)).not.toContain(nfc('ἐφίλει'));
      // cached: the next run of Nahum asks nothing
      const asked = calls.length;
      await runDerive(['--book', 'nah'], { input, outDir, morpheus: engine(calls) });
      expect(calls).toHaveLength(asked);
    });

    it('counts the words that took Morpheus’s readings, the thin lone ones with the rest', async () => {
      const log: string[] = [];
      await runDerive(['--book', 'nah'], { input, outDir: tmp(), morpheus: engine(), log: (l) => log.push(l) });
      expect(log).toContain('Morpheus gave 1 words candidates');
    });
  });
});
