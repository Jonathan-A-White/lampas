// A tap on a Greek word opens its paradigm (mw-irpgqi.1): paradigmOfWord names the table of a word and the one cell that is the word's own,
// and the Paradigms address carries the cell, the word and its parse.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { PARADIGMS, cellName, paradigmById, paradigmOfWord, tableFor } from '../../src/data/paradigms';
import { paradigmHash, paradigmOf } from '../../src/nav/route';

const jn2 = JSON.parse(readFileSync('public/data/2jn/1.json', 'utf8')) as Chapter;
const words = jn2.verses.flatMap((v) => v.g);
const first = (form: string, code?: string): GreekWord => {
  const word = words.find((w) => w.t === form && (code === undefined || w.p === code));
  if (!word) throw new Error(`2 John 1 has no ${form}`);
  return word;
};

/** The form in the cell the word's address names. */
function formAt(tableId: string, place: string | undefined): string | undefined {
  const table = paradigmById(tableId)!;
  return table.rows.flatMap((row) => row.cells.map((cell, c) => ({ place: cellName(table, row, c), cell }))).find((x) => x.place === place)?.cell.form;
}

describe('paradigmOfWord', () => {
  it('opens Contract verbs on the cell of ἀγαπῶ (V-PAI-1S, ἀγαπάω)', () => {
    const word = first('ἀγαπῶ');
    expect(word.p).toBe('V-PAI-1S');
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe('contract-verbs');
    expect(found?.table.name).toBe('Contract verbs');
    expect(formAt('contract-verbs', found?.cell)).toBe('ἀγαπῶ');
    expect(found?.cell).toContain('1st person singular');
  });

  it('opens the table tableFor picks for a word whose own form is in no table, with the cell of its parse', () => {
    const word = first('ἐρωτῶ');
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe(tableFor(word.p, word)?.id);
    expect(found?.table.id).toBe('verb-endings');
    expect(found?.cell).toContain('1st singular');
    expect(found?.cell).toContain('Present');
    expect(found?.cell).toContain('Active');
  });

  it('opens εἰμί on the Greek cell of an εἰμί form', () => {
    const word = first('ἔσται');
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe('eimi');
    expect(formAt('eimi', found?.cell)).toBe('ἔσται');
    const present = paradigmOfWord(first('ἐστὶν'));
    expect(present?.table.id).toBe('eimi');
    expect(formAt('eimi', present?.cell)).toBe('ἐστί(ν)');
  });

  it('opens the article on the cell of its case, number and gender', () => {
    const word = first('τῶν');
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe('article');
    expect(found?.cell).toBe('Genitive Plural Neuter');
    expect(formAt('article', found?.cell)).toBe('τῶν');
  });

  it('opens Noun endings on the ending a noun has, and the third declension on the full form', () => {
    const noun = paradigmOfWord(first('ἀληθείᾳ'));
    expect(noun?.table.id).toBe('noun-endings');
    expect(noun?.cell).toContain('Dative');
    expect(noun?.cell).toContain('First declension, feminine in α');
    expect(formAt('noun-endings', noun?.cell)).toBe('-ᾳ');
    const third = paradigmOfWord(first('πατρός'));
    expect(third?.table.id).toBe('third-declension');
    expect(formAt('third-declension', third?.cell)).toBe('πατρός');
  });

  it('names the table of every word tableFor has a table for, and lights a cell that has the word’s own case, number and person', () => {
    for (const word of words) {
      const found = paradigmOfWord(word);
      if (found === undefined) continue;
      const table = tableFor(word.p, word);
      expect(table, `${word.t} ${word.p}`).toBeDefined();
      if (found.cell !== undefined) expect(formAt(found.table.id, found.cell), `${word.t} ${word.p}`).toBeDefined();
    }
    // the words this chapter has in the tables it holds
    const lit = words.filter((w) => paradigmOfWord(w)?.cell !== undefined);
    expect(lit.length).toBeGreaterThan(40);
  });

  it('is none for an indeclinable word: a conjunction, a particle, an adverb, a preposition', () => {
    for (const code of ['CONJ', 'PRT-N', 'ADV', 'PREP']) {
      const word = words.find((w) => w.p === code);
      expect(word, code).toBeDefined();
      expect(paradigmOfWord(word!), `${word!.t} ${code}`).toBeUndefined();
    }
  });

  it('lights no cell, but still names the table, for a form the table does not hold', () => {
    const word = { t: 'πεπωρωμένε', l: 'πωρόω', p: 'V-RPP-VSM' }; // a vocative participle; the table holds four cases, not the vocative
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe('participle');
    expect(found?.cell).toBeUndefined();
  });

  it('lights the accusative participle of 2 John 1 in the participle table (mw-5r3p30.1003)', () => {
    const found = paradigmOfWord(first('μένουσαν'));
    expect(found?.table.id).toBe('participle');
    expect(found?.cell).toBe('Present active Accusative singular Feminine');
    expect(formAt('participle', found?.cell)).toBe('λύουσαν');
  });

  it('every cell it names is a cell of its table, and every table it names is in the list', () => {
    for (const word of words) {
      const found = paradigmOfWord(word);
      if (!found) continue;
      expect(PARADIGMS).toContain(found.table);
    }
  });
});

