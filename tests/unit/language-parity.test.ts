// tests/unit/language-parity.test.ts — the golden list of use cases is kept by every language (mw-5r3p30.903, docs/language-parity.md).
// src/languages/useCases.ts says, for each use case and each language, has (proved by a scenario tagged @uc-<id> and @<language>), gap (with
// its backfill) or n/a (with its reason); this test holds the registry to features/*.feature and docs/language-parity.md to the registry, so a
// use case cannot be left out of a language by accident: a new use case is a tagged scenario for every enabled language plus a registry entry.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGUAGES, NEUTRAL_FEATURES, USE_CASES, isNa, isGap, type UseCase } from '../../src/languages/useCases';
import { readFeatures, type TaggedScenario } from '../support/features';
import { PARITY_DOC, hebrewGapsSection, parityTable } from '../support/parityTable';

const features = readFeatures();
const scenarios: TaggedScenario[] = features.flatMap((f) => f.scenarios);
const UC = 'uc-';
const ucTagsOf = (s: TaggedScenario): string[] => s.tags.filter((t) => t.startsWith(UC)).map((t) => t.slice(UC.length));
const languageTags = new Set<string>(LANGUAGES.map((l) => l.id));
const languageTagsOf = (s: TaggedScenario): string[] => s.tags.filter((t) => languageTags.has(t));
const at = (s: TaggedScenario): string => `${s.file}.feature:${s.line}`;
const proving = (useCase: string, language: string): TaggedScenario[] =>
  scenarios.filter((s) => ucTagsOf(s).includes(useCase) && languageTagsOf(s).includes(language));

describe('the registry of use cases', () => {
  it('names each use case once, in kebab case, with a title', () => {
    const ids = USE_CASES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of USE_CASES) {
      expect(u.id, u.id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
      expect(u.title.length, u.id).toBeGreaterThan(3);
    }
  });

  it('gives every use case a status for every language, a gap its backfill and an n/a its reason', () => {
    for (const u of USE_CASES) {
      for (const language of LANGUAGES) {
        const status = u.status[language.id];
        expect(status, `${u.id} has no status for ${language.id}`).toBeDefined();
        if (isGap(status)) expect(status.gap.length, `${u.id}/${language.id}: a gap names its backfill`).toBeGreaterThan(10);
        if (isNa(status)) expect(status.na.length, `${u.id}/${language.id}: an n/a gives its reason`).toBeGreaterThan(10);
      }
    }
  });

  it('enables Greek and Hebrew today, and Latin not yet', () => {
    expect(LANGUAGES.map((l) => [l.id, l.enabled])).toEqual([
      ['greek', true],
      ['hebrew', true],
      ['latin', false],
    ]);
  });
});

describe('the tags in features/', () => {
  it('every @uc- tag names a use case of the registry', () => {
    const known = new Set(USE_CASES.map((u) => u.id));
    const unknown = scenarios.flatMap((s) => ucTagsOf(s).filter((id) => !known.has(id)).map((id) => `${at(s)} @uc-${id}`));
    expect(unknown).toEqual([]);
  });

  it('a scenario with a use case has a language, and one with a language has a use case', () => {
    const halfTagged = scenarios.filter((s) => (ucTagsOf(s).length > 0) !== (languageTagsOf(s).length > 0)).map((s) => `${at(s)} ${s.tags.join(' ')}`);
    expect(halfTagged).toEqual([]);
  });

  it('every feature is tagged with a use case or listed as language-neutral, never both, and nothing is left out', () => {
    const neutral = new Set(Object.keys(NEUTRAL_FEATURES));
    const files = features.map((f) => f.file);
    const untagged = features.filter((f) => !neutral.has(f.file) && f.scenarios.every((s) => ucTagsOf(s).length === 0)).map((f) => f.file);
    const both = features.filter((f) => neutral.has(f.file) && f.scenarios.some((s) => ucTagsOf(s).length > 0)).map((f) => f.file);
    const gone = [...neutral].filter((file) => !files.includes(file));
    expect({ untagged, both, gone }).toEqual({ untagged: [], both: [], gone: [] });
    for (const reason of Object.values(NEUTRAL_FEATURES)) expect(reason.length).toBeGreaterThan(10);
  });

  it('a tagged feature tags every one of its scenarios', () => {
    const partly = features
      .filter((f) => f.scenarios.some((s) => ucTagsOf(s).length > 0))
      .flatMap((f) => f.scenarios.filter((s) => ucTagsOf(s).length === 0).map(at));
    expect(partly).toEqual([]);
  });
});

describe('every enabled language against the golden list', () => {
  const enabled = LANGUAGES.filter((l) => l.enabled);
  const disabled = LANGUAGES.filter((l) => !l.enabled);

  it.each(enabled.map((l) => [l.id] as const))('%s: a use case marked has is proved by a tagged scenario, and a gap has none', (language) => {
    const unproved = USE_CASES.filter((u) => u.status[language] === 'has' && proving(u.id, language).length === 0).map((u) => u.id);
    const stale = USE_CASES.filter((u) => isGap(u.status[language]) && proving(u.id, language).length > 0).map((u) => `${u.id} (${proving(u.id, language).map(at).join(', ')})`);
    const tooMany = USE_CASES.filter((u) => isNa(u.status[language]) && proving(u.id, language).length > 0).map((u) => u.id);
    expect({ unproved, staleGaps: stale, naWithScenario: tooMany }).toEqual({ unproved: [], staleGaps: [], naWithScenario: [] });
  });

  it('a language not yet enabled claims nothing and has no scenario', () => {
    for (const language of disabled) {
      expect(USE_CASES.filter((u) => u.status[language.id] === 'has').map((u) => u.id), language.id).toEqual([]);
      expect(scenarios.filter((s) => languageTagsOf(s).includes(language.id)).map(at), language.id).toEqual([]);
    }
  });

  it('Greek, the most developed, has every use case that is not n/a for it or waiting on a story', () => {
    const missing = USE_CASES.filter((u) => u.status.greek !== 'has' && !isNa(u.status.greek) && !isGap(u.status.greek)).map((u) => u.id);
    expect(missing).toEqual([]);
  });
});

describe('docs/language-parity.md', () => {
  const doc = existsSync(PARITY_DOC) ? readFileSync(PARITY_DOC, 'utf8') : '';

  it('holds the golden list as the table the registry and the tags give (npm run parity:docs writes it)', () => {
    expect(doc).toContain(parityTable(features));
  });

  it('names each Hebrew gap with the scenario its backfill must add', () => {
    expect(doc).toContain(hebrewGapsSection(USE_CASES.filter((u): u is UseCase => isGap(u.status.hebrew))));
  });

  it('every src/ path it cites exists', () => {
    const cited = [...new Set([...doc.matchAll(/`(src\/[\w./-]+?)(?::\d+(?:-\d+)?)?`/g)].map((m) => m[1]))];
    expect(cited.length).toBeGreaterThan(20);
    expect(cited.filter((path) => !existsSync(path))).toEqual([]);
  });
});
