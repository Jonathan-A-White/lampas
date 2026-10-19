// tests/unit/alert-in-view.test.ts — the app-wide alert watcher (src/ui/alertInView.ts, mw-5r3p30.600): an element of role alert put into a scrolling box that
// does not show it is brought into view of that box; one already inside it, one in a box that does not scroll and one in the Talk conversation box move nothing.
// jsdom has no layout, so the rectangles are given by hand; the real boxes are proven by tests/e2e/talk-landscape.spec.ts.
import { afterEach, describe, expect, it } from 'vitest';
import { startAlertWatch } from '../../src/ui/alertInView';

const rect = (top: number, bottom: number): DOMRect => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top, toJSON: () => ({}) });

/** A scrolling box 100 px high at the top of the page, scrolled to 0, holding a message at `top`..`bottom`. */
function boxWithAlert(top: number, bottom: number, attributes: Record<string, string> = {}, scrolls = true): { box: HTMLElement; alert: HTMLElement } {
  const box = document.createElement('div');
  box.style.overflowY = 'auto';
  for (const [k, v] of Object.entries(attributes)) box.setAttribute(k, v);
  Object.defineProperty(box, 'scrollHeight', { value: scrolls ? 400 : 100 });
  Object.defineProperty(box, 'clientHeight', { value: 100 });
  box.getBoundingClientRect = () => rect(0, 100);
  box.scrollTop = 0;
  document.body.append(box);
  const alert = document.createElement('div');
  alert.setAttribute('role', 'alert');
  alert.getBoundingClientRect = () => rect(top, bottom);
  return { box, alert };
}

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  document.body.replaceChildren();
});

/** Puts the alert in its box and lets the watcher hear it. */
async function appear(box: HTMLElement, alert: HTMLElement): Promise<void> {
  stop = startAlertWatch();
  box.append(alert);
  await Promise.resolve();
}

describe('the alert watcher', () => {
  it('scrolls a message that appears under the fold of its box', async () => {
    const { box, alert } = boxWithAlert(150, 190);
    await appear(box, alert);
    expect(box.scrollTop).toBeGreaterThan(0);
  });

  it('scrolls a message that appears above the top of its box', async () => {
    const { box, alert } = boxWithAlert(-60, -20);
    box.scrollTop = 200;
    await appear(box, alert);
    expect(box.scrollTop).toBeLessThan(200);
  });

  it('moves nothing for a message already inside the box', async () => {
    const { box, alert } = boxWithAlert(20, 60);
    await appear(box, alert);
    expect(box.scrollTop).toBe(0);
  });

  it('moves nothing in a box that does not scroll', async () => {
    const { box, alert } = boxWithAlert(150, 190, {}, false);
    await appear(box, alert);
    expect(box.scrollTop).toBe(0);
  });

  it('leaves the Talk conversation box to the Talk sheet', async () => {
    const { box, alert } = boxWithAlert(150, 190, { 'data-talk-list': '' });
    await appear(box, alert);
    expect(box.scrollTop).toBe(0);
  });

  it('finds a message inside a block that is put in whole', async () => {
    const { box, alert } = boxWithAlert(150, 190);
    const wrap = document.createElement('section');
    wrap.append(alert);
    await appear(box, wrap);
    expect(box.scrollTop).toBeGreaterThan(0);
  });

  it('scrolls a div that becomes a message by taking the role (a pending card that turns into a failure)', async () => {
    const { box, alert } = boxWithAlert(150, 190);
    alert.removeAttribute('role');
    box.append(alert);
    stop = startAlertWatch();
    alert.setAttribute('role', 'alert');
    await Promise.resolve();
    expect(box.scrollTop).toBeGreaterThan(0);
  });

  it('scrolls a message whose words are put into it after it is drawn', async () => {
    const { box, alert } = boxWithAlert(150, 190);
    box.append(alert);
    stop = startAlertWatch();
    alert.append(document.createElement('p'));
    await Promise.resolve();
    expect(box.scrollTop).toBeGreaterThan(0);
  });

  it('shows the buttons set right under the message too, the message first when both do not fit', async () => {
    const { box, alert } = boxWithAlert(40, 80);
    const retry = document.createElement('button');
    retry.getBoundingClientRect = () => rect(90, 140);
    box.append(retry);
    await appear(box, alert);
    box.insertBefore(alert, retry);
    await Promise.resolve();
    // the button's foot at 140 is 48 px past the box's 100 with its gap, but the message's top at 40 stays in the box: 32 px is all it can go
    expect(box.scrollTop).toBe(32);
  });
});
