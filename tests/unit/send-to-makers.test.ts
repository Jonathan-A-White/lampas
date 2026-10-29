// tests/unit/send-to-makers.test.ts — ONE function sends a request to the makers from a tutor talk (mw-5r3p30.760, src/talk/makers.ts sendToMakers): the tutor's own offer
// (offers.ts sendMakersOffer, taken by a tap or a yes) calls it; the Talk sheet and the Verse view's Ask have no 'Send to the makers' button (mw-5r3p30.844). It is submitFeedback with a tutor-ask request and the pictures as files.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { db } from '../../src/data/db';
import { addTurn, getTurn } from '../../src/data/repositories';
import * as feedback from '../../src/services/feedback';
import type { TalkScope } from '../../src/services/talk';
import * as makers from '../../src/talk/makers';
import { sendMakersOffer } from '../../src/talk/offers';

vi.mock('../../src/services/feedback', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/services/feedback')>()), submitFeedback: vi.fn(async () => undefined) }));
vi.mock('../../src/talk/makers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/talk/makers')>();
  return { ...actual, sendToMakers: vi.fn(actual.sendToMakers) };
});

const picture = { bytes: new Uint8Array([255, 216, 255, 1]), mime: 'image/jpeg', name: 'picture-1.jpg' };

describe('sendToMakers', () => {
  beforeEach(() => {
    vi.mocked(feedback.submitFeedback).mockClear();
    vi.mocked(makers.sendToMakers).mockClear();
  });

  it('files a tutor-ask request with the pictures as the grist files', async () => {
    await makers.sendToMakers({ text: ' A Greek keyboard ', summary: 'He wants a keyboard.', screen: 'Reader', reference: 'Romans 8', pictures: [picture] });
    const [request, options] = vi.mocked(feedback.submitFeedback).mock.calls[0];
    expect(request).toMatchObject({ kind: 'tutor-ask', text: 'A Greek keyboard', summary: 'He wants a keyboard.', screen: 'Reader', reference: 'Romans 8' });
    expect(options?.files).toEqual([picture]);
  });

  it('sends no files when there are no pictures', async () => {
    await makers.sendToMakers({ text: 'Hello', summary: 'Hello', screen: 'Reader', reference: 'Romans 8' });
    expect(vi.mocked(feedback.submitFeedback).mock.calls[0][1]?.files).toEqual([]);
  });
});

describe('the tutor offer goes through sendToMakers', () => {
  afterAll(() => db.close());
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.talks.clear(), db.talkPictures.clear()]);
    vi.mocked(makers.sendToMakers).mockClear();
  });

  it('is one call of the shared function with the turn\'s words, summary, screen, reference and pictures', async () => {
    const scope = { title: 'Goal', screen: { name: 'Goal', facts: [{ label: 'Goal', value: 'Read Romans' }] } } as unknown as TalkScope;
    const id = await addTurn('goal', 'Add a keyboard?', 'No.', [], Date.now(), { changes: [], refused: [], pictures: [picture] });
    await db.talks.update(id, { feedbackOffer: 'He wants a Greek keyboard.' });
    await sendMakersOffer((await getTurn(id))!, scope);
    expect(makers.sendToMakers).toHaveBeenCalledTimes(1);
    expect(vi.mocked(makers.sendToMakers).mock.calls[0][0]).toMatchObject({
      text: 'Add a keyboard?',
      summary: 'He wants a Greek keyboard.',
      screen: 'Goal',
      reference: 'Goal',
      facts: [{ label: 'Goal', value: 'Read Romans' }],
      pictures: [{ mime: 'image/jpeg', name: 'picture-1.jpg' }],
    });
  });

  it('is the only way to the makers from the Talk sheet and the Verse view\'s Ask: neither calls it, and neither draws a Send to the makers button', () => {
    for (const file of ['src/Talk.tsx', 'src/Ask.tsx', 'src/VerseView.tsx']) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/\bsendToMakers\b|Send to the makers|SendToMakers/);
    }
    for (const file of ['src/talk/SendToMakers.tsx', 'src/talk/useSendToMakers.ts']) expect(existsSync(file), file).toBe(false);
    expect(readFileSync('src/Talk.tsx', 'utf8')).toMatch(/\bsendMakersOffer\b/);
  });
});
