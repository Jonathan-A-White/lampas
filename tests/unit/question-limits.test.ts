// The limits on what he types or speaks, swept (mw-5r3p30.601, folding mw-5r3p30.440 .462 .463 .464): for every grind the app's own limit, the input schema's
// maxLength and the answer check agree, and three minutes of speech (3,000 characters, about 20,480 bytes' share of a request) still seals; and no text box
// of the app cuts a paste silently (a box with a maxLength is a LimitedInput or LimitedTextarea, which says what it cut).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrivateKey, Utils } from '@bsv/sdk';
import { grist } from 'bsv-kit/grist';
import { type Chapter } from '../../src/data/chapter';
import { MAX_ASKED_CHARS, MAX_FEEDBACK_CHARS, buildTutorAskRequest } from '../../src/services/feedback';
import { MAX_QUESTION_CHARS, MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { MAX_TALK_CHARS, buildTalkRequest, fitHistory, isTalkAnswer } from '../../src/services/talk';
import { buildRequest, fitAsk, isVerseAnswer } from '../../src/services/tutor';
import { MILL_PUBLIC_KEY } from '../support/fake-postern';
import { longQuestion } from '../support/long-text';
import { validate, type Schema } from '../support/schema-validate';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse = chapter.verses[27];
const scope = { title: 'Romans 8', chapter, verse };
const readSchema = (file: string): Schema & { properties: Record<string, { maxLength?: number }> } => JSON.parse(readFileSync(`grinds/${file}`, 'utf8')) as never;

/** The payload cap of a grist record (bsv-kit grist MAX_PAYLOAD_BYTES): 20 KiB. */
const PAYLOAD_CAP = 20480;

/** What the phone's send does with a request: seal it to the mill and write the record; the sealed payload's size comes back, a RangeError (over the cap) throws. */
function sealedBytes(kind: string, input: unknown): number {
  const plaintext = { grist: { app: 'lampas', kind, v: '1' }, input, attachments: [] };
  const key = Uint8Array.from(Utils.toArray(PrivateKey.fromRandom().toHex(), 'hex'));
  const envelope = grist.sealEnvelope(JSON.stringify(plaintext), key, MILL_PUBLIC_KEY, 1_790_000_000);
  grist.recordScriptHex(envelope);
  return JSON.stringify(envelope).length;
}

const SPEECH = longQuestion(3000);

describe('the limits of every grind', () => {
  it('the question limit is one number: 4000, in Talk and in Ask', () => {
    expect([MAX_QUESTION_CHARS, MAX_TALK_CHARS, MAX_ASKED_CHARS]).toEqual([4000, 4000, 4000]);
    expect(MAX_REQUEST_BYTES).toBeLessThan(PAYLOAD_CAP);
  });

  it('bible-talk: the app limit, the input schema and the answer check agree, and 3,000 characters of speech seal', () => {
    expect(readSchema('bible-talk.input.schema.json').properties.question.maxLength).toBe(MAX_TALK_CHARS);
    expect(readSchema('bible-talk.answer.schema.json').properties.question.maxLength).toBe(MAX_TALK_CHARS);
    const answer = { answer: 'a', words: [], question: 'q'.repeat(MAX_TALK_CHARS) };
    expect(isTalkAnswer(answer)).toBe(true);
    expect(isTalkAnswer({ ...answer, question: 'q'.repeat(MAX_TALK_CHARS + 1) })).toBe(false);
    const request = fitHistory(buildTalkRequest(scope, SPEECH, [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, true));
    expect(request.question).toBe(SPEECH);
    expect(validate(request, readSchema('bible-talk.input.schema.json'))).toEqual([]);
    expect(sealedBytes('bible-talk', request)).toBeLessThanOrEqual(PAYLOAD_CAP);
  });

  it('verse-ask: the app limit, the input schema and the answer check agree, and 3,000 characters of speech seal', () => {
    expect(readSchema('verse-ask.input.schema.json').properties.question.maxLength).toBe(MAX_QUESTION_CHARS);
    expect(readSchema('verse-ask.answer.schema.json').properties.question.maxLength).toBe(MAX_QUESTION_CHARS);
    const answer = { answer: 'a', words: [], question: 'q'.repeat(MAX_QUESTION_CHARS) };
    expect(isVerseAnswer(answer)).toBe(true);
    expect(isVerseAnswer({ ...answer, question: 'q'.repeat(MAX_QUESTION_CHARS + 1) })).toBe(false);
    const request = fitAsk(buildRequest('Romans 8:28', verse, SPEECH, [], undefined, undefined, undefined, [], undefined, true));
    expect(request.question).toBe(SPEECH);
    expect(validate(request, readSchema('verse-ask.input.schema.json'))).toEqual([]);
    expect(sealedBytes('verse-ask', request)).toBeLessThanOrEqual(PAYLOAD_CAP);
  });

  // 'Send this to the makers' sends the question he asked the tutor, whole: it was 1200 here while a question could be 4000, and the mill refused a long one
  it('feedback: the tutor-ask text takes a whole question, as long as the tutor takes one, and 3,000 characters of speech seal; the other texts keep their own limits', () => {
    const input = readSchema('feedback.input.schema.json') as unknown as { anyOf: { properties: Record<string, { maxLength?: number; enum?: string[] }> }[] };
    const branch = (kind: string) => input.anyOf.find((b) => b.properties.kind.enum?.includes(kind))?.properties as Record<string, { maxLength?: number }>;
    expect(branch('tutor-ask').text.maxLength).toBe(MAX_ASKED_CHARS);
    expect(branch('grammar-approach').text.maxLength).toBe(MAX_FEEDBACK_CHARS);
    for (const text of [SPEECH, longQuestion(MAX_QUESTION_CHARS)]) {
      const request = buildTutorAskRequest({ text, summary: 'He asked for a thing the app lacks.', screen: 'Reader', reference: 'Romans 8:28' });
      expect(request.text).toBe(text);
      expect(validate(request, input as unknown as Schema)).toEqual([]);
      expect(sealedBytes('feedback', request)).toBeLessThanOrEqual(PAYLOAD_CAP);
    }
    expect(validate({ kind: 'tutor-ask', text: 'x'.repeat(MAX_QUESTION_CHARS + 1), summary: 's', screen: 'Reader', reference: 'r', app_version: 'v' }, input as unknown as Schema)).not.toEqual([]);
  });

  // the grinds that take nothing he types or says as a question: their fields are the app's own (a reference, a language, counts, the settings)
  it.each(['verse-read', 'tips', 'drill-items', 'find-refs', 'audible-position'])('%s: takes no question or text of his, so there is no limit of his to meet', (kind) => {
    const properties = Object.keys(readSchema(`${kind}.input.schema.json`).properties);
    expect(properties.filter((name) => /^(question|text|message|transcript)$/.test(name))).toEqual([]);
  });
});

describe('no text box cuts a paste without saying so', () => {
  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(join(dir, e.name)) : /\.tsx$/.test(e.name) ? [join(dir, e.name)] : []));

  /** The opening tags of every raw <input> and <textarea> in `source`, to the end of the tag (the braces of its props kept whole). */
  const tags = (source: string): string[] =>
    [...source.matchAll(/<(input|textarea)\b/g)].map((m) => {
      let depth = 0;
      let i = (m.index ?? 0) + m[0].length;
      for (; i < source.length; i++) {
        const c = source[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0 && source[i - 1] !== '=') break;
      }
      return source.slice(m.index, i + 1);
    });

  it('every <input> or <textarea> with a maxLength is a LimitedInput or LimitedTextarea (src/ui/LimitedField.tsx)', () => {
    const raw = sources('src').filter((file) => !file.endsWith('LimitedField.tsx')).flatMap((file) => tags(readFileSync(file, 'utf8')).filter((tag) => /\bmaxLength=/.test(tag)).map((tag) => `${file}: ${tag.slice(0, 60)}`));
    expect(raw).toEqual([]);
  });

  it('finds the boxes it is meant to: the Limited ones are used', () => {
    const used = sources('src').filter((file) => /<Limited(Input|Textarea)\b/.test(readFileSync(file, 'utf8')));
    expect(used.length).toBeGreaterThanOrEqual(9);
  });
});
