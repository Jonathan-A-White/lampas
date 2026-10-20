import { describe, expect, it } from 'vitest';
import { ideaOf, LADDER, TIERS } from '../../src/data/grammar/ladder';
import { availableCount, availableText, cellName, cellsOf, isAvailable, missingIdeas, paradigmById, PARADIGMS } from '../../src/data/paradigms';

import { needsOf, needsText } from '../../src/data/paradigms/needs';

const IDEA_IDS = new Set(LADDER.map((idea) => idea.id));
const COUNTS: Record<string, number> = {
  article: 24,
  'noun-endings': 40,
  eimi: 70,
  'verb-endings': 24,
  'third-declension': 48,
  'adjective-endings': 48,
  'pronouns-personal': 40,
  'pronouns-demonstrative-relative': 48,
  'pronouns-interrogative-indefinite': 32,
  'future-and-aorist': 24,
  'aorist-and-future-passive': 12,
  'perfect-and-pluperfect': 18,
  'second-aorist': 12,
  'contract-verbs': 18,
  'mi-verbs': 36,
  oida: 12,
  subjunctive: 30,
  imperative: 20,
  infinitive: 9,
  participle: 30,
};

describe('the paradigm tables', () => {
  it('are twenty, each with its stated number of cells', () => {
    expect(PARADIGMS.map((p) => p.id)).toEqual([
      'article',
      'noun-endings',
      'eimi',
      'verb-endings',
      'third-declension',
      'adjective-endings',
      'pronouns-personal',
      'pronouns-demonstrative-relative',
      'pronouns-interrogative-indefinite',
      'future-and-aorist',
      'aorist-and-future-passive',
      'perfect-and-pluperfect',
      'second-aorist',
      'contract-verbs',
      'mi-verbs',
      'oida',
      'subjunctive',
      'imperative',
      'infinitive',
      'participle',
    ]);
    for (const table of PARADIGMS) expect(cellsOf(table), table.id).toHaveLength(COUNTS[table.id]);
  });

  it('have a cell under every column of every row, and no id twice', () => {
    expect(new Set(PARADIGMS.map((p) => p.id)).size).toBe(PARADIGMS.length);
    for (const table of PARADIGMS) for (const row of table.rows) expect(row.cells, `${table.id} ${row.label}`).toHaveLength(table.columns.length);
  });

  it('write every Greek form in NFC, and nothing empty', () => {
    for (const table of PARADIGMS)
      for (const cell of cellsOf(table)) {
        expect(cell.form.length, table.id).toBeGreaterThan(0);
        if (cell.lang === 'el') expect(cell.form, `${table.id} ${cell.form}`).toBe(cell.form.normalize('NFC'));
        if (cell.lang === 'el') expect(cell.form, `${table.id} ${cell.form}`).toMatch(/^[-\p{Script=Greek}()]+$/u);
      }
  });

  it('name only ideas that the grammar ladder has, and at least one each', () => {
    for (const table of PARADIGMS)
      for (const cell of cellsOf(table)) {
        expect(cell.ideas.length, `${table.id} ${cell.form}`).toBeGreaterThan(0);
        for (const id of cell.ideas) expect(IDEA_IDS.has(id), `${table.id} ${cell.form}: ${id}`).toBe(true);
      }
  });

  it('say which ideas each table teaches, all of them in the ladder, and which tier it belongs to', () => {
    for (const table of PARADIGMS) {
      expect(table.ideas.length, table.id).toBeGreaterThan(0);
      for (const id of table.ideas) expect(IDEA_IDS.has(id), `${table.id}: ${id}`).toBe(true);
      expect(TIERS, table.id).toContain(table.tier);
    }
  });

  it('give the new tables the ideas of the forms they hold', () => {
    const ideas = (id: string) => paradigmById(id)?.ideas;
    expect(ideas('third-declension')).toEqual(['declension-3']);
    expect(ideas('adjective-endings')).toEqual(['adjective']);
    expect(ideas('pronouns-personal')).toEqual(['pronoun-personal']);
    expect(ideas('pronouns-demonstrative-relative')).toEqual(['pronoun-demonstrative', 'pronoun-relative']);
    expect(ideas('pronouns-interrogative-indefinite')).toEqual(['pronoun-interrogative', 'pronoun-indefinite']);
  });

  it('give no two cells of a table the same place', () => {
    for (const table of PARADIGMS) {
      const places = table.rows.flatMap((row) => row.cells.map((_, c) => cellName(table, row, c)));
      expect(new Set(places).size, table.id).toBe(places.length);
    }
  });
});

