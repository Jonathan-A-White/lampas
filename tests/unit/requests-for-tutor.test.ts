// What the tutor is told of his requests (mw-vy3ghg.6): up to 10 lines {summary, status, version?, setting?, reason?}, the newest first,
// in the bible-talk request; its input schema takes them and the record still fits a grist.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import type { RequestRow } from '../../src/data/db';
import { MAX_TUTOR_REQUESTS, requestsOf } from '../../src/data/requestsForTutor';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const talkSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;

const row = (i: number, more: Partial<RequestRow> = {}): RequestRow => ({ txid: `direct:${i}`, kind: 'tutor-ask', summary: `Idea ${i}`, app_version: '0.1.80', sentAt: 1_780_000_000_000 + i * 1000, status: 'sent', ...more });
const size = (r: object) => new TextEncoder().encode(JSON.stringify(r)).length;

describe('requestsOf', () => {
  it('says each status with what that status carries, and nothing else', () => {
    const lines = requestsOf([
      row(1),
      row(2, { status: 'filed', bead: 'mw-x.1', statusAt: 5 }),
      row(3, { status: 'building' }),
      row(4, { status: 'landed', version: '0.1.86', commit: 'abc', url: 'https://example.org/c' }),
      row(5, { status: 'declined', reason: 'outside what this app is for' }),
      row(6, { status: 'adopted-as-setting', setting: 'Settings > Appearance > Sepia' }),
      row(7, { status: 'built-differently', reason: 'Theme has Sepia now', bead: 'mw-x.7', version: '0.5.9', commit: 'abc' }),
      row(8, { status: 'moved', bead: 'mw-y.8', reason: 'Sepia and Night theme' }),
    ]);
    expect(lines).toEqual([
      { summary: 'Idea 1', status: 'sent' },
      { summary: 'Idea 2', status: 'filed' },
      { summary: 'Idea 3', status: 'building' },
      { summary: 'Idea 4', status: 'landed', version: '0.1.86' },
      { summary: 'Idea 5', status: 'declined', reason: 'outside what this app is for' },
      { summary: 'Idea 6', status: 'adopted-as-setting', setting: 'Settings > Appearance > Sepia' },
      { summary: 'Idea 7', status: 'built-differently', reason: 'Theme has Sepia now' },
      { summary: 'Idea 8', status: 'moved' },
    ]);
  });

  it('keeps the first 10 rows it is given (listRequests gives the newest first)', () => {
    const rows = Array.from({ length: 13 }, (_, i) => row(13 - i));
    expect(MAX_TUTOR_REQUESTS).toBe(10);
    expect(requestsOf(rows).map((r) => r.summary)).toEqual(Array.from({ length: 10 }, (_, i) => `Idea ${13 - i}`));
  });

  it('names a grammar approach by the words he sent, cuts long lines and skips a row with neither', () => {
    const lines = requestsOf([row(1, { kind: 'grammar-approach', summary: undefined, text: 'Teach me\n  the endings   first. ' + 'x'.repeat(300) }), row(2, { summary: undefined })]);
    expect(lines).toHaveLength(1);
    expect(lines[0].summary.startsWith('Teach me the endings first. xxx')).toBe(true);
    expect(lines[0].summary.length).toBeLessThanOrEqual(120);
  });
});

describe('the requests in the Bible talk\'s request', () => {
  const lines = requestsOf([row(2, { status: 'landed', version: '0.1.86' }), row(1, { status: 'adopted-as-setting', setting: 'Sepia theme' })]);

  it('the input schema takes a built-differently line with its reason and a moved line, and refuse a reason on a landed one', () => {
    const more = requestsOf([row(2, { status: 'moved', bead: 'mw-y.8' }), row(1, { status: 'built-differently', reason: 'Theme has Sepia now' })]);
    expect(more).toEqual([{ summary: 'Idea 2', status: 'moved' }, { summary: 'Idea 1', status: 'built-differently', reason: 'Theme has Sepia now' }]);
    const base = { reference: 'Goal', question: 'Q', history: [], solid_words: [], settings: {} };
    expect(validate({ ...base, requests: more }, talkSchema)).toEqual([]);
    expect(validate({ ...base, requests: [{ summary: 'x', status: 'moved', reason: 'r'.repeat(121) }] }, talkSchema)).not.toEqual([]);
  });

  it('bible-talk: buildTalkRequest carries them, and the input schema takes them', () => {
    const scope = { title: 'Romans 8', chapter, verse: null };
    const request = buildTalkRequest(scope, 'What happened to my idea?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, lines);
    expect(request.requests).toEqual(lines);
    expect(validate(request, talkSchema)).toEqual([]);
    expect('requests' in buildTalkRequest(scope, 'Why?', [], [])).toBe(false);
    expect('requests' in buildTalkRequest(scope, 'Why?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [])).toBe(false);
  });

  it('bible-talk: About, whose request is the credits, sends none', () => {
    const scope = { title: 'About', chapter, verse: null, screen: { name: 'About', facts: [], credits: [] } };
    const request = buildTalkRequest(scope, 'Why?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, lines);
    expect('requests' in request).toBe(false);
  });

  it('the schema holds the lines to at most 10 and refuse a line with an unknown key', () => {
    const eleven = Array.from({ length: 11 }, (_, i) => ({ summary: `Idea ${i}`, status: 'sent' }));
    const base = { reference: 'Goal', question: 'Q', history: [], solid_words: [], settings: {} };
    expect(validate({ ...base, requests: eleven.slice(0, 10) }, talkSchema)).toEqual([]);
    expect(validate({ ...base, requests: eleven }, talkSchema)).not.toEqual([]);
    expect(validate({ ...base, requests: [{ summary: 'x', status: 'sent', extra: 1 }] }, talkSchema)).not.toEqual([]);
    expect(validate({ ...base, requests: [{ summary: 'x', status: 'mystery' }] }, talkSchema)).not.toEqual([]);
  });

  it('bible-talk: ten full lines still fit a grist, the oldest lines going last-first when nothing else is left to cut', () => {
    const full = Array.from({ length: 10 }, (_, i) =>
      requestsOf([row(i, { summary: 's'.repeat(300), status: 'declined', reason: 'r'.repeat(500), setting: 'x'.repeat(300), version: 'v'.repeat(80) })])[0],
    );
    const request = buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, full);
    expect(size(fitHistory(request))).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    const crowded = { ...request, settings: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`key${i}`, 'v'.repeat(150)])) };
    const fitted = fitHistory(crowded);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.requests?.length ?? 0).toBeLessThan(10);
    expect(fitted.requests?.[0]).toEqual(full[0]);
  });
});
