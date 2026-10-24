// The tutor's `go` through a place (mw-t3xu9a.4, docs/ask-tutor.md 'Where the tutor can take you'): an answer's go names a place of the registry, which opens through
// navigate as a pushed history entry marked as a tutor go; Back returns to the Talk sheet it left, with the talk as it was. The chapter case (the answer's {book, chapter}) behaves as before.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { latest } from '../../src/events/bus';
import { routeOf } from '../../src/nav/route';
import { readGo, readTarget } from '../../src/talk/go';
import { lampasRegistry } from '../../src/tutor/registry';
import { leaveSheetForTutor, useSheetBack } from '../../src/ui/sheetBack';
import { sheetEntriesGone } from '../support/sheet-history';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = lampasRegistry();

describe('readTarget', () => {
  it('reads the chapter go as it always was, and says which place opens it', () => {
    expect(readTarget({ book: 'Colossians', chapter: 1 }, registry)).toEqual({
      ok: true,
      target: { name: 'chapter', args: { book: 'col', chapter: 1 }, title: 'Colossians 1', chapter: { book: 'col', chapter: 1, title: 'Colossians 1' } },
    });
    expect(readGo({ book: 'Colossians', chapter: 1 })).toEqual({ ok: true, place: { book: 'col', chapter: 1, title: 'Colossians 1' } });
    expect(readTarget({ book: 'Colossians', chapter: 9 }, registry)).toEqual({ ok: false, title: 'Colossians 9' });
    expect(readTarget(undefined, registry)).toBeUndefined();
  });

  it('reads a go that names a place of the registry, with the args it checks', () => {
    expect(readTarget({ name: 'words', args: {} }, registry)).toEqual({ ok: true, target: { name: 'words', args: {}, title: 'Words' } });
    expect(readTarget({ name: 'goal' }, registry)).toMatchObject({ ok: true, target: { name: 'goal', title: 'Goal' } });
    expect(readTarget({ name: 'chapter', args: { book: 'jhn', chapter: 3 } }, registry)).toMatchObject({ ok: true, target: { name: 'chapter', title: 'John 3' } });
  });

  it('refuses a place the registry does not have, args it does not take, and any other shape, naming what was asked', () => {
    expect(readTarget({ name: 'the-moon' }, registry)).toEqual({ ok: false, title: 'the-moon' });
    expect(readTarget({ name: 'words', args: { page: 2 } }, registry)).toEqual({ ok: false, title: 'words' });
    expect(readTarget({ name: 'chapter', args: { book: 'jhn', chapter: 99 } }, registry)).toMatchObject({ ok: false });
    expect(readTarget('Words', registry)).toEqual({ ok: false, title: 'Words' });
    expect(readTarget(null, registry)).toEqual({ ok: false, title: 'that chapter' });
  });
});

/** The Talk sheet of a screen, as a screen keeps it: `talk` is what was said, kept by the screen; Back from a place the tutor took him to opens the sheet again. */
function Screen({ talk, remember = true }: { talk: string[]; remember?: boolean }) {
  const [open, setOpen] = useState(true);
  const leave = () => {
    if (remember) leaveSheetForTutor(() => setOpen(true));
    setOpen(false);
  };
  return createElement('div', null, createElement('span', null, 'Reader'), open ? createElement(TalkSheet, { talk, onClose: () => setOpen(false), leave }) : null);
}

function TalkSheet({ talk, onClose, leave }: { talk: string[]; onClose: () => void; leave: () => void }) {
  useSheetBack(onClose);
  return createElement('div', { role: 'dialog', 'aria-label': 'Talk' }, createElement('h2', null, 'Talk'), createElement('p', null, talk.join(' / ')), createElement('button', { type: 'button', onClick: leave }, 'Take me there'));
}

describe('a go that leaves the Talk sheet', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/?b=rom&c=8');
  });
  afterEach(async () => {
    cleanup();
    await sheetEntriesGone();
  });

  it('pushes the place as a tutor go, and Back returns to the Talk sheet with the talk as it was', async () => {
    render(createElement(Screen, { talk: ['What is on my drill today?', 'Nine things'] }));
    expect(screen.getByRole('dialog', { name: 'Talk' })).toBeInTheDocument();
    expect(window.history.state).toMatchObject({ sheet: 1 });
    const sheetEntry = window.location.hash;

    await act(async () => {
      screen.getByRole('button', { name: 'Take me there' }).click();
      expect(await registry.open('words', {})).toEqual({ ok: true });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(routeOf(window.location.hash)).toBe('words');
    expect(window.history.state).toEqual({ tutorGo: true });

    await act(async () => {
      window.history.back();
      await waitFor(() => expect(screen.getByRole('dialog', { name: 'Talk' })).toBeInTheDocument());
    });
    expect(window.location.hash).toBe(sheetEntry);
    expect(screen.getByRole('dialog', { name: 'Talk' })).toHaveTextContent('What is on my drill today? / Nine things');
    // the sheet took its own entry back: no second entry was pushed for it
    expect(window.history.state).toMatchObject({ sheet: 1 });
  });

  it('a sheet that left with nothing remembered is stepped over by Back, as it always was', async () => {
    render(createElement(Screen, { talk: ['Hello'], remember: false }));
    await act(async () => {
      screen.getByRole('button', { name: 'Take me there' }).click();
      await registry.open('words', {});
    });
    await act(async () => {
      window.history.back();
      await waitFor(() => expect((window.history.state as { sheet?: number } | null)?.sheet).toBeUndefined());
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the chapter through its place: the Reader there as a tutor go, with the notice Opened', async () => {
    await act(async () => {
      expect(await registry.open('chapter', { book: 'col', chapter: 1 })).toEqual({ ok: true });
    });
    expect(window.location.hash).toBe('#/?b=col&c=1');
    expect(window.history.state).toEqual({ tutorGo: true });
    expect(latest('reader-requested')).toMatchObject({ action: 'opened', book: 'col', chapter: 1 });
  });
});