describe('what his grammar levels unlock', () => {
  const article = paradigmById('article');
  if (!article) throw new Error('no article');
  const levels = (entries: Record<string, 'solid' | 'frontier' | 'notYet'>) => new Map(Object.entries(entries).map(([id, level]) => [id, { level }]));
  const GENITIVE_FEMININE = article.rows[1].cells[1];

  it('treat an idea with no level as not yet, so every cell is locked', () => {
    expect(availableCount(article, levels({}))).toEqual({ available: 0, total: 24 });
  });

  it('open a form once every idea it needs is at the frontier or solid, and not before', () => {
    const base = { article: 'solid', 'case-genitive': 'frontier', 'gender-feminine': 'solid' } as const;
    expect(isAvailable(GENITIVE_FEMININE, levels(base))).toBe(false);
    expect(missingIdeas(GENITIVE_FEMININE, levels(base))).toEqual(['number-singular']);
    expect(isAvailable(GENITIVE_FEMININE, levels({ ...base, 'number-singular': 'notYet' }))).toBe(false);
    expect(isAvailable(GENITIVE_FEMININE, levels({ ...base, 'number-singular': 'frontier' }))).toBe(true);
  });

  it('count the cells of a fixed set of levels, and say it as Available forms: N of M', () => {
    // the article, the genitive and dative, the masculine and feminine, the singular: 2 cases x 2 genders x 1 number
    const some = levels({
      article: 'solid',
      'case-genitive': 'solid',
      'case-dative': 'frontier',
      'gender-masculine': 'solid',
      'gender-feminine': 'frontier',
      'number-singular': 'solid',
      'case-accusative': 'notYet',
    });
    expect(availableCount(article, some)).toEqual({ available: 4, total: 24 });
    expect(availableText(availableCount(article, some))).toBe('Available forms: 4 of 24');
  });
});

