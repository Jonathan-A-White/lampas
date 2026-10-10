// The pictures of a tutor talk (mw-y3qno5.1): what the grind takes and tells the tutor, what the request says, how a picture is cut down on the phone, how a
// turn keeps its pictures, and how a Greek word of an answer is marked. The screens are features/talk-pictures.feature.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { db } from '../../src/data/db';
import { addTurn, listTurnPictures, listTurns } from '../../src/data/repositories';
import { imageSeam, shrinkImage } from '../../src/images/shrink';
import { buildTalkRequest, type TalkScope } from '../../src/services/talk';
import { dataUrlOf, filesOf, isTalkPicture, PICTURE_ONLY_QUESTION, TALK_MAX_EDGE, TALK_MAX_PICTURES, TALK_PICTURE_MAX_BYTES, TALK_PICTURE_MIMES } from '../../src/talk/pictures';
import { validate, type Schema } from '../support/schema-validate';
import { remarkScripts } from '../../src/markdown/scriptRuns';

afterAll(() => db.close());

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/bible-talk.json') as { attachments: { min: number; max: number; mime: string[]; maxBytes: number } };
const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
const instructions = readFileSync('grinds/bible-talk.instructions.md', 'utf8');

const scope: TalkScope = { title: 'Goal', chapter: { verses: [] } as never, verse: null, screen: { name: 'Goal', facts: [] } };

describe('the bible-talk grind takes pictures', () => {
  it('takes 0 to 4 JPEG, PNG or WebP files, the size and kinds the app sends', () => {
    expect(grind.attachments).toEqual({ min: 0, max: TALK_MAX_PICTURES, mime: [...TALK_PICTURE_MIMES], maxBytes: TALK_PICTURE_MAX_BYTES });
    expect(TALK_MAX_PICTURES).toBe(4);
    expect(TALK_PICTURE_MIMES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    expect(isTalkPicture({ type: 'image/webp' })).toBe(true);
    expect(isTalkPicture({ type: 'image/gif' })).toBe(false);
    expect(isTalkPicture({ type: 'application/pdf' })).toBe(false);
  });

  it('tells the tutor to read the text in the pictures and to quote the words it discusses as plain text', () => {
    expect(instructions).toContain('`pictures`');
    expect(instructions).toContain('## Pictures he sends');
    const section = instructions.slice(instructions.indexOf('## Pictures he sends'), instructions.indexOf('## Helping him fill in a form'));
    expect(section).toMatch(/Read the text in each picture: Greek, Hebrew or English/);
    expect(section).toMatch(/Quote every Greek or Hebrew word your answer discusses as plain text/);
    expect(section).toMatch(/never only describe a word/);
    expect(section).toContain(PICTURE_ONLY_QUESTION);
    expect(section).toMatch(/lexicon entry/);
  });

  it('has a request field for how many pictures came, 1 to 4, and nothing for none', () => {
    const base = buildTalkRequest(scope, 'What does this say?', [], []);
    expect(validate(base, input)).toEqual([]);
    expect('pictures' in base).toBe(false);
    for (const n of [1, 4]) {
      const request = buildTalkRequest(scope, 'What does this say?', [], [], {}, undefined, undefined, undefined, [], [], n);
      expect(request.pictures).toBe(n);
      expect(validate(request, input)).toEqual([]);
    }
    expect(validate({ ...base, pictures: 5 }, input)).not.toEqual([]);
    expect(validate({ ...base, pictures: 0 }, input)).not.toEqual([]);
  });

  it('draws a picture by a data URL, whatever its size', () => {
    expect(dataUrlOf(new Uint8Array([1, 2, 3]), 'image/jpeg')).toBe('data:image/jpeg;base64,AQID');
    const big = new Uint8Array(100_000).fill(65);
    expect(atob(dataUrlOf(big, 'image/png').split(',')[1])).toBe('A'.repeat(100_000));
  });

  it('sends the pictures as the grist files with their type and name', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(filesOf([{ bytes, mime: 'image/jpeg', name: 'picture-1.jpg' }])).toEqual([{ bytes, mime: 'image/jpeg', name: 'picture-1.jpg' }]);
  });
});

