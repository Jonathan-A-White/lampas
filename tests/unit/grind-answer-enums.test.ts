// A smoke example that says an answer field is "one_of [...]" holds the model to a short list; if the answer schema does not
// enumerate that field, the model is free to invent a value outside the list and the smoke flakes (mw-5r3p30.1245: verse-read's
// read-woven-english-and-greek answered a verdict the example refused). Every such field's schema lists its values, and
// the list holds each value the example allows.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { branches, schemasAt, type FieldCheck } from '../support/grind-examples';
import type { Schema } from '../support/schema-validate';
import { resolveRef } from '../support/schema-validate';
import { PARADIGMS } from '../../src/data/paradigms';

const readJson = <T>(rel: string): T => JSON.parse(readFileSync(rel, 'utf8')) as T;

interface OneOf { grind: string; example: string; path: string; values: unknown[] }

const oneOfsOf = (check: FieldCheck): unknown[][] => [...(check.one_of ? [check.one_of] : []), ...(check.all ?? []).flatMap(oneOfsOf)];

const found: OneOf[] = [];
const kinds = readdirSync('grinds', { withFileTypes: true }).filter((d) => d.isDirectory() === false && d.name.endsWith('.answer.schema.json')).map((d) => d.name.replace('.answer.schema.json', ''));
for (const kind of kinds) {
  let files: string[] = [];
  try {
    files = readdirSync(`grinds/examples/${kind}`).filter((f) => f.endsWith('.json'));
  } catch {
    files = [];
  }
  for (const file of files) {
    const example = readJson<{ expect: Record<string, FieldCheck> }>(`grinds/examples/${kind}/${file}`);
    for (const [path, check] of Object.entries(example.expect)) for (const values of oneOfsOf(check)) found.push({ grind: kind, example: file, path, values });
  }
}

/**
 * Fields an example narrows with one_of that the schema cannot enumerate, because the values are the request's own (a row, an idea or
 * a form field the app sent this time): the schema says "copied from the request" and the instructions say never one not listed.
 * Keyed by `<grind>/<path>`; a new one needs a reason.
 */
const FROM_THE_REQUEST: Record<string, string> = {
  'bible-talk/links.0.sermon': 'a row of the request\'s sermons.rows',
  'bible-talk/form_ask': 'the name of a field of the request\'s form',
  'drill-items/items.0.idea': 'the id of an idea the request lists',
};

/** The values a schema field lists in an `enum` (an `anyOf` branch's too), or null when some branch is free. */
function enumOf(schemas: Schema[], root: Schema): unknown[] | null {
  const all = schemas.flatMap((s) => branches(resolveRef(s, root), root));
  if (all.length === 0 || all.some((s) => !Array.isArray(s.enum))) return null;
  return all.flatMap((s) => s.enum as unknown[]);
}

describe('every field an example checks with one_of is enumerated by its answer schema', () => {
  it('finds the examples that check one_of', () => {
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((f) => f.grind === 'verse-read' && f.path === 'verdict')).toBe(true);
  });

  it.each(found.map((f) => [`${f.grind}/${f.example} ${f.path}`, f] as const))('%s', (_name, f) => {
    const root = readJson<Schema>(`grinds/${f.grind}.answer.schema.json`);
    if (FROM_THE_REQUEST[`${f.grind}/${f.path}`]) return;
    const listed = enumOf(schemasAt(root, f.path), root);
    expect(listed, `grinds/${f.grind}.answer.schema.json: ${f.path} has no "enum", so the model may answer a value ${JSON.stringify(f.values)} does not allow`).not.toBeNull();
    for (const value of f.values) expect(listed, `${f.path}: ${JSON.stringify(value)} is not in the schema's enum`).toContain(value);
  });
});

describe('the verse-read verdict a woven reading may answer', () => {
  it('the schema lists exactly the verdicts the instructions name', () => {
    const root = readJson<{ properties: { verdict: { enum: string[] } } }>('grinds/verse-read.answer.schema.json');
    expect(root.properties.verdict.enum).toEqual(['well-read', 'some-to-fix', 'partial', 'incomplete']);
  });
});

describe('the paradigm table a tutor link may open', () => {
  it('the answer schema lists exactly the Paradigms screen\'s ids', () => {
    const root = readJson<Schema>('grinds/bible-talk.answer.schema.json');
    const links = schemasAt(root, 'links.0');
    const paradigm = links.find((s) => (s.properties?.kind as Schema | undefined)?.const === 'paradigm');
    expect(paradigm).toBeDefined();
    expect((paradigm?.properties?.table as Schema | undefined)?.enum).toEqual(PARADIGMS.map((p) => p.id));
  });

  it('every FROM_THE_REQUEST entry is still a one_of an example checks', () => {
    for (const key of Object.keys(FROM_THE_REQUEST)) expect(found.some((f) => `${f.grind}/${f.path}` === key), key).toBe(true);
  });
});
