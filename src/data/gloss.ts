// src/data/gloss.ts — a gloss as Lampas shows it (mw-5r3p30.384): one plain list of meanings. Two sources write theirs in a source form:
// STEPBible's TBESG gives some Strong's numbers as 'range: chosen' ('spirit/breath: spirit': the word's range, then the sense this entry is),
// and the Governor's BMA list writes the case a preposition takes before its meanings ('dat: in, by, with') or a tense in a note
// ('(aor: εἶπον)'). cleanGloss is run once where a gloss comes in (scripts/data-build.ts, scripts/seed-build.ts, Import, the store's
// upgrade of a gloss kept before), so no screen formats one. A slash between senses ('cause/charge') is the dictionary's plain 'or' and stays.
// Runs under plain node too (scripts/seed-build.ts): erasable TypeScript only, no imports.

/** The grammar abbreviations a source writes before a colon, and the word Lampas writes for each. */
const MARKS: Readonly<Record<string, string>> = {
  nom: 'nominative',
  gen: 'genitive',
  dat: 'dative',
  acc: 'accusative',
  voc: 'vocative',
  aor: 'aorist',
  fut: 'future',
  pres: 'present',
  impf: 'imperfect',
  pf: 'perfect',
};
const MARK_NAMES = Object.keys(MARKS).join('|');
const MARK = new RegExp(`(?<![\\p{L}])(${MARK_NAMES})\\.?\\s*:`, 'iu');
const LEADING_MARK = new RegExp(`^(${MARK_NAMES})\\.?\\s*:\\s*(.+)$`, 'isu');
const MARK_IN_BRACKETS = new RegExp(`\\((${MARK_NAMES})\\.?\\s*:\\s*`, 'giu');

const markWord = (abbreviation: string): string => MARKS[abbreviation.toLowerCase()];

/** A sense as compared with another: 'to keep' and 'keep', 'an age' and 'age', 'elder' and 'Elder' are one sense. */
const senseKey = (sense: string): string => sense.toLowerCase().replace(/^(?:to|be|a|an|the)\s+/, '');

/** 'spirit/breath: spirit' is 'spirit, breath'; 'to keep: observe' is 'to keep, observe': the range's senses, then the chosen one when the range lacks it. */
function rangeAndChosen(range: string, chosen: string): string {
  const senses: string[] = [];
  for (const sense of [...range.split('/'), ...chosen.split('/')].map((s) => s.trim()).filter(Boolean)) {
    if (!senses.some((kept) => senseKey(kept) === senseKey(sense))) senses.push(sense);
  }
  return senses.join(', ');
}

/** The gloss as Lampas shows it; a gloss with no source form comes back as it is. */
export function cleanGloss(raw: string): string {
  const gloss = raw
    .replace(MARK_IN_BRACKETS, (_, mark: string) => `(${markWord(mark)} `)
    .split(/\s*;\s*/)
    .map((part) => {
      const lead = LEADING_MARK.exec(part);
      return lead ? `${lead[2].trim()} (${markWord(lead[1])})` : part;
    })
    .join('; ');
  const split = /^([^:()]+):\s*([^:()]+)$/.exec(gloss);
  return split ? rangeAndChosen(split[1], split[2]) : gloss;
}

/** The source form a gloss is still written in ('dat:', 'aor:', 'range: chosen'), or undefined when it reads as plain English. */
export function sourceFormOf(gloss: string): string | undefined {
  const mark = MARK.exec(gloss);
  if (mark) return `${mark[1].toLowerCase()}:`;
  return gloss.includes(':') ? 'range: chosen' : undefined;
}
