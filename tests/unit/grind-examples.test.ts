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
import { CHECKS, EXAMPLE_FILE_MAX_BYTES, FORWARD_ANSWER_SCHEMA, checkExpect, expectProblems, turnTwoProblems, type GrindExample } from '../support/grind-examples';

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
    expect(grindFiles.sort()).toEqual(['audible-position.json', 'bible-talk.json', 'drill-items.json', 'feedback.json', 'find-refs.json', 'tips.json', 'verse-ask.json', 'verse-read.json']);
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
      expect(Object.keys(example).sort(), 'the keys').toEqual(['description', 'expect', ...(example.photos ? ['photos'] : []), 'request', 'schemaVersion', ...('turn_2' in example ? ['turn_2'] : [])]);
      expect(typeof example.description === 'string' && example.description.length > 0, 'description').toBe(true);
      expect(grind.versions, 'schemaVersion is one of the grind\'s versions').toContain(example.schemaVersion);
      expect(validate(example.request, inputSchema), 'the request fits the input schema').toEqual([]);
      expect(expectProblems(example.expect, answerSchema), 'the expect fits the answer schema').toEqual([]);
      if ('turn_2' in example) expect(turnTwoProblems(example.turn_2, inputSchema), 'turn_2').toEqual([]);

      // turn 2 is a turn of its own, with its own files (mw-pxji7y.6)
      for (const photos of [example.photos ?? [], ...(example.turn_2 ? [example.turn_2.photos ?? []] : [])]) {
        expect(photos.length, 'files named').toBeGreaterThanOrEqual(attachments.min);
        expect(photos.length, 'files named').toBeLessThanOrEqual(attachments.max);
        for (const name of photos) {
          const path = `${dir}/${name}`;
          expect(existsSync(path), `${path} exists`).toBe(true);
          expect(attachments.mime, `${name}'s type`).toContain(MIME_BY_EXT[extname(name).toLowerCase()]);
          expect(statSync(path).size, `${name} is under 200 KB`).toBeLessThan(EXAMPLE_FILE_MAX_BYTES);
        }
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
    expect(CHECKS).toEqual(['equals', 'is_null', 'one_of', 'contains', 'matches', 'present', 'all']);
  });

  it('accepts a sound expect, including a place in an array and a branch of anyOf', () => {
    expect(expectProblems({ price: { is_null: true }, level: { one_of: ['low', 'high'] }, 'list.0.key': { equals: 'theme' } }, schema)).toEqual([]);
  });

  it.each([
    ['a field the answer lacks', { cost: { present: true } }, 'cost: not a field of the answer schema'],
    ['a value the schema never allows', { level: { equals: 'middling' } }, 'level: equals "middling" is never a valid answer'],
    ['null where it is never null', { level: { is_null: true } }, 'level: is never null in the answer schema'],
    ['a check spelt in camelCase (isNull)', { price: { isNull: true } }, 'price: unknown check "isNull"'],
    ['a check spelt in camelCase (oneOf)', { level: { oneOf: ['low'] } }, 'level: unknown check "oneOf"'],
    ['a bare string that looks like a check name', { price: 'isNull' }, 'price: "isNull" looks like a check name; write { "is_null": true }'],
    ['a bare string that looks like a check name (oneOf)', { level: 'oneOf' }, 'level: "oneOf" looks like a check name; write { "one_of": [...] }'],
    ['an unknown check', { level: { startsWith: 'l' } }, 'level: unknown check "startsWith"'],
    ['contains on a number', { price: { contains: 'x' } }, 'price: contains needs a string field'],
    ['no checks at all', {}, 'expect: has no checks'],
  ])('refuses %s', (_name, block, problem) => {
    expect(expectProblems(block, schema)).toContain(problem);
  });

  it.each([
    ['a lookahead (?=', '(?=.*TBESG)'],
    ['a negative lookahead (?!', 'TBESG(?!x)'],
    ['a lookbehind (?<=', '(?<=a)b'],
    ['a negative lookbehind (?<!', '(?<!a)b'],
    ['a backreference \\1', '(a)\\1'],
    ['the empty negated class [^]', '[^]*TBESG'],
  ])('refuses %s, which the mill\'s Go regexp (RE2) cannot compile', (_name, pattern) => {
    expect(expectProblems({ level: { matches: pattern } }, schema)).toContain(`level: matches uses syntax RE2 (the mill's Go regexp) cannot compile`);
  });

  it.each([
    ['a class that excludes a character', '^[^\\n]{10,200}\\?$'],
    ['an escaped paren and a class holding (?=', '\\(?=x|[(?=]'],
    ['an alternation across lines with [\\s\\S]', 'TBESG[\\s\\S]*CC BY 4\\.0|CC BY 4\\.0[\\s\\S]*TBESG'],
    ['a named group', '(?<word>a)'],
    ['a literal backslash then 1', '\\\\1'],
  ])('accepts %s', (_name, pattern) => {
    expect(expectProblems({ level: { matches: pattern } }, schema)).toEqual([]);
  });

  it('checkExpect names the field, what was wanted and what came', () => {
    const answer = { price: 4.99, level: 'low', note: 'Seen on the tag.' };
    expect(checkExpect({ price: { equals: 4.99 }, level: { one_of: ['low'] }, note: { contains: 'tag', matches: '^Seen' }, gone: { present: false } }, answer)).toEqual([]);
    expect(checkExpect({ price: { is_null: true }, level: { equals: 'high' }, note: { contains: 'shelf' }, gone: { present: true } }, answer)).toEqual([
      'price: expected null, got 4.99',
      'level: expected "high", got "low"',
      'note: expected to contain "shelf", got "Seen on the tag."',
      'gone: expected present, got absent',
    ]);
  });
});

