// The requests for another grammar book that wait on the phone (src/data/repositories/bookRequests.ts, src/services/bookRequests.ts):
// the list survives in the settings store, and a send forgets a request when its grist is out, not when the receipt comes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { dropWaitingBook, listAskedBooks, listWaitingBooks, queueBook } from '../../src/data/repositories/bookRequests';
import { keepRequest } from '../../src/data/repositories/requests';

vi.mock('../../src/services/feedback', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/services/feedback')>()), submitFeedback: vi.fn() }));

const { submitFeedback } = await import('../../src/services/feedback');
const { askForBook, bookSending, sendWaitingBooks } = await import('../../src/services/bookRequests');
const { TutorError } = await import('../../src/services/tutor');
const submit = vi.mocked(submitFeedback);

beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.requests.clear()]);
  submit.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('the waiting list', () => {
  it('keeps requests oldest first, trimmed, and forgets one by its id', async () => {
    const first = await queueBook('  Mounce  ', 1000);
    const second = await queueBook('Black', 2000);
    expect((await listWaitingBooks()).map((w) => w.text)).toEqual(['Mounce', 'Black']);
    await dropWaitingBook(first.id);
    expect(await listWaitingBooks()).toEqual([second]);
  });

  it('reads a damaged list as empty', async () => {
    await db.settings.put({ key: 'bookRequestsWaiting', value: '{not json' });
    expect(await listWaitingBooks()).toEqual([]);
  });

  it('lists only the books the mill took, newest first', async () => {
    const row = { app_version: 'v', sentAt: 1 };
    await keepRequest({ txid: 'a', kind: 'grammar-book', text: 'Mounce', ...row });
    await keepRequest({ txid: 'b', kind: 'tutor-ask', summary: 'Olive Tree', ...row });
    await keepRequest({ txid: 'c', kind: 'grammar-book', text: 'Black', ...row, sentAt: 2 });
    expect((await listAskedBooks()).map((r) => r.text)).toEqual(['Black', 'Mounce']);
  });
});

describe('sending', () => {
  it('leaves a request waiting when the mill cannot be reached, with the reason', async () => {
    submit.mockRejectedValue(new TutorError('unreachable', 'down'));
    await askForBook('Mounce');
    expect((await listWaitingBooks()).map((w) => w.text)).toEqual(['Mounce']);
    expect(bookSending()).toEqual({ sending: false, problem: { failure: 'unreachable', detail: 'down' } });
  });

  it('forgets a request once its grist is out, even if the receipt then fails, so it is never sent twice', async () => {
    submit.mockImplementation(async (_, options) => {
      options?.onSent?.();
      throw new TutorError('no-answer', 'no receipt');
    });
    await askForBook('Mounce');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(await listWaitingBooks()).toEqual([]);
    await sendWaitingBooks();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(bookSending().problem).toBeNull();
  });

  it('sends nothing while the phone is offline and everything once it is not', async () => {
    submit.mockImplementation(async (_, options) => options?.onSent?.());
    const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await askForBook('Mounce');
    await askForBook('Black');
    expect(submit).not.toHaveBeenCalled();
    expect(await listWaitingBooks()).toHaveLength(2);
    onLine.mockReturnValue(true);
    await sendWaitingBooks();
    expect(submit.mock.calls.map(([request]) => (request as { text: string }).text)).toEqual(['Mounce', 'Black']);
    expect(await listWaitingBooks()).toEqual([]);
  });

  it('stops at the first that fails, so the order of his asks is kept', async () => {
    submit.mockRejectedValue(new TutorError('unreachable', 'down'));
    await queueBook('Mounce');
    await queueBook('Black');
    await sendWaitingBooks();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(await listWaitingBooks()).toHaveLength(2);
  });
});
