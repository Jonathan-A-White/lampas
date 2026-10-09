// The feedback grind (grinds/feedback.json) is read by the mill, not by this app: it is a forwarding grind ("forward": "mayor": no
// model session, the mill mails the grist to the Mayor and answers {"status":"sent"}), takes up to four images (bsv-kit's cap on
// the files of one grist), and its input schema agrees with buildFeedbackRequest, the code the phone runs; isFeedbackAnswer reads
// the mill's own answer. A request with the longest text fits the grist's record cap.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PrivateKey, Utils } from '@bsv/sdk';
import { grist } from 'bsv-kit/grist';
import { MAX_CREDIT_NAME, MAX_CREDIT_URL, MAX_FEEDBACK_CHARS, MAX_PICTURES, buildFeedbackRequest, isFeedbackAnswer } from '../../src/services/feedback';
import { MILL_PUBLIC_KEY } from '../support/fake-postern';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/feedback.json');
const input = readJson('grinds/feedback.input.schema.json');

describe('grinds/feedback.json', () => {
  it('forwards to the Mayor: no model, effort, instructions or answer schema', () => {
    expect(grind).toEqual({
      grind: 1,
      app: 'lampas',
      kind: 'feedback',
      versions: ['1'],
      forward: 'mayor',
      attachments: { min: 0, max: grist.MAX_PHOTOS, mime: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 8388608 },
    });
    for (const key of ['model', 'effort', 'instructions', 'answerSchema']) expect(grind).not.toHaveProperty(key);
  });

  it('takes up to as many images as a grist may carry, and the constant is that number', () => {
    expect(grind.attachments).toEqual({ min: 0, max: grist.MAX_PHOTOS, mime: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 8388608 });
    expect(MAX_PICTURES).toBe(grist.MAX_PHOTOS);
  });
});

describe('the input schema and buildFeedbackRequest', () => {
  const good = { text: 'Teach the cases with colours.', name: 'Anna Example', url: 'https://example.org/greek' };

  it('builds a request the schema accepts, with and without a link', () => {
    const withLink = buildFeedbackRequest(good.text, good.name, good.url);
    expect(withLink).toMatchObject({ kind: 'grammar-approach', text: good.text, credit: { name: good.name, url: good.url } });
    expect(validate(withLink, input as Schema)).toEqual([]);
    const without = buildFeedbackRequest(good.text, good.name, '  ');
    expect(without.credit).toEqual({ name: good.name });
    expect(validate(without, input as Schema)).toEqual([]);
  });

  it('trims the text and the name, and adds https:// to a link written without one', () => {
    const request = buildFeedbackRequest('  Colours.  ', '  Anna  ', ' example.org/greek ');
    expect(request.text).toBe('Colours.');
    expect(request.credit).toEqual({ name: 'Anna', url: 'https://example.org/greek' });
  });

  it('carries the build the app is, and the limits of the schema are the constants', () => {
    expect(buildFeedbackRequest('x', 'y').app_version).toBe(__APP_VERSION__);
    const props = (input as { properties: Record<string, { maxLength: number; properties?: Record<string, { maxLength: number }> }> }).properties;
    expect(props.text.maxLength).toBe(MAX_FEEDBACK_CHARS);
    expect(props.credit.properties?.name.maxLength).toBe(MAX_CREDIT_NAME);
    expect(props.credit.properties?.url.maxLength).toBe(MAX_CREDIT_URL);
  });

  it.each<[string, unknown]>([
    ['an unknown kind', { kind: 'bug', text: 'x', credit: { name: 'y' }, app_version: 'v' }],
    ['no credit', { kind: 'grammar-approach', text: 'x', app_version: 'v' }],
    ['an empty credit name', { kind: 'grammar-approach', text: 'x', credit: { name: '' }, app_version: 'v' }],
    ['a text over 1200 characters', { kind: 'grammar-approach', text: 'x'.repeat(1201), credit: { name: 'y' }, app_version: 'v' }],
    ['an extra key', { kind: 'grammar-approach', text: 'x', credit: { name: 'y' }, app_version: 'v', extra: 1 }],
  ])('refuses %s', (_, value) => {
    expect(validate(value, input as Schema)).not.toEqual([]);
  });

  it('fits the grist record cap with a 1200-character Greek text, the longest credit and four attachments', () => {
    const request = buildFeedbackRequest('α'.repeat(1200), 'ω'.repeat(MAX_CREDIT_NAME), 'https://example.org/' + 'a'.repeat(MAX_CREDIT_URL - 20));
    expect(request.text).toHaveLength(1200);
    expect(request.credit.url).toHaveLength(MAX_CREDIT_URL);
    const attachments = Array.from({ length: MAX_PICTURES }, (_, i) => ({ hash: '0'.repeat(64), size: 99_999_999, mime: 'image/jpeg', name: `picture-${i + 1}.jpg` }));
    const plaintext = { grist: { app: 'lampas', kind: 'feedback', v: '1' }, input: request, attachments };
    const key = Uint8Array.from(Utils.toArray(PrivateKey.fromRandom().toHex(), 'hex'));
    const envelope = grist.sealEnvelope(JSON.stringify(plaintext), key, MILL_PUBLIC_KEY, 1_790_000_000);
    expect(() => grist.recordScriptHex(envelope)).not.toThrow();
  });
});

describe('isFeedbackAnswer', () => {
  it("accepts the mill's forward answer {status: 'sent'}", () => {
    expect(isFeedbackAnswer({ status: 'sent' })).toBe(true);
  });

  it.each<[string, unknown]>([
    ['nothing', undefined],
    ['no status', {}],
    ['another status', { status: 'refused' }],
    ['an extra key', { status: 'sent', extra: 1 }],
    ['the old model answer', { received: true }],
  ])('refuses %s', (_, value) => {
    expect(isFeedbackAnswer(value)).toBe(false);
  });
});
