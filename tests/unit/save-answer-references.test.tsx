// tests/unit/save-answer-references.test.tsx — a tutor's answer saved as a verse list (mw-5r3p30.929): the quiet 'Save N references as a list' under the answer (src/talk/SaveReferences.tsx) and the tutor's own
// save-answer-references command (src/tutor/registry.ts), both through the Share sheet's saveAsListCommand. The answer is his top five on 'Talk about Revelation 10' (words of 2026-10-31).
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { getVerseList, listVerseLists } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { SaveReferences } from '../../src/talk/SaveReferences';
import { bibleTalkRegistry, withPreviousAnswer } from '../../src/tutor/registry';

const QUESTION = 'Which five books should I read to understand Revelation?';
const ANSWER = [
  'Here is a top five, ordered by how much light each throws on Revelation. 1. Daniel, above all chapters 2, 7 and 10 to 12: the statue and kingdoms, the Son of Man.',
  '',
  '2. Ezekiel 10 is the vision; verses 21 and 22 are the faces.',
].join('\n');
const SAVED = ['Dan.2', 'Dan.7', 'Dan.10', 'Dan.11', 'Dan.12', 'Ezek.10', 'Ezek.10.21', 'Ezek.10.22'];

beforeEach(async () => {
  clearBus();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  await db.open();
  await db.verseLists.clear();
});
afterEach(cleanup);
afterAll(() => db.close());

describe('Save N references as a list, under an answer', () => {
  it('offers the name from the question, saves every reference in answer order, and Open goes to the list', async () => {
    const onLeave = vi.fn();
    render(<SaveReferences answer={ANSWER} question={QUESTION} onLeave={onLeave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save 8 references as a list' }));
    expect(screen.getByRole('textbox', { name: 'List name' })).toHaveValue(QUESTION);
    // the helper of the Share sheet is not here: the talk is the tutor
    expect(screen.queryByText(/Let the tutor do it/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(`Saved 8 references to ${QUESTION}`)).toBeInTheDocument();
    const [list] = await listVerseLists();
    expect(list.refs).toEqual(SAVED);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onLeave).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe(`#/lists/${list.id}`);
  });

  it('is not there for an answer with one reference or none', () => {
    const { container } = render(<SaveReferences answer="Romans 8:28 is the verse." question="q" onLeave={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
    cleanup();
    const none = render(<SaveReferences answer="Nothing named." question="q" onLeave={() => undefined} />);
    expect(none.container).toBeEmptyDOMElement();
  });
});

describe('save-answer-references, the tutor asked to save the answer before', () => {
  const registry = bibleTalkRegistry();

  it('is a command of the catalogue that is undoable', () => {
    expect(registry.command('save-answer-references')).toMatchObject({ kind: 'undoable' });
    expect(registry.catalogue().some((e) => e.name === 'save-answer-references' && e.is === 'command')).toBe(true);
  });

  it('saves the previous answer\'s references as a new list named from its question, and says where; its undo takes the list away', async () => {
    const ran = await withPreviousAnswer({ answer: ANSWER, question: QUESTION }, () => registry.run('save-answer-references', {}));
    if (!ran.ok) throw new Error(ran.why);
    expect(ran.said).toBe(`Saved 8 references to ${QUESTION}, in Verse lists`);
    const [list] = await listVerseLists();
    expect(list.refs).toEqual(SAVED);
    await ran.undo?.();
    expect(await getVerseList(list.id)).toBeUndefined();
  });

  it('takes the name he gave', async () => {
    const ran = await withPreviousAnswer({ answer: ANSWER, question: QUESTION }, () => registry.run('save-answer-references', { name: 'Books for Revelation' }));
    expect(ran.ok && ran.said).toBe('Saved 8 references to Books for Revelation, in Verse lists');
  });

  it('is refused, writing nothing, with no earlier answer, an answer with no reference, or a bad arg', async () => {
    expect((await registry.run('save-answer-references', {})).ok).toBe(false);
    expect((await withPreviousAnswer({ answer: 'Nothing named.', question: 'q' }, () => registry.run('save-answer-references', {}))).ok).toBe(false);
    expect((await withPreviousAnswer({ answer: ANSWER, question: 'q' }, () => registry.run('save-answer-references', { name: 7 }))).ok).toBe(false);
    expect(await listVerseLists()).toEqual([]);
  });
});
