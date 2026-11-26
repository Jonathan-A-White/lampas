// mw-fnvjof.17.328: Send this to the makers awaits sendMakersOffer; when it rejects after the offer is gone (the sheet closed, a step file's environment torn
// down), the catch set the failure state and React's setState read `window`, an unhandled 'window is not defined'. The failure is set only while mounted.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TalkTurn } from '../../src/data/repositories';
import type { TalkScope } from '../../src/services/talk';

const gate = vi.hoisted(() => ({ fail: undefined as ((error: Error) => void) | undefined }));

vi.mock('../../src/talk/offers', async (original) => ({
  ...(await original<typeof import('../../src/talk/offers')>()),
  sendMakersOffer: () => new Promise<void>((_resolve, reject) => void (gate.fail = reject)),
}));

import { FeedbackOffer } from '../../src/Talk';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Send this to the makers, when the offer is gone as the send fails', () => {
  it('sets no state, so nothing is thrown with the window gone', async () => {
    const rejected: unknown[] = [];
    const onRejected = (reason: unknown) => void rejected.push(reason);
    process.on('unhandledRejection', onRejected);
    const turn = { id: 1, feedbackOffer: 'He wants a keyboard.' } as unknown as TalkTurn;
    render(<FeedbackOffer turn={turn} scope={{} as TalkScope} onLeave={() => undefined} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Send this to the makers' }));
    expect(gate.fail).toBeDefined();
    cleanup(); // the offer is gone
    vi.stubGlobal('window', undefined); // and so is the environment's window
    await act(async () => {
      gate.fail?.(new Error('offline'));
      await new Promise((resolve) => setImmediate(resolve));
    });
    vi.unstubAllGlobals();
    process.off('unhandledRejection', onRejected);
    expect(rejected).toEqual([]);
  });
});