// mw-pxji7y.6: a talk example may hold turn_2, the second turn (mw grist eval / smoke, millwright a50a463): its own request, sent with no history
// under turn 1's talk; `expect` judges turn 2's answer.
describe('a two-turn scenario (turn_2)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const turn1 = readJson('grinds/examples/bible-talk/cleaned-question.json').request as Record<string, unknown>;

  it('takes a turn_2 whose request fits the input schema, with or without photos', () => {
    expect(turnTwoProblems({ request: { ...turn1, question: 'What did I tell you?' } }, input)).toEqual([]);
    expect(turnTwoProblems({ request: turn1, photos: [] }, input)).toEqual([]);
  });

  it.each([
    ['a turn_2 that is not an object', 'again', 'turn_2: must be an object holding a request'],
    ['a turn_2 with no request', { photos: [] }, 'turn_2.request: missing'],
    ['a turn_2 whose request is a string', { request: 'What did I tell you?' }, 'turn_2.request: must be an object'],
    ['a turn_2 whose request lacks what the schema requires', { request: { question: 'Who?' } }, 'turn_2.request fits the input schema'],
    ['a key turn_2 does not have', { request: turn1, expect: {} }, 'turn_2: unknown key "expect"'],
    ['photos that are not a list of names', { request: turn1, photos: 'a.png' }, 'turn_2.photos: must be a list of file names'],
  ])('refuses %s', (_name, turn2, problem) => {
    expect(turnTwoProblems(turn2, input).join('\n')).toContain(problem);
  });

  it('checks the all check: every one of its list must hold, and the unsound are refused', () => {
    const answerSchema = readJson(readJson('grinds/bible-talk.json').answerSchema as string) as Schema;
    const block = { answer: { all: [{ matches: 'Luke' }, { matches: '14|fourteen' }] } };
    expect(expectProblems(block, answerSchema)).toEqual([]);
    expect(checkExpect(block, { answer: 'Your son Luke is 14.' })).toEqual([]);
    expect(checkExpect(block, { answer: 'Your son Luke is a boy.' })).toEqual(['answer: expected to match /14|fourteen/, got "Your son Luke is a boy."']);
    expect(expectProblems({ answer: { all: [] } }, answerSchema)).toContain('answer: all must be a non-empty list of checks');
    expect(expectProblems({ answer: { all: [{ startsWith: 'L' }] } }, answerSchema)).toContain('answer.all.0: unknown check "startsWith"');
    expect(expectProblems({ answer: { all: [{ matches: '(?=Luke)' }] } }, answerSchema)).toContain(`answer.all.0: matches uses syntax RE2 (the mill's Go regexp) cannot compile`);
  });
});

