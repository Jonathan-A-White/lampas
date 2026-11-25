// mw-fnvjof.17.310: Undo on a Talk change row awaits two writes and then clears its busy flag. When the row is gone by then (the sheet closed, a step file's
// environment torn down), React's setState reads `window` and threw 'window is not defined' as an unhandled rejection. The flag is cleared only while mounted.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppliedChange } from '../../src/settings/applied';
import type { TalkTurn } from '../../src/data/repositories';

const gate = vi.hoisted(() => ({ release: undefined as (() => void) | undefined }));

vi.mock('../../src/settings/registry', async (original) => ({
  ...(await original<typeof import('../../src/settings/registry')>()),
  undoChange: () => new Promise<void>((resolve) => void (gate.release = resolve)),
}));
vi.mock('../../src/data/repositories', async (original) => ({
  ...(await original<typeof import('../../src/data/repositories')>()),
  markChangeUndone: () => Promise.resolve(),
}));

import { ChangeRow } from '../../src/Talk';

const change: AppliedChange = { key: 'greekRate', label: 'Greek speed', shown: 'Greek speed 0.8x', from: 1, to: 0.8, undone: false } as unknown as AppliedChange;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Undo on a change row that is gone when its writes finish', () => {
  it('sets no state, so nothing is thrown with the window gone', async () => {
    const rejected: unknown[] = [];
    const onRejected = (reason: unknown) => void rejected.push(reason);
    process.on('unhandledRejection', onRejected);
    render(<ul><ChangeRow turn={{ id: 1 } as TalkTurn} change={change} index={0} /></ul>);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo Greek speed' }));
    expect(gate.release).toBeDefined();
    cleanup(); // the row is gone
    vi.stubGlobal('window', undefined); // and so is the environment's window
    await act(async () => {
      gate.release?.();
      await new Promise((resolve) => setImmediate(resolve));
    });
    vi.unstubAllGlobals();
    process.off('unhandledRejection', onRejected);
    expect(rejected).toEqual([]);
  });
});