describe('the third declension, the adjectives and the pronouns', () => {
  const formAt = (tableId: string, group: RegExp, row: string, column: number): string => {
    const table = paradigmById(tableId);
    if (!table) throw new Error(`no ${tableId}`);
    const found = table.rows.find((r) => r.label === row && r.group && group.test(r.group));
    if (!found) throw new Error(`no row ${row} for ${group} in ${tableId}`);
    return found.cells[column].form;
  };

  it('write the stem change out in full: σάρξ makes σαρκός and πατήρ makes πατρός in the genitive singular', () => {
    expect(formAt('third-declension', /σάρξ/, 'Genitive', 0)).toBe('σαρκός');
    expect(formAt('third-declension', /πατήρ/, 'Genitive', 0)).toBe('πατρός');
    expect(formAt('third-declension', /πνεῦμα/, 'Genitive', 0)).toBe('πνεύματος');
    expect(formAt('third-declension', /βασιλεύς/, 'Accusative', 1)).toBe('βασιλεῖς');
  });

  it('hold six nouns of four cases and two numbers, every cell naming the third declension, the noun, the case, number and gender', () => {
    const table = paradigmById('third-declension');
    if (!table) throw new Error('no third-declension');
    expect(new Set(table.rows.map((r) => r.group)).size).toBe(6);
    for (const cell of cellsOf(table)) {
      expect(cell.ideas, cell.form).toEqual(expect.arrayContaining(['noun', 'declension-3']));
      expect(cell.ideas.filter((id) => id.startsWith('case-')), cell.form).toHaveLength(1);
      expect(cell.ideas.filter((id) => id.startsWith('number-')), cell.form).toHaveLength(1);
      expect(cell.ideas.filter((id) => id.startsWith('gender-')), cell.form).toHaveLength(1);
    }
  });

  it('name the declension of each column of an adjective: ἀγαθός is 2-1-2 and πᾶς is 3-1-3', () => {
    const table = paradigmById('adjective-endings');
    if (!table) throw new Error('no adjective-endings');
    const declensionOf = (group: RegExp, column: number) =>
      table.rows.find((r) => r.group && group.test(r.group))?.cells[column].ideas.filter((id) => id.startsWith('declension-'));
    expect([0, 1, 2].map((c) => declensionOf(/ἀγαθός/, c))).toEqual([['declension-2'], ['declension-1'], ['declension-2']]);
    expect([0, 1, 2].map((c) => declensionOf(/πᾶς/, c))).toEqual([['declension-3'], ['declension-1'], ['declension-3']]);
    for (const cell of cellsOf(table)) expect(cell.ideas, cell.form).toContain('adjective');
  });

  it('give the personal pronouns their person, and αὐτός its gender', () => {
    const table = paradigmById('pronouns-personal');
    if (!table) throw new Error('no pronouns-personal');
    expect(formAt('pronouns-personal', /ἐγώ/, 'Nominative', 0)).toBe('ἐγώ');
    expect(formAt('pronouns-personal', /σύ/, 'Nominative', 1)).toBe('ὑμεῖς');
    expect(formAt('pronouns-personal', /αὐτός/, 'Genitive', 0)).toBe('αὐτοῦ');
    for (const cell of cellsOf(table)) {
      expect(cell.ideas, cell.form).toContain('pronoun-personal');
      expect(cell.ideas.filter((id) => id.startsWith('person-')), cell.form).toHaveLength(1);
    }
    const gendered = table.rows.filter((r) => r.group && /αὐτός/.test(r.group)).flatMap((r) => r.cells);
    expect(gendered).toHaveLength(24);
    for (const cell of gendered) expect(cell.ideas.filter((id) => id.startsWith('gender-')), cell.form).toHaveLength(1);
  });

  it('keep τίς and τις as two sets of cells, told apart by the accent', () => {
    const table = paradigmById('pronouns-interrogative-indefinite');
    if (!table) throw new Error('no pronouns-interrogative-indefinite');
    const who = cellsOf(table).filter((c) => c.ideas.includes('pronoun-interrogative'));
    const some = cellsOf(table).filter((c) => c.ideas.includes('pronoun-indefinite'));
    expect(who).toHaveLength(16);
    expect(some).toHaveLength(16);
    expect(formAt('pronouns-interrogative-indefinite', /τίς/, 'Nominative', 0)).toBe('τίς');
    expect(formAt('pronouns-interrogative-indefinite', /^τις/, 'Nominative', 0)).toBe('τις');
    expect(formAt('pronouns-interrogative-indefinite', /τίς/, 'Genitive', 0)).toBe('τίνος');
    expect(formAt('pronouns-interrogative-indefinite', /^τις/, 'Genitive', 0)).toBe('τινός');
    const places = table.rows.flatMap((row) => row.cells.map((_, c) => cellName(table, row, c)));
    expect(new Set(places).size).toBe(32);
  });

  it('give the demonstrative and the relative 24 cells each, 4 cases x 3 genders x 2 numbers', () => {
    const table = paradigmById('pronouns-demonstrative-relative');
    if (!table) throw new Error('no pronouns-demonstrative-relative');
    expect(cellsOf(table).filter((c) => c.ideas.includes('pronoun-demonstrative'))).toHaveLength(24);
    expect(cellsOf(table).filter((c) => c.ideas.includes('pronoun-relative'))).toHaveLength(24);
    expect(formAt('pronouns-demonstrative-relative', /οὗτος/, 'Nominative', 1)).toBe('αὕτη');
    expect(formAt('pronouns-demonstrative-relative', /ὅς/, 'Dative', 0)).toBe('ᾧ');
  });
});

