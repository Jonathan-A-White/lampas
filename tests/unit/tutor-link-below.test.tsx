// The tutor's words promise a link the answer does not show (mw-5r3p30.1248). His report: the talk from the results of a short Drill it on The neuter gender (0 of 4 right)
// said "Drill The article table. ... Tap the link below to open it", and under it there was no table. Two ways it happens, both caught here:
// - the answer carries the paradigm link, but the talk is over a run (Drill it and its end card, src/overRun.ts), where a chip that leaves the page is not drawn: the table's
//   chip is drawn there all the same and opens the table as a layer over the run, so the run is not lost;
// - the answer carries no link at all: the sentence that promises one is dropped from what is shown and spoken (src/talk/linkPromise.ts).
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NO_CHAPTER } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { OverRun } from '../../src/overRun';
import type { TalkScope } from '../../src/services/talk';
import { promisesLink, withoutUnkeptLinkPromise } from '../../src/talk/linkPromise';
import { TutorLinks } from '../../src/TutorLinks';
import { dropHeldTalk, heldTalk } from '../../src/talkReturn';

const scope: TalkScope = {
  title: 'Drill it',
  chapter: NO_CHAPTER,
  verse: null,
  screen: { name: 'Drill it', facts: [{ label: 'Idea', value: 'The neuter gender' }, { label: 'Result', value: '0 of 4 right' }] },
  kept: 'screen.drill-it.neuter',
};

// his answer, as the picture shows it
const HIS_ANSWER =
  'Drill The article table. The neuter forms are τό, τοῦ, τῷ, τό in the singular and τά, τῶν, τοῖς, τά in the plural. Tap the link below to open it, then use drill mode to test yourself on each cell.';

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  window.location.hash = '#/drill-it?i=neuter';
});

afterEach(() => {
  cleanup();
  dropHeldTalk();
});

describe('a paradigm link in the talk over a Drill it run', () => {
  it('is drawn, and opens the table as a layer over the run, which stays where it was', async () => {
    render(
      <OverRun.Provider value={true}>
        <TutorLinks links={[{ kind: 'paradigm', table: 'article' }]} onLeave={() => undefined} scope={scope} />
      </OverRun.Provider>,
    );
    const chip = await screen.findByRole('button', { name: 'Table: The article' });
    await userEvent.click(chip);
    const layer = await screen.findByRole('dialog', { name: 'The article' });
    // the table itself, not a page: the address (and so the run) is where it was and no talk is held for a Back from the Paradigms screen
    expect(within(layer).getByTestId('paradigm-table')).toHaveTextContent('The article');
    expect(window.location.hash).toBe('#/drill-it?i=neuter');
    expect(heldTalk()).toBeUndefined();
    await userEvent.click(within(layer).getByRole('button', { name: 'Back to the talk' }));
    expect(screen.queryByRole('dialog', { name: 'The article' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Table: The article' })).toBeInTheDocument();
  });

  it('still draws nothing for an id no table has', async () => {
    render(
      <OverRun.Provider value={true}>
        <TutorLinks links={[{ kind: 'paradigm', table: 'no-such-table' }]} onLeave={() => undefined} scope={scope} />
      </OverRun.Provider>,
    );
    expect(await screen.findByText('', { selector: '[data-tutor-links-done]' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Table:/ })).toBeNull();
  });
});

describe('an answer that promises a link it does not carry', () => {
  it('is caught: his answer promises one', () => {
    expect(promisesLink(HIS_ANSWER)).toBe(true);
    for (const words of ['See the link below.', 'Tap the table below to open it.', 'Use the button below.', 'The chip below opens it.', 'Tap the link to open it.', 'Open the link under this answer.']) {
      expect(promisesLink(words), words).toBe(true);
    }
    for (const words of ['The article links the noun to its case.', 'Drill The article table on the Paradigms screen.', 'Below the line is the gloss.', 'λόγος is linked to λέγω.']) {
      expect(promisesLink(words), words).toBe(false);
    }
  });

  it('with no link, the promise is dropped and the rest of the answer stays', () => {
    const shown = withoutUnkeptLinkPromise(HIS_ANSWER, undefined);
    expect(promisesLink(shown)).toBe(false);
    expect(shown).toBe('Drill The article table. The neuter forms are τό, τοῦ, τῷ, τό in the singular and τά, τῶν, τοῖς, τά in the plural.');
    expect(withoutUnkeptLinkPromise(HIS_ANSWER, [])).toBe(shown);
  });

  it('with the link, the words are kept as written', () => {
    expect(withoutUnkeptLinkPromise(HIS_ANSWER, [{ kind: 'paradigm', table: 'article' }])).toBe(HIS_ANSWER);
  });

  it('keeps every paragraph and line break of the rest', () => {
    const answer = 'The neuter article is τό.\n\n- Nominative: τό\n- Accusative: τό\n\nTap the link below to see the whole table.';
    expect(withoutUnkeptLinkPromise(answer, undefined)).toBe('The neuter article is τό.\n\n- Nominative: τό\n- Accusative: τό');
  });

  it('an answer that is nothing but the promise is left as it is, not emptied', () => {
    expect(withoutUnkeptLinkPromise('Tap the link below.', undefined)).toBe('Tap the link below.');
  });
});
