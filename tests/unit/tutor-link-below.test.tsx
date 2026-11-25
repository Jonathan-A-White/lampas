// The tutor's words promise a link the answer does not show (mw-5r3p30.1248). His report: the talk from the results of a short Drill it on The neuter gender (0 of 4 right)
// said "Drill The article table. ... Tap the link below to open it", and under it there was no table. Two ways it happens, both caught here:
// - the answer carries the paradigm link, but the talk is over a run (Drill it and its end card, src/overRun.ts), where a chip that leaves the page is not drawn: the table's
//   chip is drawn there all the same and opens the table as a layer over the run, so the run is not lost;
// - the answer carries no link at all: the sentence that promises one is dropped from what is shown and spoken (src/talk/linkPromise.ts).
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NO_CHAPTER } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { OverRun } from '../../src/overRun';
import type { TalkScope } from '../../src/services/talk';
import { promisesLink, withoutUnkeptLinkPromise } from '../../src/talk/linkPromise';
import { TutorLinks } from '../../src/TutorLinks';
import { Turn } from '../../src/Talk';
import type { TalkTurn } from '../../src/data/db';
import { afterTurns } from '../support/turns';
import { ASYNC_WAIT_MS } from '../support/timeouts';
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
    expect(await within(layer).findByTestId('paradigm-table')).toHaveTextContent('The article');
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

// A link that arrives but is not drawn (mw-fnvjof.17.298): the answer carries a link, and the screen under the talk takes its chip away (a setting, a verse's Reader chip over a run),
// or what the chip needs is Off (a work with Logos Off), so 'Tap the link below' points at nothing. What is shown is decided by what is drawn.
const SAYS = 'Open the setting to change it. Tap the link below to go there.';
const turnWith = (links: TalkTurn['links']): TalkTurn => ({ id: 1, ref: 'drill-it', q: 'How do I make the text bigger?', a: SAYS, words: [], when: 1, links });
const shownTurn = async (turn: TalkTurn, overRun: boolean): Promise<HTMLElement> => {
  render(
    <OverRun.Provider value={overRun}>
      <Turn turn={turn} scope={scope} onLook={() => undefined} onLemma={() => undefined} onLeave={() => undefined} />
    </OverRun.Provider>,
  );
  // the lookups have answered: the list is drawn, or its hidden mark that it has nothing to draw
  await waitFor(() => expect(document.querySelector('[data-tutor-links], [data-tutor-links-done]')).not.toBeNull(), { timeout: ASYNC_WAIT_MS });
  await act(async () => {
    await afterTurns();
  });
  return document.querySelector('[data-answer-text]') as HTMLElement;
};

describe('a link that arrives but is not drawn', () => {
  it('a setting link over a run: the sentence that points at it is not shown', async () => {
    const shown = await shownTurn(turnWith([{ kind: 'setting', key: 'textSize' }]), true);
    expect(shown).toHaveTextContent('Open the setting to change it.');
    expect(shown).not.toHaveTextContent(/link below/i);
    expect(document.querySelector('[data-tutor-links]')).toBeNull();
  });

  it('a verse link over a run with no study resource on and no Reader chip: nothing drawn, no pointer', async () => {
    const shown = await shownTurn(turnWith([{ kind: 'verse', reference: 'Romans 8:28' }]), true);
    expect(document.querySelector('[data-tutor-links]')).toBeNull();
    expect(shown).not.toHaveTextContent(/link below/i);
  });

  it('a work link with Logos Off: nothing drawn, no pointer', async () => {
    const shown = await shownTurn(turnWith([{ kind: 'work', work: 'LLS:NO.SUCH.WORK', reference: 'Romans 8:28' }]), false);
    expect(document.querySelector('[data-tutor-links]')).toBeNull();
    expect(shown).not.toHaveTextContent(/link below/i);
  });

  it('a setting link on a plain screen is drawn and the words stay as written', async () => {
    const shown = await shownTurn(turnWith([{ kind: 'setting', key: 'textSize' }]), false);
    expect(document.querySelector('[data-tutor-links]')).not.toBeNull();
    expect(shown).toHaveTextContent('Tap the link below to go there.');
  });
});