// mw-5r3p30.996: a table is only named for a word it is a table of. The article shares a word's case, number and gender, and no more, with a possessive pronoun.
describe('paradigmOfWord for a pronoun no table holds', () => {
  const pronoun = (t: string, l: string, p: string): { t: string; l: string; p: string } => ({ t, l, p });

  it('names no table for ἡμετέρα, a possessive pronoun, rather than The article', () => {
    expect(paradigmOfWord(pronoun('ἡμετέρα', 'ἡμέτερος', 'S-1PNSF'))).toBeUndefined();
    expect(paradigmOfWord(pronoun('ἐμὸν', 'ἐμός', 'S-1SASN'))).toBeUndefined();
  });

  it('names no table for a reciprocal, a correlative or a correlative interrogative pronoun, whose case, number and gender the article also has', () => {
    expect(paradigmOfWord(pronoun('ἀλλήλους', 'ἀλλήλων', 'C-APM'))).toBeUndefined();
    expect(paradigmOfWord(pronoun('οἷος', 'οἷος', 'K-NSM'))).toBeUndefined();
    expect(paradigmOfWord(pronoun('ὅσον', 'ὅσος', 'K-ASM'))).toBeUndefined();
    expect(paradigmOfWord(pronoun('ποῖος', 'ποῖος', 'Q-NSM'))).toBeUndefined();
  });

  it('still names The article for the article, and not for a reflexive pronoun', () => {
    expect(paradigmOfWord(first('τῶν'))?.table.id).toBe('article');
    expect(paradigmOfWord(pronoun('ἑαυτοῦ', 'ἑαυτοῦ', 'F-3GSM'))?.table.id).not.toBe('article');
    expect(paradigmOfWord(pronoun('ἐμαυτοῦ', 'ἐμαυτοῦ', 'F-1GSM'))?.table.id).not.toBe('article');
  });

  it('never names The article for a word that is not the article (the words of 2 John 1)', () => {
    for (const word of words) if (word.p.split('-')[0] !== 'T') expect(paradigmOfWord(word)?.table.id).not.toBe('article');
  });
});

describe('the Paradigms address of a word', () => {
  it('carries the cell, the word and its parse, and reads them back', () => {
    const hash = paradigmHash({ table: 'contract-verbs', cell: 'ἀγαπάω “I love” 1st person singular Present Active', word: 'ἀγαπῶ', parse: 'V-PAI-1S' });
    expect(hash.startsWith('#/paradigms?t=contract-verbs&')).toBe(true);
    expect(paradigmOf(hash)).toEqual({ table: 'contract-verbs', cell: 'ἀγαπάω “I love” 1st person singular Present Active', word: 'ἀγαπῶ', parse: 'V-PAI-1S' });
  });

  it('is the same address as before when there is no cell', () => {
    expect(paradigmHash({ table: 'article', mode: 'learn' })).toBe('#/paradigms?t=article&mode=learn');
    expect(paradigmOf('#/paradigms?t=article&cell=x')).toEqual({ table: 'article', cell: 'x' });
  });

  it('drops a cell, a word or a parse named with no table', () => {
    expect(paradigmOf('#/paradigms?cell=x&w=y&p=V-PAI-1S')).toEqual({});
  });
});

