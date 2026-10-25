// tests/unit/makers-offer-pictures.test.ts — 'Send this to the makers' carries the pictures he attached in the talk (mw-5r3p30.759): the tutor-ask request
// goes to submitFeedback with the turn's kept pictures as files; a turn with none sends as it always did.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { addTurn, getTurn } from '../../src/data/repositories';
import { sendMakersOffer } from '../../src/talk/offers';
import type { TalkScope } from '../../src/services/talk';
import * as feedback from '../../src/services/feedback';

vi.mock('../../src/services/feedback', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/services/feedback')>()), submitFeedback: vi.fn(async () => undefined) }));

const scope = { title: 'Goal', screen: { name: 'Goal', facts: [] } } as unknown as TalkScope;
const picture = { bytes: new Uint8Array([255, 216, 255, 1, 2, 3]), mime: 'image/jpeg', name: 'picture-1.jpg' };

/** A turn that offers the makers the summary, kept with `pictures`. */
async function offerTurn(pictures: (typeof picture)[]) {
  const id = await addTurn('goal', 'Can you add a keyboard?', 'No.', [], Date.now(), { changes: [], refused: [], pictures });
  await db.talks.update(id, { feedbackOffer: 'He wants a Greek keyboard.' });
  return (await getTurn(id))!;
}

describe('the makers offer carries the talk pictures', () => {
  afterAll(() => db.close());
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.talks.clear(), db.talkPictures.clear()]);
    vi.mocked(feedback.submitFeedback).mockClear();
  });

  it('sends a tutor-ask with the one picture attached to the turn', async () => {
    const turn = await offerTurn([picture]);
    await sendMakersOffer(turn, scope);
    expect(feedback.submitFeedback).toHaveBeenCalledTimes(1);
    const [request, options] = vi.mocked(feedback.submitFeedback).mock.calls[0];
    expect(request).toMatchObject({ kind: 'tutor-ask', text: 'Can you add a keyboard?', summary: 'He wants a Greek keyboard.' });
    expect(options?.files).toHaveLength(1);
    expect(options?.files?.[0]).toMatchObject({ mime: 'image/jpeg', name: 'picture-1.jpg' });
    expect(Array.from(options?.files?.[0].bytes ?? [])).toEqual(Array.from(picture.bytes));
  });

  it('sends a talk with no picture with no files, as before', async () => {
    const turn = await offerTurn([]);
    await sendMakersOffer(turn, scope);
    expect(feedback.submitFeedback).toHaveBeenCalledTimes(1);
    expect(vi.mocked(feedback.submitFeedback).mock.calls[0][1]?.files ?? []).toEqual([]);
  });
});
