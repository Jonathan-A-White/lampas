// tests/unit/feedback-duplicate.test.ts — the kit's three outcomes of filing a tutor-ask (pwa-kit/requests fileFromTalk): 'sent', 'duplicate' (the same words were filed today,
// nothing is sent) and 'refused'. Only the first is a send: a duplicate or a refusal throws a TutorError that says why, announces nothing and calls the mill for nothing (mw-5r3p30.886).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALREADY_SENT_MESSAGE, buildTutorAskRequest, submitFeedback } from '../../src/services/feedback';
import { TutorError } from '../../src/services/tutor';
import { subscribe } from '../../src/events/bus';

const kit = vi.hoisted(() => ({ answer: undefined as unknown }));
vi.mock('pwa-kit/requests', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pwa-kit/requests')>();
  return { ...actual, createRequests: () => ({ fileFromTalk: vi.fn(async () => kit.answer) }) };
});

const ask = buildTutorAskRequest({ text: 'Can this work with Olive Tree?', summary: 'He wants Olive Tree.', screen: 'Reader', reference: 'John 1' });
const record = { id: 'direct:aa', kind: 'tutor-ask', words: ask.text, summary: ask.summary, talkId: 't', who: 'grown-up', sentAt: 1, day: '1970-01-01', status: 'sent' };

describe('submitFeedback and the kit’s outcomes', () => {
  const heard: string[] = [];
  beforeEach(() => {
    heard.length = 0;
    return subscribe('feedback-sent', (event) => void heard.push(event.feedback));
  });

  it('tells him a twin was already sent, and does not count it as sent now', async () => {
    kit.answer = { outcome: 'duplicate', record };
    const error = await submitFeedback(ask).then(() => undefined, (e: unknown) => e);
    expect(error).toBeInstanceOf(TutorError);
    expect((error as TutorError).message).toBe(ALREADY_SENT_MESSAGE);
    expect(heard).toEqual([]);
  });

  it('still refuses with the kit’s own message', async () => {
    kit.answer = { outcome: 'refused', reason: 'empty', message: 'Say something first.' };
    await expect(submitFeedback(ask)).rejects.toMatchObject({ message: 'Say something first.' });
  });

  it('settles on a sent outcome', async () => {
    kit.answer = { outcome: 'sent', record };
    await expect(submitFeedback(ask)).resolves.toBeUndefined();
  });
});
