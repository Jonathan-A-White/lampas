// src/data/paradigms/participle.ts — λύω in the participle: present active, present middle or passive, aorist active, aorist middle, aorist passive,
// perfect active and perfect middle or passive; every case but the vocative, singular and plural, of each gender = 7 x 8 x 3 = 168 cells (mw-5r3p30.1003;
// before it the table held the nominative and genitive singular of five participles, and 2,014 participles of the New Testament opened it with no cell).
// PROVISIONAL (the Governor to confirm the name and which participles the table holds; the future participle and the vocative are not in it). The forms are
// written whole, a block of rows for each participle, the three genders across. A cell names the declension of its pattern: the masculine and neuter of λύων,
// λύσας, λυθείς and λελυκώς go as the third declension, those of λυόμενος, λυσάμενος and λελυμένος as the second, and every feminine as the first.
import type { Paradigm } from './types';

const GENDERS = [
  ['Masculine', 'gender-masculine'],
  ['Feminine', 'gender-feminine'],
  ['Neuter', 'gender-neuter'],
] as const;

// [label, case idea, number idea]: the order of the eight forms of a gender below
const PLACES = [
  ['Nominative singular', 'case-nominative', 'number-singular'],
  ['Genitive singular', 'case-genitive', 'number-singular'],
  ['Dative singular', 'case-dative', 'number-singular'],
  ['Accusative singular', 'case-accusative', 'number-singular'],
  ['Nominative plural', 'case-nominative', 'number-plural'],
  ['Genitive plural', 'case-genitive', 'number-plural'],
  ['Dative plural', 'case-dative', 'number-plural'],
  ['Accusative plural', 'case-accusative', 'number-plural'],
] as const;

type Forms = [string[], string[], string[]];