describe('shrinkImage with the talk limits', () => {
  const real = { ...imageSeam };
  afterAll(() => Object.assign(imageSeam, real));

  it('cuts a 4000 x 3000 picture to 1600 x 1200 and keeps the shape', async () => {
    const drawn: { width: number; height: number }[] = [];
    imageSeam.decode = async () => ({ width: 4000, height: 3000, source: null });
    imageSeam.encode = async (_d, width, height) => {
      drawn.push({ width, height });
      return new Blob([new Uint8Array(1000)], { type: 'image/jpeg' });
    };
    await shrinkImage(new Blob(['x']), { maxEdge: TALK_MAX_EDGE, maxBytes: TALK_PICTURE_MAX_BYTES });
    expect(drawn[0]).toEqual({ width: 1600, height: 1200 });
  });

  it('lowers the quality, then the size, until the picture is under the byte limit', async () => {
    const drawn: { width: number; quality: number }[] = [];
    imageSeam.decode = async () => ({ width: 2000, height: 1000, source: null });
    imageSeam.encode = async (_d, width, _h, quality) => {
      drawn.push({ width, quality });
      // big until the width is under 1500
      return new Blob([new Uint8Array(width > 1500 ? TALK_PICTURE_MAX_BYTES + 1 : 1000)], { type: 'image/jpeg' });
    };
    const out = await shrinkImage(new Blob(['x']), { maxEdge: TALK_MAX_EDGE, maxBytes: TALK_PICTURE_MAX_BYTES });
    expect(out.size).toBe(1000);
    expect(drawn.every((d) => d.width <= TALK_MAX_EDGE)).toBe(true);
    expect(Math.min(...drawn.map((d) => d.width))).toBeLessThan(1500);
  });
});

describe('a turn keeps its pictures', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.talks.clear(), db.talkPictures.clear()]);
  });

  it('writes them in the order they were sent and reads them back with their type and name', async () => {
    const id = await addTurn('rom.8', 'What is this?', 'A lexicon entry.', [], 1000, {
      changes: [],
      refused: [],
      pictures: [
        { bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg', name: 'picture-1.jpg' },
        { bytes: new Uint8Array([9, 8]), mime: 'image/jpeg', name: 'picture-2.jpg' },
      ],
    });
    const kept = await listTurnPictures(id);
    expect(kept.map((p) => [p.place, p.mime, p.name, Array.from(new Uint8Array(p.bytes))])).toEqual([
      [0, 'image/jpeg', 'picture-1.jpg', [1, 2, 3]],
      [1, 'image/jpeg', 'picture-2.jpg', [9, 8]],
    ]);
    expect(kept.every((p) => p.turnId === id)).toBe(true);
    // the turn itself does not carry the bytes: the talk loads fast
    expect((await listTurns('rom.8'))[0]).not.toHaveProperty('pictures');
  });

  it('keeps none for a turn with none, and each turn its own', async () => {
    const a = await addTurn('rom.8', 'q', 'a', [], 1, { changes: [], refused: [] });
    const b = await addTurn('rom.8', 'q2', 'a2', [], 2, { changes: [], refused: [], pictures: [{ bytes: new Uint8Array([5]), mime: 'image/png', name: 'picture-1.jpg' }] });
    expect(await listTurnPictures(a)).toEqual([]);
    expect(await listTurnPictures(b)).toHaveLength(1);
  });
});

describe('the Greek of an answer is marked as words', () => {
  type Node = { type: string; value?: string; children?: Node[]; data?: { hProperties: Record<string, unknown> } };
  const run = (children: Node[]): Node => {
    const tree: Node = { type: 'root', children: [{ type: 'paragraph', children }] };
    remarkScripts()(tree as never);
    return tree;
  };
  const kinds = (tree: Node): string[] => (tree.children?.[0].children ?? []).map((n) => (n.type === 'script' ? `${n.data?.hProperties.lang}:${n.children?.[0].value}` : `text:${n.value}`));

  it('wraps a Greek stretch, with its phrase kept together, and leaves the English', () => {
    expect(kinds(run([{ type: 'text', value: 'The entry for δακρύω and ἐδάκρυσεν ὁ Ἰησοῦς, “wept”.' }]))).toEqual(['text:The entry for ', 'grc:δακρύω', 'text: and ', 'grc:ἐδάκρυσεν ὁ Ἰησοῦς', 'text:, “wept”.']);
  });

  it('keeps Hebrew as it was and leaves Greek in a link as text', () => {
    expect(kinds(run([{ type: 'text', value: 'צֶדֶק and δίκη' }]))).toEqual(['he:צֶדֶק', 'text: and ', 'grc:δίκη']);
    const linked: Node = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'link', children: [{ type: 'text', value: 'see δίκη' }] }] }] };
    remarkScripts()(linked as never);
    expect(linked.children?.[0].children?.[0].children?.map((n) => n.type)).toEqual(['text']);
  });

  it('does not take a lone combining accent on a Latin letter for Greek', () => {
    expect(kinds(run([{ type: 'text', value: 'café' }]))).toEqual(['text:café']);
  });
});
