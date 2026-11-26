// The new-answer screen-reader announcement says the answer as shown, not as stored (mw-fnvjof.17.337). The stored turn can say linksUndrawn (the sheet's Turn kept it), and the
// live region must then not hold the sentence that points at a link that is not drawn: announcedAnswer (src/talk/drawnLinks.ts, used by src/Talk.tsx) waits for the chips.
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { TalkTurn } from '../../src/data/db';
import { announcedAnswer, reportDrawn } from '../../src/talk/drawnLinks';
import { LiveRegion } from '../../src/ui/LiveRegion';
import { afterTurns } from '../support/turns';

const SAYS = 'Open the setting to change it. Tap the link below to go there.';
const newest = (id: number, linksUndrawn: boolean): TalkTurn => ({
  id,
  ref: 'drill-it',
  q: 'How do I make the text bigger?',
  a: SAYS,
  words: [],
  when: 1,
  links: [{ kind: 'setting', key: 'textSize' }],
  linksUndrawn,
});
const regionText = (): string => screen.getByRole('status').textContent ?? '';

afterEach(cleanup);

describe('the announcement of the newest turn', () => {
  it('a turn stored as linksUndrawn: the sentence that points at the link is not in what announce() receives', async () => {
    render(<LiveRegion />);
    announcedAnswer(newest(91, true));
    await act(async () => {
      reportDrawn(91, 0);
      await afterTurns();
    });
    expect(regionText()).toContain('The tutor says: Open the setting to change it.');
    expect(regionText()).not.toMatch(/link below/i);
  });

  it('a turn stored as linksUndrawn whose chip is drawn after all: the words are announced as written', async () => {
    render(<LiveRegion />);
    announcedAnswer(newest(92, true));
    await act(async () => {
      reportDrawn(92, 1);
      await afterTurns();
    });
    expect(regionText()).toContain('Tap the link below to go there.');
  });
});