const PERSONS_ROWS = ['1st person singular', '2nd person singular', '3rd person singular', '1st person plural', '2nd person plural', '3rd person plural'];

describe('the verb tables of the indicative', () => {
  const table = (id: string) => {
    const found = paradigmById(id);
    if (!found) throw new Error(`no ${id}`);
    return found;
  };
  /** The cell at a row and column, found by the column's tense and voice headings and the row's label (and group). */
  const cellAt = (id: string, column: string, row: string, group?: RegExp) => {
    const t = table(id);
    const c = t.columns.findIndex((col) => `${col.group ?? ''} ${col.label}`.trim() === column);
    const r = t.rows.find((x) => x.label === row && (!group || (x.group && group.test(x.group))));
    if (c < 0 || !r) throw new Error(`no ${column} / ${row} in ${id}`);
    return r.cells[c];
  };
  /** The hyphen only marks where the stem or the tense sign ends; the word is what is left. */
  const word = (form: string) => form.replace(/-/g, '');

  it('name the future and aorist tables by the names the list shows', () => {
    expect(PARADIGMS.slice(9, 16).map((p) => p.name)).toEqual([
      'Future and aorist',
      'Aorist and future passive',
      'Perfect and pluperfect',
      'Second aorist',
      'Contract verbs',
      'Verbs in -μι',
      'οἶδα',
    ]);
    for (const p of PARADIGMS.slice(9)) expect(p.tier, p.id).toBe('verbs');
  });

  it('write the passive, perfect and second aorist forms the story asks for', () => {
    expect(word(cellAt('aorist-and-future-passive', 'Aorist Passive', '3rd person singular').form)).toBe('ἐλύθη');
    expect(word(cellAt('aorist-and-future-passive', 'Aorist Passive', '1st person singular').form)).toBe('ἐλύθην');
    expect(word(cellAt('aorist-and-future-passive', 'Future Passive', '1st person singular').form)).toBe('λυθήσομαι');
    expect(word(cellAt('perfect-and-pluperfect', 'Perfect Active', '1st person plural').form)).toBe('λελύκαμεν');
    expect(word(cellAt('perfect-and-pluperfect', 'Perfect Middle or passive', '1st person singular').form)).toBe('λέλυμαι');
    expect(word(cellAt('perfect-and-pluperfect', 'Pluperfect Active', '1st person singular').form)).toBe('ἐλελύκειν');
    expect(word(cellAt('second-aorist', 'Second aorist Active', '3rd person plural').form)).toBe('ἔβαλον');
    expect(word(cellAt('second-aorist', 'Second aorist Middle', '1st person singular').form)).toBe('ἐβαλόμην');
  });

  it('show the tense sign in the future and aorist forms, and the merged vowel in the contract verbs', () => {
    expect(cellAt('future-and-aorist', 'Future Active', '1st person singular').form).toBe('λύσ-ω');
    expect(cellAt('future-and-aorist', 'Aorist Active', '1st person singular').form).toBe('ἔλυσ-α');
    expect(cellAt('contract-verbs', 'Present Active', '3rd person singular', /ἀγαπάω/).form).toBe('ἀγαπᾷ');
    expect(cellAt('contract-verbs', 'Present Active', '1st person plural', /ποιέω/).form).toBe('ποιοῦμεν');
    expect(cellAt('contract-verbs', 'Present Active', '1st person singular', /πληρόω/).form).toBe('πληρῶ');
  });

  it('give the -μι verbs their present and aorist, and οἶδα its perfect form and its past', () => {
    expect(cellAt('mi-verbs', 'Present Active', '3rd person plural', /δίδωμι/).form).toBe('διδόασι(ν)');
    expect(cellAt('mi-verbs', 'Aorist Active', '1st person singular', /τίθημι/).form).toBe('ἔθηκα');
    expect(cellAt('mi-verbs', 'Aorist Active', '3rd person singular', /ἵστημι/).form).toBe('ἔστη');
    expect(cellAt('oida', '', '1st person singular', /οἶδα/).form).toBe('οἶδα');
    expect(cellAt('oida', '', '3rd person plural', /ᾔδειν/).form).toBe('ᾔδεισαν');
  });

  it('head the one column of the οἶδα table with nothing, since its cells are the forms themselves', () => {
    expect(table('oida').columns).toHaveLength(1);
    expect(table('oida').columns[0].label).not.toBe('Greek');
    expect(table('oida').columns[0].label).toBe('');
  });

  it('make every cell of the future and aorist table name its tense signs, and every aorist cell its augment', () => {
    const cells = cellsOf(table('future-and-aorist'));
    for (const cell of cells) expect(cell.ideas, cell.form).toContain('tense-signs');
    const aorist = cells.filter((cell) => cell.ideas.includes('tense-aorist'));
    expect(aorist).toHaveLength(12);
    for (const cell of aorist) expect(cell.ideas, cell.form).toContain('augment');
    expect(cells.filter((cell) => cell.ideas.includes('tense-future'))).toHaveLength(12);
    for (const cell of cells.filter((c) => c.ideas.includes('tense-future'))) expect(cell.ideas, cell.form).not.toContain('augment');
  });

  it('name in every verb cell the verb, a mood, a person and a number, and one tense', () => {
    for (const t of PARADIGMS.slice(9, 16))
      for (const cell of cellsOf(t)) {
        expect(cell.ideas, `${t.id} ${cell.form}`).toEqual(expect.arrayContaining(['verb', 'mood-indicative']));
        expect(cell.ideas.filter((id) => id.startsWith('person-')), `${t.id} ${cell.form}`).toHaveLength(1);
        expect(cell.ideas.filter((id) => id.startsWith('number-')), `${t.id} ${cell.form}`).toHaveLength(1);
        if (t.id !== 'oida') expect(cell.ideas.filter((id) => id.startsWith('tense-') && id !== 'tense-signs'), `${t.id} ${cell.form}`).toHaveLength(1);
      }
  });

  it('give the pluperfect one set of endings, the same in every table that has one', () => {
    // -ειν -εις -ει -ειμεν -ειτε -εισαν: the six persons in the order of the rows; no -εμεν or -ετε beside them
    const ENDINGS = ['ειν', 'εις', 'ει', 'ειμεν', 'ειτε', 'εισαν'];
    let seen = 0;
    for (const t of PARADIGMS)
      for (const row of t.rows) {
        const person = row.cells[0] && ENDINGS[t.rows.filter((r) => r.group === row.group).indexOf(row)];
        row.cells.forEach((cell, c) => {
          if (!cell.ideas.includes('tense-pluperfect')) return;
          seen += 1;
          const ending = word(cell.form).replace(/^.*?(?=ει(?:ν|ς|μεν|τε|σαν)?$)/u, '');
          expect(ENDINGS, `${t.id} ${t.columns[c].group ?? ''} ${row.label}: ${cell.form}`).toContain(ending);
          expect(ending, `${t.id} ${row.label}: ${cell.form}`).toBe(person);
        });
      }
    expect(seen).toBe(12);
  });

  it('write the pluperfect of οἶδα with the endings of the pluperfect of λύω', () => {
    const endingOf = (form: string) => word(form).replace(/^.*?(?=ει(?:ν|ς|μεν|τε|σαν)?$)/u, '');
    for (const person of PERSONS_ROWS)
      expect(endingOf(cellAt('oida', '', person, /ᾔδειν/).form), person).toBe(endingOf(cellAt('perfect-and-pluperfect', 'Pluperfect Active', person).form));
  });

  it('name the idea each of the other tables teaches in its cells', () => {
    const named = (id: string, idea: string) => {
      for (const cell of cellsOf(table(id))) expect(cell.ideas, `${id} ${cell.form}`).toContain(idea);
    };
    named('perfect-and-pluperfect', 'reduplication');
    named('contract-verbs', 'contract-verbs');
    named('mi-verbs', 'mi-verbs');
    named('oida', 'oida');
    named('second-aorist', 'second-tenses');
    named('second-aorist', 'augment');
    named('aorist-and-future-passive', 'voice-passive');
    named('aorist-and-future-passive', 'tense-signs');
    const pluperfect = cellsOf(table('perfect-and-pluperfect')).filter((c) => c.ideas.includes('tense-pluperfect'));
    expect(pluperfect).toHaveLength(6);
    for (const cell of pluperfect) expect(cell.ideas, cell.form).toEqual(expect.arrayContaining(['augment', 'tense-signs']));
    const seconds = cellsOf(table('mi-verbs')).filter((c) => c.ideas.includes('second-tenses'));
    expect(seconds).toHaveLength(6);
    for (const cell of cellsOf(table('mi-verbs')).filter((c) => c.ideas.includes('tense-aorist'))) expect(cell.ideas, cell.form).toContain('augment');
  });
});