// [tense heading, voice heading, tense idea, voice idea, the eight forms of the masculine, feminine and neuter, declensions
// of the masculine, feminine and neuter, ideas of the tense's signs]
const COLUMNS: [string, string, string, string, Forms, [string, string, string], string[]][] = [
  [
    'Present', 'Active', 'tense-present', 'voice-active',
    [
      ['λύων', 'λύοντος', 'λύοντι', 'λύοντα', 'λύοντες', 'λυόντων', 'λύουσι(ν)', 'λύοντας'],
      ['λύουσα', 'λυούσης', 'λυούσῃ', 'λύουσαν', 'λύουσαι', 'λυουσῶν', 'λυούσαις', 'λυούσας'],
      ['λῦον', 'λύοντος', 'λύοντι', 'λῦον', 'λύοντα', 'λυόντων', 'λύουσι(ν)', 'λύοντα'],
    ],
    ['declension-3', 'declension-1', 'declension-3'], [],
  ],
  [
    'Present', 'Middle or passive', 'tense-present', 'voice-middle-or-passive',
    [
      ['λυόμενος', 'λυομένου', 'λυομένῳ', 'λυόμενον', 'λυόμενοι', 'λυομένων', 'λυομένοις', 'λυομένους'],
      ['λυομένη', 'λυομένης', 'λυομένῃ', 'λυομένην', 'λυόμεναι', 'λυομένων', 'λυομέναις', 'λυομένας'],
      ['λυόμενον', 'λυομένου', 'λυομένῳ', 'λυόμενον', 'λυόμενα', 'λυομένων', 'λυομένοις', 'λυόμενα'],
    ],
    ['declension-2', 'declension-1', 'declension-2'], [],
  ],
  [
    'Aorist', 'Active', 'tense-aorist', 'voice-active',
    [
      ['λύσας', 'λύσαντος', 'λύσαντι', 'λύσαντα', 'λύσαντες', 'λυσάντων', 'λύσασι(ν)', 'λύσαντας'],
      ['λύσασα', 'λυσάσης', 'λυσάσῃ', 'λύσασαν', 'λύσασαι', 'λυσασῶν', 'λυσάσαις', 'λυσάσας'],
      ['λῦσαν', 'λύσαντος', 'λύσαντι', 'λῦσαν', 'λύσαντα', 'λυσάντων', 'λύσασι(ν)', 'λύσαντα'],
    ],
    ['declension-3', 'declension-1', 'declension-3'], ['tense-signs'],
  ],
  [
    'Aorist', 'Middle', 'tense-aorist', 'voice-middle',
    [
      ['λυσάμενος', 'λυσαμένου', 'λυσαμένῳ', 'λυσάμενον', 'λυσάμενοι', 'λυσαμένων', 'λυσαμένοις', 'λυσαμένους'],
      ['λυσαμένη', 'λυσαμένης', 'λυσαμένῃ', 'λυσαμένην', 'λυσάμεναι', 'λυσαμένων', 'λυσαμέναις', 'λυσαμένας'],
      ['λυσάμενον', 'λυσαμένου', 'λυσαμένῳ', 'λυσάμενον', 'λυσάμενα', 'λυσαμένων', 'λυσαμένοις', 'λυσάμενα'],
    ],
    ['declension-2', 'declension-1', 'declension-2'], ['tense-signs'],
  ],
  [
    'Aorist', 'Passive', 'tense-aorist', 'voice-passive',
    [
      ['λυθείς', 'λυθέντος', 'λυθέντι', 'λυθέντα', 'λυθέντες', 'λυθέντων', 'λυθεῖσι(ν)', 'λυθέντας'],
      ['λυθεῖσα', 'λυθείσης', 'λυθείσῃ', 'λυθεῖσαν', 'λυθεῖσαι', 'λυθεισῶν', 'λυθείσαις', 'λυθείσας'],
      ['λυθέν', 'λυθέντος', 'λυθέντι', 'λυθέν', 'λυθέντα', 'λυθέντων', 'λυθεῖσι(ν)', 'λυθέντα'],
    ],
    ['declension-3', 'declension-1', 'declension-3'], ['tense-signs'],
  ],
  [
    'Perfect', 'Active', 'tense-perfect', 'voice-active',
    [
      ['λελυκώς', 'λελυκότος', 'λελυκότι', 'λελυκότα', 'λελυκότες', 'λελυκότων', 'λελυκόσι(ν)', 'λελυκότας'],
      ['λελυκυῖα', 'λελυκυίας', 'λελυκυίᾳ', 'λελυκυῖαν', 'λελυκυῖαι', 'λελυκυιῶν', 'λελυκυίαις', 'λελυκυίας'],
      ['λελυκός', 'λελυκότος', 'λελυκότι', 'λελυκός', 'λελυκότα', 'λελυκότων', 'λελυκόσι(ν)', 'λελυκότα'],
    ],
    ['declension-3', 'declension-1', 'declension-3'], ['reduplication', 'tense-signs'],
  ],
  [
    'Perfect', 'Middle or passive', 'tense-perfect', 'voice-middle-or-passive',
    [
      ['λελυμένος', 'λελυμένου', 'λελυμένῳ', 'λελυμένον', 'λελυμένοι', 'λελυμένων', 'λελυμένοις', 'λελυμένους'],
      ['λελυμένη', 'λελυμένης', 'λελυμένῃ', 'λελυμένην', 'λελυμέναι', 'λελυμένων', 'λελυμέναις', 'λελυμένας'],
      ['λελυμένον', 'λελυμένου', 'λελυμένῳ', 'λελυμένον', 'λελυμένα', 'λελυμένων', 'λελυμένοις', 'λελυμένα'],
    ],
    ['declension-2', 'declension-1', 'declension-2'], ['reduplication'],
  ],
];

export const PARTICIPLE: Paradigm = {
  id: 'participle',
  name: 'The participle',
  about: 'λύω in the participle: seven participles in every case but the vocative, singular and plural',
  ideas: ['mood-participle'],
  tier: 'verbs',
  columns: GENDERS.map(([label]) => ({ label })),
  rows: COLUMNS.flatMap(([tense, voice, tenseIdea, voiceIdea, forms, declensions, signs]) =>
    PLACES.map(([label, caseIdea, numberIdea], p) => ({
      group: `${tense} ${voice.toLowerCase()}`,
      label,
      cells: GENDERS.map(([, genderIdea], g) => ({
        form: forms[g][p],
        lang: 'el' as const,
        ideas: ['verb', 'mood-participle', voiceIdea, tenseIdea, caseIdea, numberIdea, genderIdea, declensions[g], ...signs],
      })),
    })),
  ),
};
