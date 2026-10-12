// tests/support/settled-offer.ts — the wait of the quiz-goal step 'the offer says "..." and has no buttons' (features/steps/quiz-goal.steps.tsx).
// The 'Just this time' BUTTON carries the very text the settled line shows, so waiting for the text alone passes at once and the
// buttons are still there a moment later on a loaded host (mw-5r3p30.235): the text and the missing buttons are waited for together.
import { waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';

type Wait = (check: () => void) => Promise<unknown>;

/** Resolves once the offer shows `shown` and has no buttons left; `wait` is waitFor (a unit test hands it a single look). */
export async function offerSettled(offer: () => HTMLElement, shown: string, wait: Wait = (check) => waitFor(check)): Promise<void> {
  await wait(() => {
    expect(offer()).toHaveTextContent(shown);
    expect(within(offer()).queryAllByRole('button')).toHaveLength(0);
  });
}