// mw-5r3p30.1003: a form opens its table on a cell of its own whenever the table is meant to hold it.
describe('paradigmOfWord for the forms .996 left on a table with no cell', () => {
  const at = (t: string, l: string, p: string): { table: string | undefined; cell: string | undefined; form: string | undefined } => {
    const found = paradigmOfWord({ t, l, p });
    return { table: found?.table.id, cell: found?.cell, form: found?.cell ? formAt(found.table.id, found.cell) : undefined };
  };

  it('sends an infinitive to The infinitive, on its own cell: a deponent one on the middle or passive', () => {
    expect(at('δύνασθαι', 'δύναμαι', 'V-PNN')).toEqual({ table: 'infinitive', cell: 'Present Middle', form: 'λύεσθαι' });
    expect(at('ἀπογράφεσθαι', 'ἀπογράφω', 'V-PEN').table).toBe('infinitive');
    expect(at('ἀπογράφεσθαι', 'ἀπογράφω', 'V-PEN').cell).toBeDefined();
    expect(at('ἀναστήσειν', 'ἀνίστημι', 'V-FAN')).toEqual({ table: 'infinitive', cell: 'Future Active', form: 'λύσειν' });
    expect(at('εἰσελεύσεσθαι', 'εἰσέρχομαι', 'V-FDN')).toEqual({ table: 'infinitive', cell: 'Future Middle', form: 'λύσεσθαι' });
  });

  it('gives the vocative a cell in Noun endings, The third declension and Adjective endings', () => {
    expect(at('κύριε', 'κύριος', 'N-VSM')).toEqual({ table: 'noun-endings', cell: 'Second declension, masculine (λόγος) Vocative Singular', form: '-ε' });
    expect(at('ἀδελφοί', 'ἀδελφός', 'N-VPM')).toMatchObject({ table: 'noun-endings', cell: 'Second declension, masculine (λόγος) Vocative Plural', form: '-οι' });
    expect(at('γύναι', 'γυνή', 'N-VSF').cell).toBeDefined();
    expect(at('πάτερ', 'πατήρ', 'N-VSM')).toMatchObject({ table: 'third-declension', form: 'πάτερ' });
    expect(at('ἀγαθέ', 'ἀγαθός', 'A-VSM')).toEqual({ table: 'adjective-endings', cell: 'ἀγαθός -ή -όν Vocative Singular Masculine', form: 'ἀγαθέ' });
    expect(at('ὀλιγόπιστοι', 'ὀλιγόπιστος', 'A-VPM').table).toBe('adjective-endings');
    expect(at('ὀλιγόπιστοι', 'ὀλιγόπιστος', 'A-VPM').cell).toBeDefined();
  });

  it('lays the participle in every case and number, and the aorist middle and the perfect middle or passive', () => {
    expect(at('λέγοντες', 'λέγω', 'V-PAP-NPM')).toEqual({ table: 'participle', cell: 'Present active Nominative plural Masculine', form: 'λύοντες' });
    expect(at('ἰδόντες', 'ὁράω', 'V-2AAP-NPM')).toMatchObject({ table: 'participle', cell: 'Aorist active Nominative plural Masculine' });
    expect(at('ἀπεκρίθη', 'ἀποκρίνομαι', 'V-ADI-3S').table).not.toBe('participle');
    expect(at('ἐνδεδυμένον', 'ἐνδύω', 'V-RMP-ASM')).toMatchObject({ table: 'participle', cell: 'Perfect middle or passive Accusative singular Masculine', form: 'λελυμένον' });
    expect(at('ἀρξαμένου', 'ἄρχω', 'V-AMP-GSM')).toMatchObject({ table: 'participle', cell: 'Aorist middle Genitive singular Masculine', form: 'λυσαμένου' });
    expect(at('δοθέντα', 'δίδωμι', 'V-APP-APN')).toMatchObject({ table: 'participle', cell: 'Aorist passive Accusative plural Neuter', form: 'λυθέντα' });
  });

  it('leaves no infinitive, vocative noun or adjective, or participle of the table’s tenses on a table with no cell, in the chapters it reads', () => {
    const kinds = /^(V-2?[PAR][AMPDNEO]N|[NA]-V[SP][MFN]|V-2?[PAR][AMPDNEO]P-[NGDA][SP][MFN])/;
    const missing: string[] = [];
    for (const [book, chapter] of [['mat', 5], ['mrk', 1], ['jhn', 1], ['act', 2], ['rom', 8], ['heb', 11], ['rev', 1]] as const) {
      const ch = JSON.parse(readFileSync(`public/data/${book}/${chapter}.json`, 'utf8')) as Chapter;
      for (const word of ch.verses.flatMap((v) => v.g)) {
        const found = paradigmOfWord(word);
        if (kinds.test(word.p) && found && !found.cell) missing.push(`${book} ${chapter} ${word.t} ${word.p} -> ${found.table.id}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

// mw-5r3p30.1031: a cell that names two genders ('Masc. or fem.') is the cell of a masculine word and of a feminine one.
describe('paradigmOfWord for the interrogative and indefinite pronouns', () => {
  const at = (t: string, l: string, p: string): { table: string | undefined; cell: string | undefined; form: string | undefined } => {
    const found = paradigmOfWord({ t, l, p });
    return { table: found?.table.id, cell: found?.cell, form: found?.cell ? formAt(found.table.id, found.cell) : undefined };
  };

  it('lights τίς (I-NSM) and a feminine and a neuter form of the table on their own cell', () => {
    expect(at('τίς', 'τίς', 'I-NSM')).toMatchObject({ table: 'pronouns-interrogative-indefinite', form: 'τίς' });
    expect(at('τίς', 'τίς', 'I-NSM').cell).toContain('Nominative');
    expect(at('τίς', 'τίς', 'I-NSM').cell).toContain('Masc. or fem.');
    expect(at('τίνα', 'τίς', 'I-ASF')).toMatchObject({ table: 'pronouns-interrogative-indefinite', form: 'τίνα' });
    expect(at('τίνα', 'τίς', 'I-ASF').cell).toContain('Masc. or fem.');
    expect(at('τίνα', 'τίς', 'I-APN')).toMatchObject({ table: 'pronouns-interrogative-indefinite', form: 'τίνα' });
    expect(at('τίνα', 'τίς', 'I-APN').cell).toContain('Neuter');
    expect(at('τί', 'τίς', 'I-NSN').cell).toContain('Neuter');
    expect(at('τινές', 'τις', 'X-NPM')).toMatchObject({ table: 'pronouns-interrogative-indefinite', form: 'τινές' });
    expect(at('τινάς', 'τις', 'X-APF')).toMatchObject({ table: 'pronouns-interrogative-indefinite', form: 'τινάς' });
    expect(at('τινάς', 'τις', 'X-APF').cell).toContain('Masc. or fem.');
  });

  it('keeps the interrogative and the indefinite apart, and the cell to the word’s case and number', () => {
    const interrogative = at('τίς', 'τίς', 'I-NSM').cell;
    const indefinite = at('τις', 'τις', 'X-NSM').cell;
    expect(interrogative).not.toBe(indefinite);
    expect(at('τινός', 'τις', 'X-GSM').cell).toContain('Genitive');
    expect(at('τινῶν', 'τις', 'X-GPF').cell).toContain('Plural');
  });

  it('does not land a word on a cell whose genders are not its own', () => {
    // a neuter word is not on 'Masc. or fem.', nor a masculine or feminine word on 'Neuter'
    expect((at('τί', 'τίς', 'I-NSN').cell ?? '')).not.toContain('Masc. or fem.');
    expect((at('τίς', 'τίς', 'I-NSM').cell ?? '')).not.toContain('Neuter');
    expect((at('τίς', 'τίς', 'I-NSF').cell ?? '')).not.toContain('Neuter');
    // and a word of a case the cell does not name still lands on no cell
    expect(at('τίς', 'τίς', 'I-VSM').cell).toBeUndefined();
  });

  it('opens the table with no cell for ποῖος and δεῖνα, whose forms it does not hold', () => {
    expect(at('ποία', 'ποῖος', 'I-NSF')).toEqual({ table: 'pronouns-interrogative-indefinite', cell: undefined, form: undefined });
    expect(at('ποῖον', 'ποῖος', 'I-ASN').cell).toBeUndefined();
    expect(at('δεῖνα', 'δεῖνα', 'X-ASM').cell).toBeUndefined();
  });
});
