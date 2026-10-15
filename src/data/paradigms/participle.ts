// src/data/paradigms/participle.ts — λύω in the participle: present active, present middle or passive, aorist active, aorist passive
// and perfect active; the nominative and genitive singular of each gender = 5 x 3 x 2 = 30 cells. PROVISIONAL (the Governor to confirm
// the name and which participles the table holds). The forms are written whole, a block of rows for each participle, the three genders across. A cell names the declension of its pattern: the
// masculine and neuter of λύων, λύσας, λυθείς and λελυκώς go as the third declension, those of λυόμενος as the second, and every
// feminine as the first.
import type { Paradigm } from './types';

const GENDERS = [
  ['Masculine', 'gender-masculine'],
  ['Feminine', 'gender-feminine'],
  ['Neuter', 'gender-neuter'],
] as const;

const CASES = [
  ['Nominative singular', 'case-nominative'],
  ['Genitive singular', 'case-genitive'],
] as const;

// [tense heading, voice heading, tense idea, voice idea, six forms (masculine, feminine, neuter; nominative then genitive), declensions
// of the masculine, feminine and neuter, ideas of the tense's signs]
const COLUMNS: [string, string, string, string, string[], [string, string, string], string[]][] = [
  ['Present', 'Active', 'tense-present', 'voice-active', ['λύων', 'λύοντος', 'λύουσα', 'λυούσης', 'λῦον', 'λύοντος'], ['declension-3', 'declension-1', 'declension-3'], []],
  ['Present', 'Middle or passive', 'tense-present', 'voice-middle-or-passive', ['λυόμενος', 'λυομένου', 'λυομένη', 'λυομένης', 'λυόμενον', 'λυομένου'], ['declension-2', 'declension-1', 'declension-2'], []],
  ['Aorist', 'Active', 'tense-aorist', 'voice-active', ['λύσας', 'λύσαντος', 'λύσασα', 'λυσάσης', 'λῦσαν', 'λύσαντος'], ['declension-3', 'declension-1', 'declension-3'], ['tense-signs']],
  ['Aorist', 'Passive', 'tense-aorist', 'voice-passive', ['λυθείς', 'λυθέντος', 'λυθεῖσα', 'λυθείσης', 'λυθέν', 'λυθέντος'], ['declension-3', 'declension-1', 'declension-3'], ['tense-signs']],
  ['Perfect', 'Active', 'tense-perfect', 'voice-active', ['λελυκώς', 'λελυκότος', 'λελυκυῖα', 'λελυκυίας', 'λελυκός', 'λελυκότος'], ['declension-3', 'declension-1', 'declension-3'], ['reduplication', 'tense-signs']],
];

export const PARTICIPLE: Paradigm = {
  id: 'participle',
  name: 'The participle',
  about: 'λύω in the participle: the nominative and genitive singular of each gender',
  ideas: ['mood-participle'],
  tier: 'verbs',
  columns: GENDERS.map(([label]) => ({ label })),
  rows: COLUMNS.flatMap(([tense, voice, tenseIdea, voiceIdea, forms, declensions, signs]) =>
    CASES.map(([label, caseIdea], c) => ({
      group: `${tense} ${voice.toLowerCase()}`,
      label,
      cells: GENDERS.map(([, genderIdea], g) => ({
        form: forms[g * 2 + c],
        lang: 'el' as const,
        ideas: ['verb', 'mood-participle', voiceIdea, tenseIdea, caseIdea, 'number-singular', genderIdea, declensions[g], ...signs],
      })),
    })),
  ),
};