describe('bible-talk/other-passage-in-place (mw-5r3p30.153)', () => {
  const example = readJson('grinds/examples/bible-talk/other-passage-in-place.json') as unknown as GrindExample;
  const answer = { answer: 'Melchizedek is the priest-king of Salem (Hebrews 7:1-2).', words: [] };

  // mw-5r3p30.160: the app draws no link with no study resource on (features/tutor-links.feature), so what the example guards is the passage, not the links
  it.each([
    ['leaves links out', answer],
    ['sends an empty list of links', { ...answer, links: [] }],
    ['sends a verse link the app will drop', { ...answer, links: [{ kind: 'verse', reference: 'Genesis 14:18' }] }],
  ])('passes when the mill %s', (_name, given) => {
    expect(checkExpect(example.expect, given)).toEqual([]);
  });

  // mw-5r3p30.414: smoke failed on an answer that cited Genesis 14:18; the example checks that a verse about Melchizedek is named, never which one
  it.each([
    'Melchizedek was the king of Salem and a priest of God Most High (Genesis 14:18).',
    'Gen. 14:19-20 says he blessed Abram.',
    'He is named in Psalm 110:4 as a priest forever.',
    'Hebrews 5:6 and Hebrews 5:10 call Jesus a priest in his order.',
    'See Hebrews 6:20.',
    'Hebrews 7:17 quotes the Psalm.',
    'Heb 7:1-3 describes him.',
  ])('passes when the answer cites any verse about him: %s', (text) => {
    expect(checkExpect(example.expect, { ...answer, answer: text })).toEqual([]);
  });

  it.each([
    'Melchizedek was a priest and king, and I will not say where.',
    'Look at Romans 8:28 for that.',
    'Genesis 14:17 has the battle; Hebrews 7:18 is about the law.',
    'Psalm 110:40 is not it, nor Hebrews 5:60.',
  ])('fails when the answer cites no verse about him: %s', (text) => {
    expect(checkExpect(example.expect, { ...answer, answer: text })).not.toEqual([]);
  });

  it('still fails when the answer names no passage, or changes a setting', () => {
    expect(checkExpect(example.expect, { ...answer, answer: 'A priest.' })).not.toEqual([]);
    expect(checkExpect(example.expect, { ...answer, settings_changes: [{ key: 'theme', value: 'dark' }] })).not.toEqual([]);
  });
});

// mw-5r3p30.164: the tutor's cleaned wording varies run to run, so the cleaned-question scenarios check what cleaning promises
// (no filler, a question that ends in '?', a capital start, the meaning word), never one exact string. Smoke failed at 17:07Z on an `equals`.
describe.each(['verse-ask', 'bible-talk'])('%s/cleaned-question (mw-5r3p30.164)', (kind) => {
  const example = readJson(`grinds/examples/${kind}/cleaned-question.json`) as unknown as GrindExample;
  const answered = (question: string) => checkExpect(example.expect, { question });

  it('has no exact equals on the question', () => {
    expect(example.expect.question?.equals).toBeUndefined();
  });

  it.each([
    'Why are there italic words? What does it mean for the words to be italic?',
    'Why are there italic words? What does it mean for those words to be italic?',
    'Why are there italic words? What is meant by words being italic?',
  ])('accepts a clean rewording: %s', (question) => {
    expect(answered(question)).toEqual([]);
  });

  it.each([
    ['the 17:07Z answer', 'Um, why are there, uh, italic words? What does it mean for the words to be ita…'],
    ['the whole 17:07Z answer', 'Um, why are there, uh, italic words? What does it mean for the words to be italic?'],
    ['a filler mid-sentence', 'Why are there italic words? What does it, uh, mean for the words to be italic?'],
    ['no question mark at the end', 'Why are there italic words? What does it mean for the words to be italic'],
    ['no capital at the start', 'why are there italic words? What does it mean for the words to be italic?'],
    ['the meaning lost', 'Why are there words? What does it mean for the words to be marked?'],
  ])('refuses %s', (_name, question) => {
    expect(answered(question)).not.toEqual([]);
  });
});

// mw-5r3p30.662: read-greek-svennyte-syllables (1 Thessalonians 5:19) named a stand-in clip of 5:16, so a live run could not prove the
// syllables of σβέννυτε. A recording whose name carries a chapter and verse is a reading of that verse: the example's reference says which.
describe('a verse-read recording is a reading of the verse its example names (mw-5r3p30.662)', () => {
  const dir = 'grinds/examples/verse-read';
  const named = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, example: readJson(`${dir}/${f}`) as unknown as GrindExample }))
    .flatMap(({ file, example }) => (example.photos ?? []).map((photo) => ({ file, photo, reference: String((example.request as { reference: string }).reference) })));

  it.each(named)('$file: $photo is a reading of $reference', ({ photo, reference }) => {
    const verse = /(\d+):(\d+)/.exec(reference);
    const inName = /(\d+)-(\d+)(?:-[a-z-]+)?\.webm$/.exec(photo);
    expect(verse, `${reference} carries a chapter and verse`).not.toBeNull();
    expect(inName, `${photo} carries the chapter and verse it reads`).not.toBeNull();
    expect(`${inName?.[1]}:${inName?.[2]}`, `${photo} reads ${reference}`).toBe(`${verse?.[1]}:${verse?.[2]}`);
  });

  it('the Greek 5:19 example has a recording of its own beside it', () => {
    const example = readJson(`${dir}/read-greek-svennyte-syllables.json`) as unknown as GrindExample;
    expect(example.photos).toEqual(['read-1-thess-5-19-el.webm']);
    expect(existsSync(`${dir}/read-1-thess-5-19-el.webm`)).toBe(true);
  });
});
