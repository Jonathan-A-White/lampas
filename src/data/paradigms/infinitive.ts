// src/data/paradigms/infinitive.ts — λύω in the infinitive: present, aorist and perfect, active, middle and passive = 9 cells.
// PROVISIONAL (the Governor to confirm the name). The forms are written whole. The middle and the passive share one present form
// (λύεσθαι) and one perfect form (λελύσθαι). An infinitive has no person or number.
import type { Paradigm } from './types';

// [tense heading, tense idea, active, middle, passive, ideas of the tense's signs]
const TENSES: [string, string, string, string, string, string[]][] = [
  ['Present', 'tense-present', 'λύειν', 'λύεσθαι', 'λύεσθαι', []],
  ['Aorist', 'tense-aorist', 'λῦσαι', 'λύσασθαι', 'λυθῆναι', ['tense-signs']],
  ['Perfect', 'tense-perfect', 'λελυκέναι', 'λελύσθαι', 'λελύσθαι', ['reduplication']],
];

const VOICES = [
  ['Active', 'voice-active'],
  ['Middle', 'voice-middle'],
  ['Passive', 'voice-passive'],
] as const;

export const INFINITIVE: Paradigm = {
  id: 'infinitive',
  name: 'The infinitive',
  about: 'λύω in the infinitive: present, aorist and perfect',
  ideas: ['mood-infinitive'],
  tier: 'verbs',
  columns: VOICES.map(([label]) => ({ label })),
  rows: TENSES.map(([label, tenseIdea, active, middle, passive, signs]) => ({
    label,
    cells: [active, middle, passive].map((form, v) => ({
      form,
      lang: 'el' as const,
      ideas: ['verb', 'mood-infinitive', VOICES[v][1], tenseIdea, ...signs],
    })),
  })),
};
