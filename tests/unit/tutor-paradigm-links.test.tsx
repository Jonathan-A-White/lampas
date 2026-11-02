// The tutor's paradigm link (mw-5r3p30.990): {kind: 'paradigm', table: <id>} in a Bible talk answer is drawn as the chip 'Table: <the table's name>', which leaves the Talk sheet, holds the talk
// (so Back brings the sheet back, src/talkReturn.ts) and opens that table on the Paradigms screen. An id the screen lacks draws nothing and raises nothing; a stored talk without the kind loads as ever.
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';
import { NO_CHAPTER } from '../../src/data/chapter';
import { db, type AnswerLink } from '../../src/data/db';
import { PARADIGMS, paradigmById } from '../../src/data/paradigms';
import { addTurn, listTurns } from '../../src/data/repositories';
import { paradigmOf } from '../../src/nav/route';
import { isTalkAnswer, type TalkScope } from '../../src/services/talk';
import { TutorLinks } from '../../src/TutorLinks';
import { dropHeldTalk, heldTalk, tableIsFromTalk } from '../../src/talkReturn';

const scope: TalkScope = { title: 'Drill it', chapter: NO_CHAPTER, verse: null, screen: { name: 'Drill it', facts: [] }, kept: 'screen.drill-it.7' };

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  await db.talks.clear();
  window.location.hash = '#/goal';
});

afterEach(() => {
  cleanup();
  dropHeldTalk();
});

describe('the paradigm chip', () => {
  it('is named by the table\'s own name, leaves the Talk sheet, holds the talk and opens the table', async () => {
    const onLeave = vi.fn();
    render(<TutorLinks links={[{ kind: 'paradigm', table: 'article' }]} onLeave={onLeave} scope={scope} />);
    const chip = await screen.findByRole('button', { name: 'Table: The article' });
    expect(screen.getByRole('group', { name: 'The article' })).toBeInTheDocument();
    await userEvent.click(chip);
    expect(onLeave).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/paradigms?t=article');
    expect(paradigmOf(window.location.hash)).toEqual({ table: 'article' });
    // the talk is held with the address the sheet was over, and the table is the one the talk sent him to
    expect(heldTalk()?.scope).toBe(scope);
    expect(heldTalk()?.hash).toBe('#/goal');
    expect(tableIsFromTalk()).toBe(true);
  });

  it('opens a table with no scope too (nothing is held)', async () => {
    render(<TutorLinks links={[{ kind: 'paradigm', table: 'noun-endings' }]} onLeave={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Table: Noun endings' }));
    expect(window.location.hash).toBe('#/paradigms?t=noun-endings');
    expect(heldTalk()).toBeUndefined();
  });

  it('draws nothing, and raises nothing, for an id no table has; nothing at all when it is the only link', async () => {
    render(<TutorLinks links={[{ kind: 'paradigm', table: 'no-such-table' }]} onLeave={() => undefined} scope={scope} />);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('button', { name: /^Table:/ })).toBeNull();
    expect(document.querySelector('[data-tutor-links]')).toBeNull();
  });

  it('draws the table beside the other links of the answer, in the order given', async () => {
    const links: AnswerLink[] = [{ kind: 'paradigm', table: 'no-such-table' }, { kind: 'paradigm', table: 'adjective-endings' }];
    render(<TutorLinks links={links} onLeave={() => undefined} scope={scope} />);
    expect(await screen.findByRole('button', { name: 'Table: Adjective endings' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-tutor-link]')).toHaveLength(1);
  });
});

describe('a paradigm link in an answer', () => {
  const answer = { answer: 'Here is the table.', question: 'Show me the forms?', words: [] };

  it('is a link when it names a table, and refused when it is malformed', () => {
    expect(isTalkAnswer({ ...answer, links: [{ kind: 'paradigm', table: 'article' }] })).toBe(true);
    expect(isTalkAnswer({ ...answer, links: [{ kind: 'paradigm' }] })).toBe(false);
    expect(isTalkAnswer({ ...answer, links: [{ kind: 'paradigm', table: '' }] })).toBe(false);
    expect(isTalkAnswer({ ...answer, links: [{ kind: 'paradigm', table: 42 }] })).toBe(false);
    expect(isTalkAnswer({ ...answer, links: [{ kind: 'paradigm', table: 'article', extra: 1 }] })).toBe(false);
    expect(isTalkAnswer({ ...answer, links: [{ kind: 'paradigm', table: 'x'.repeat(41) }] })).toBe(false);
  });

  it('is only a shape check: an unknown id is still a good answer (the chip is not drawn)', () => {
    expect(isTalkAnswer({ ...answer, links: [{ kind: 'paradigm', table: 'no-such-table' }] })).toBe(true);
  });

  it('is kept with the turn, and a talk kept before the kind existed still loads', async () => {
    await addTurn('screen.test', 'old', 'An old answer.', [], 1, { changes: [], refused: [], links: [{ kind: 'word', lemma: 'ἀγάπη' }] });
    await addTurn('screen.test', 'new', 'A new answer.', [], 2, { changes: [], refused: [], links: [{ kind: 'paradigm', table: 'article' }] });
    const turns = await listTurns('screen.test');
    expect(turns.map((t) => t.links)).toEqual([[{ kind: 'word', lemma: 'ἀγάπη' }], [{ kind: 'paradigm', table: 'article' }]]);
  });
});

describe('the table ids the instructions list', () => {
  it('are all the ids the Paradigms screen has, no more and no fewer', () => {
    const text = instructionsOf('bible-talk');
    const start = text.indexOf('### Links to a paradigm table');
    expect(start).toBeGreaterThan(-1);
    const end = text.indexOf('\n#', start + 1);
    const part = text.slice(start, end < 0 ? undefined : end);
    const line = /Ids: (.*)$/m.exec(part);
    expect(line, 'the section has an "Ids:" line').not.toBeNull();
    const listed = [...(line?.[1] ?? '').matchAll(/`([a-z-]+)`/g)].map((m) => m[1]);
    expect(listed).toEqual(PARADIGMS.map((p) => p.id));
    for (const id of listed) expect(paradigmById(id)).toBeDefined();
  });

  it('are the answer schema\'s enum for a paradigm link too', async () => {
    const schema = (await import('../../grinds/bible-talk.answer.schema.json')).default as { properties: { links: { items: { anyOf: { properties: { kind: { const: string }; table?: { enum: string[] } } }[] } } } };
    const link = schema.properties.links.items.anyOf.find((one) => one.properties.kind.const === 'paradigm');
    expect(link?.properties.table?.enum).toEqual(PARADIGMS.map((p) => p.id));
  });
});
