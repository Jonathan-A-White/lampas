// The grinds' scenarios (grinds/examples/<kind>/<name>.json, format in grinds/examples/README.md): `mw grist smoke lampas` sends
// each one through the live grist and checks the answer meets its `expect`. This test needs no network: it fails when a grind has
// no scenario, when a request does not fit the grind's input schema, when an `expect` names a field the answer schema lacks (or a
// value it never allows), and when a scenario's photo or recording is missing, of the wrong type, or over 200 KB.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { buildRequest } from '../../src/services/tutor';
import { buildReadingRequest } from '../../src/services/reading';
import type { Verse } from '../../src/data/chapter';
import { validate, type Schema } from '../support/schema-validate';
import { CHECKS, EXAMPLE_FILE_MAX_BYTES, FORWARD_ANSWER_SCHEMA, checkExpect, expectProblems, type GrindExample } from '../support/grind-examples';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp4': 'audio/mp4',
};

const grindFiles = readdirSync('grinds').filter((f) => f.endsWith('.json') && !f.endsWith('.schema.json'));

describe('the grinds have scenarios', () => {
  it('finds every grind of the rig', () => {
    expect(grindFiles.sort()).toEqual(['bible-talk.json', 'feedback.json', 'tips.json', 'verse-ask.json', 'verse-read.json']);
  });

  describe.each(grindFiles)('grinds/%s', (grindFile) => {
    const grind = readJson(`grinds/${grindFile}`);
    const kind = grind.kind as string;
    const dir = `grinds/examples/${kind}`;
    const exampleFiles = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
    const attachments = grind.attachments as { min: number; max: number; mime: string[]; maxBytes: number };
    const inputSchema = readJson(`grinds/${kind}.input.schema.json`) as Schema;
    const answerSchema = (grind.answerSchema ? readJson(grind.answerSchema as string) : FORWARD_ANSWER_SCHEMA) as Schema;

    it('has at least one scenario under grinds/examples/<kind>/', () => {
      expect(exampleFiles, `${grindFile} has no scenario: add ${dir}/<name>.json (see grinds/examples/README.md)`).not.toHaveLength(0);
    });

    it.each(exampleFiles)('%s is a sound scenario', (file) => {
      const example = readJson(`${dir}/${file}`) as unknown as GrindExample;
      expect(Object.keys(example).sort(), 'the keys').toEqual(example.photos ? ['description', 'expect', 'photos', 'request', 'schemaVersion'] : ['description', 'expect', 'request', 'schemaVersion']);
      expect(typeof example.description === 'string' && example.description.length > 0, 'description').toBe(true);
      expect(grind.versions, 'schemaVersion is one of the grind\'s versions').toContain(example.schemaVersion);
      expect(validate(example.request, inputSchema), 'the request fits the input schema').toEqual([]);
      expect(expectProblems(example.expect, answerSchema), 'the expect fits the answer schema').toEqual([]);

      const photos = example.photos ?? [];
      expect(photos.length, 'files named').toBeGreaterThanOrEqual(attachments.min);
      expect(photos.length, 'files named').toBeLessThanOrEqual(attachments.max);
      for (const name of photos) {
        const path = `${dir}/${name}`;
        expect(existsSync(path), `${path} exists`).toBe(true);
        expect(attachments.mime, `${name}'s type`).toContain(MIME_BY_EXT[extname(name).toLowerCase()]);
        expect(statSync(path).size, `${name} is under 200 KB`).toBeLessThan(EXAMPLE_FILE_MAX_BYTES);
      }
    });
  });
});

describe('the input schemas of verse-ask and verse-read take what the app sends', () => {
  const verse = { n: 28, g: [{ t: 'οἴδαμεν' }, { t: 'δὲ' }], e: [{ t: 'We know' }, { t: 'that' }] } as unknown as Verse;

  it('verse-ask: buildRequest, with and without the optional fields', () => {
    const schema = readJson('grinds/verse-ask.input.schema.json') as Schema;
    expect(validate(buildRequest('Romans 8:28', verse, 'What is οἴδαμεν?', ['ὁ', 'καί']), schema)).toEqual([]);
    expect(validate(buildRequest('Romans 8:28', verse, 'Why?', [], 'solid 2 words; learning: a; new today: -; due now: 0', undefined, { hebrewDepth: 'both' }), schema)).toEqual([]);
  });

  it('verse-read: buildReadingRequest, English and Greek', () => {
    const schema = readJson('grinds/verse-read.input.schema.json') as Schema;
    expect(validate(buildReadingRequest('Romans 8:28', verse, 'english'), schema)).toEqual([]);
    expect(validate(buildReadingRequest('Romans 8:28', verse, 'greek'), schema)).toEqual([]);
  });
});

describe('the scenario checks', () => {
  const schema: Schema = {
    type: 'object',
    properties: {
      price: { anyOf: [{ type: 'null' }, { type: 'number' }] },
      level: { type: 'string', enum: ['low', 'high'] },
      list: { type: 'array', items: { type: 'object', properties: { key: { const: 'theme' } } } },
    },
  };

  it('knows every check the README names', () => {
    expect(CHECKS).toEqual(['equals', 'isNull', 'oneOf', 'contains', 'matches', 'present']);
  });

  it('accepts a sound expect, including a place in an array and a branch of anyOf', () => {
    expect(expectProblems({ price: { isNull: true }, level: { oneOf: ['low', 'high'] }, 'list.0.key': { equals: 'theme' } }, schema)).toEqual([]);
  });

  it.each([
    ['a field the answer lacks', { cost: { present: true } }, 'cost: not a field of the answer schema'],
    ['a value the schema never allows', { level: { equals: 'middling' } }, 'level: equals "middling" is never a valid answer'],
    ['null where it is never null', { level: { isNull: true } }, 'level: is never null in the answer schema'],
    ['an unknown check', { level: { startsWith: 'l' } }, 'level: unknown check "startsWith"'],
    ['contains on a number', { price: { contains: 'x' } }, 'price: contains needs a string field'],
    ['no checks at all', {}, 'expect: has no checks'],
  ])('refuses %s', (_name, block, problem) => {
    expect(expectProblems(block, schema)).toContain(problem);
  });

  it('checkExpect names the field, what was wanted and what came', () => {
    const answer = { price: 4.99, level: 'low', note: 'Seen on the tag.' };
    expect(checkExpect({ price: { equals: 4.99 }, level: { oneOf: ['low'] }, note: { contains: 'tag', matches: '^Seen' }, gone: { present: false } }, answer)).toEqual([]);
    expect(checkExpect({ price: { isNull: true }, level: { equals: 'high' }, note: { contains: 'shelf' }, gone: { present: true } }, answer)).toEqual([
      'price: expected null, got 4.99',
      'level: expected "high", got "low"',
      'note: expected to contain "shelf", got "Seen on the tag."',
      'gone: expected present, got absent',
    ]);
  });
});
