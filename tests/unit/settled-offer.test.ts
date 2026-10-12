// tests/unit/settled-offer.test.ts — the quiz-goal step 'the offer says ... and has no buttons' cannot pass on a button's own label (mw-5r3p30.235).
import { describe, expect, it } from 'vitest';
import { offerSettled } from '../support/settled-offer';

/** The offer as Talk.tsx draws it before a choice: a button whose label is the text the settled line will show. */
function offerWithButtons(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<button type="button">Yes, from now on</button><button type="button">Just this time</button>';
  document.body.append(el);
  return el;
}

/** One look at the check, no retry: what a step does when the state it waits for never comes. */
const once = (check: () => void) => Promise.resolve().then(check);

describe('offerSettled', () => {
  it('fails while the buttons are still there, though one of them carries the shown text', async () => {
    const el = offerWithButtons();
    await expect(offerSettled(() => el, 'Just this time', once)).rejects.toThrow();
    el.remove();
  });

  it('keeps waiting through a late replacement of the buttons by the settled line and then passes', async () => {
    const el = offerWithButtons();
    setTimeout(() => {
      el.innerHTML = '<p>Just this time</p>';
    }, 150);
    await offerSettled(() => el, 'Just this time');
    expect(el.querySelectorAll('button')).toHaveLength(0);
    el.remove();
  });

  it('passes when the offer already shows the line and has no buttons', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<p>Kept as your quiz goal</p>';
    document.body.append(el);
    await offerSettled(() => el, 'Kept as your quiz goal');
    el.remove();
  });
});