describe('the verb tables of the other moods', () => {
  const table = (id: string) => {
    const found = paradigmById(id);
    if (!found) throw new Error(`no ${id}`);
    return found;
  };
  /** The form at a place, as cellName says it ('Aorist passive 3rd person Singular'). */
  const formAt = (id: string, place: string): string => {
    const t = table(id);
    for (const row of t.rows) for (let c = 0; c < row.cells.length; c++) if (cellName(t, row, c) === place) return row.cells[c].form;
    throw new Error(`no ${place} in ${id}`);
  };

  it('are named as the list shows them, in the verbs tier, each teaching its mood', () => {
    expect(PARADIGMS.slice(16).map((p) => [p.name, p.tier, p.ideas])).toEqual([
      ['The subjunctive', 'verbs', ['mood-subjunctive']],
      ['The imperative', 'verbs', ['mood-imperative']],
      ['The infinitive', 'verbs', ['mood-infinitive']],
      ['The participle', 'verbs', ['mood-participle']],
    ]);
  });

  it('write the forms the story asks for', () => {
    expect(formAt('subjunctive', 'Aorist passive 3rd person Singular')).toBe('λυθῇ');
    expect(formAt('subjunctive', 'Present active 1st person Singular')).toBe('λύω');
    expect(formAt('subjunctive', 'Aorist active 2nd person Singular')).toBe('λύσῃς');
    expect(formAt('imperative', 'Aorist active 2nd person Singular')).toBe('λῦσον');
    expect(formAt('imperative', 'Present active 3rd person Plural')).toBe('λυέτωσαν');
    expect(formAt('imperative', 'Aorist passive 2nd person Singular')).toBe('λύθητι');
    expect(formAt('infinitive', 'Aorist Active')).toBe('λῦσαι');
    expect(formAt('infinitive', 'Aorist Passive')).toBe('λυθῆναι');
    expect(formAt('infinitive', 'Perfect Active')).toBe('λελυκέναι');
    expect(formAt('participle', 'Aorist passive Nominative singular Feminine')).toBe('λυθεῖσα');
    expect(formAt('participle', 'Present active Nominative singular Masculine')).toBe('λύων');
    expect(formAt('participle', 'Present active Genitive singular Feminine')).toBe('λυούσης');
    expect(formAt('participle', 'Perfect active Nominative singular Masculine')).toBe('λελυκώς');
  });

  it('give the infinitive one present form for the middle and the passive', () => {
    expect(formAt('infinitive', 'Present Middle')).toBe(formAt('infinitive', 'Present Passive'));
    expect(formAt('infinitive', 'Present Middle')).toBe('λύεσθαι');
  });

  it('make every cell name the verb and its mood, and the subjunctive and the imperative a person and a number', () => {
    for (const [id, mood] of [['subjunctive', 'mood-subjunctive'], ['imperative', 'mood-imperative'], ['infinitive', 'mood-infinitive'], ['participle', 'mood-participle']] as const)
      for (const cell of cellsOf(table(id))) {
        expect(cell.ideas, `${id} ${cell.form}`).toEqual(expect.arrayContaining(['verb', mood]));
        expect(cell.ideas.filter((i) => i.startsWith('mood-')), `${id} ${cell.form}`).toEqual([mood]);
        expect(cell.ideas.filter((i) => i.startsWith('tense-') && i !== 'tense-signs'), `${id} ${cell.form}`).toHaveLength(1);
        const persons = cell.ideas.filter((i) => i.startsWith('person-'));
        expect(persons, `${id} ${cell.form}`).toHaveLength(id === 'subjunctive' || id === 'imperative' ? 1 : 0);
      }
  });

  it('name tense-signs on the aorist forms of the subjunctive and no augment', () => {
    for (const cell of cellsOf(table('subjunctive'))) {
      expect(cell.ideas, cell.form).not.toContain('augment');
      if (cell.ideas.includes('tense-aorist')) expect(cell.ideas, cell.form).toContain('tense-signs');
    }
  });

  it('name the case, number and gender of every participle cell', () => {
    for (const cell of cellsOf(table('participle'))) {
      expect(cell.ideas.filter((i) => i.startsWith('case-')), cell.form).toHaveLength(1);
      expect(cell.ideas.filter((i) => i.startsWith('gender-')), cell.form).toHaveLength(1);
      expect(cell.ideas, cell.form).toContain('number-singular');
      expect(cell.ideas.filter((i) => i.startsWith('voice-')), cell.form).toHaveLength(1);
      expect(cell.ideas.filter((i) => i.startsWith('declension-')), cell.form).toHaveLength(1);
    }
    const perfect = cellsOf(table('participle')).filter((c) => c.ideas.includes('tense-perfect'));
    expect(perfect).toHaveLength(6);
    for (const cell of perfect) expect(cell.ideas, cell.form).toContain('reduplication');
  });

  it('grow εἰμί by its subjunctive, imperative, infinitive and participle, each cell naming eimi', () => {
    const eimi = table('eimi');
    for (const cell of cellsOf(eimi)) expect(cell.ideas, cell.form).toContain('eimi');
    const greek = (mood: string) => cellsOf(eimi).filter((c) => c.lang === 'el' && c.ideas.includes(mood)).map((c) => c.form);
    expect(greek('mood-subjunctive')).toEqual(['ὦ', 'ᾖς', 'ᾖ', 'ὦμεν', 'ἦτε', 'ὦσι(ν)']);
    expect(greek('mood-imperative')).toEqual(['ἴσθι', 'ἔστω', 'ἔστε', 'ἔστωσαν']);
    expect(greek('mood-infinitive')).toEqual(['εἶναι']);
    expect(greek('mood-participle')).toEqual(['ὤν', 'ὄντος', 'οὖσα', 'οὔσης', 'ὄν', 'ὄντος']);
    expect(cellsOf(eimi).filter((c) => c.lang === 'el')).toHaveLength(35);
  });
});

// mw-svw421.25: a lock always says why it is shut, in ideas he can read and open
describe('what a locked cell says it needs', () => {
  const none = new Map();
  it('is, for every locked cell of every table at an empty level set, exactly missingIdeas(cell), by title, the lowest on the ladder first', () => {
    for (const table of PARADIGMS) {
      for (const cell of cellsOf(table)) {
        expect(isAvailable(cell, none), `${table.id} ${cell.form}`).toBe(false);
        const missing = missingIdeas(cell, none);
        expect(missing.length, `${table.id} ${cell.form} is locked with nothing missing`).toBeGreaterThan(0);
        const shown = needsOf(cell, none);
        expect(shown.map((idea) => idea.id).sort(), `${table.id} ${cell.form}`).toEqual([...missing].sort());
        expect(shown.map((idea) => idea.rung)).toEqual(shown.map((idea) => idea.rung).sort((a, b) => a - b));
        const text = needsText(cell, none);
        for (const id of missing) expect(text.toLowerCase(), `${table.id} ${cell.form}`).toContain(ideaOf(id).title.toLowerCase());
      }
    }
  });
});
