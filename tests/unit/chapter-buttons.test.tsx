// The chapter buttons at a chapter's foot (mw-5r3p30.706): a tip about the swipe, an offer to hide them once he has changed chapter by a swipe, and
// the setting Chapter buttons: Show | Hide. The flag that a swipe happened is set by the scroll chapter swipe and by a Turn pages swipe or drag across a
// chapter, never by a chapter button, a tap on a third or the page buttons.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChapterNav } from '../../src/ChapterNav';
import { db } from '../../src/data/db';
import { setTips } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { crossChapter } from '../../src/reader/crossChapter';
import { useChapterSwipe } from '../../src/reader/useChapterSwipe';
import { chapterButtonsSetting } from '../../src/settings/definitions';
import { writeSetting } from '../../src/settings/registry';
import { setSetting } from '../../src/settings/store';
import { chapterSwiped, hints } from '../../src/tips/hints';

beforeEach(async () => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/#/?b=1jn&c=1');
  await db.open();
  await db.settings.clear();
});

afterEach(() => {
  cleanup();
  clearBus();
  vi.useRealTimers();
});

describe('the Chapter buttons setting', () => {
  it('has Show and Hide, and Show until he chooses', async () => {
    expect(chapterButtonsSetting.key).toBe('chapterButtons');
    expect(chapterButtonsSetting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'show', label: 'Show' }, { value: 'hide', label: 'Hide' }] });
    expect(chapterButtonsSetting.default).toBe('show');
    expect(chapterButtonsSetting.section).toBe('reading');
    expect(chapterButtonsSetting.parse('hide')).toBe('hide');
    expect(chapterButtonsSetting.parse('nonsense')).toBe('show');
  });
});

describe('ChapterNav', () => {
  it('draws the two buttons by default', async () => {
    render(<ChapterNav book="1jn" chapter={2} />);
    expect(await screen.findByRole('button', { name: '‹ 1 John 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 John 3 ›' })).toBeInTheDocument();
  });

  it('draws nothing with the setting on Hide, and the buttons come back on Show', async () => {
    await writeSetting('chapterButtons', 'hide');
    const { container } = render(<ChapterNav book="1jn" chapter={2} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    await act(async () => {
      await writeSetting('chapterButtons', 'show');
    });
    expect(await screen.findByRole('button', { name: '1 John 3 ›' })).toBeInTheDocument();
  });

  it('carries the tip about the swipe, until he has swiped', async () => {
    render(<ChapterNav book="1jn" chapter={2} />);
    const tip = await screen.findByRole('note');
    expect(tip).toHaveTextContent('Swipe the text left or right to change chapter');
    expect(screen.queryByRole('button', { name: 'Hide' })).toBeNull();
  });

  it('offers once to hide the buttons after a swipe, in place of the tip; Hide hides them for good', async () => {
    crossChapter('1jn', 1, 1, true);
    expect(chapterSwiped()).toBe(true);
    const { container } = render(<ChapterNav book="1jn" chapter={2} />);
    const offer = await screen.findByRole('note');
    expect(offer).toHaveTextContent('You swipe between chapters. Hide these buttons?');
    expect(offer).not.toHaveTextContent('Swipe the text left or right');
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(await hints.isDismissed('hide-chapter-buttons')).toBe(true);
    expect(await db.settings.get('chapterButtons')).toMatchObject({ value: 'hide' });
  });

  it('Keep keeps the buttons, and the offer never comes again', async () => {
    crossChapter('1jn', 1, 1, true);
    const first = render(<ChapterNav book="1jn" chapter={2} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Keep' }));
    await waitFor(() => expect(screen.queryByRole('note')).toBeNull());
    expect(screen.getByRole('button', { name: '1 John 3 ›' })).toBeInTheDocument();
    first.unmount();
    render(<ChapterNav book="1jn" chapter={3} />);
    expect(await screen.findByRole('button', { name: '1 John 4 ›' })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('shows neither the tip nor the offer with Tips Off; the setting still works', async () => {
    await setTips('off');
    crossChapter('1jn', 1, 1, true);
    const { container } = render(<ChapterNav book="1jn" chapter={2} />);
    expect(await screen.findByRole('button', { name: '1 John 3 ›' })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('note')).toBeNull();
    await act(async () => {
      await setSetting(chapterButtonsSetting, 'hide');
    });
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe('what counts as a swipe', () => {
  it('a chapter button does not', async () => {
    render(<ChapterNav book="1jn" chapter={2} />);
    fireEvent.click(await screen.findByRole('button', { name: '1 John 3 ›' }));
    expect(chapterSwiped()).toBe(false);
  });

  it('Turn pages past a chapter by a tap or the page buttons does not; by a swipe or drag it does', () => {
    expect(crossChapter('1jn', 1, 1)).toBe(true);
    expect(chapterSwiped()).toBe(false);
    window.history.replaceState(null, '', '/#/?b=1jn&c=1');
    expect(crossChapter('1jn', 1, 1, true)).toBe(true);
    expect(chapterSwiped()).toBe(true);
  });

  it('a swipe that opens no chapter (Genesis 1 going back) does not', () => {
    expect(crossChapter('gen', 1, -1, true)).toBe(false);
    expect(chapterSwiped()).toBe(false);
  });

  it("the scroll mode's chapter swipe does, once the chapter opens", async () => {
    function Harness() {
      const box = useRef<HTMLDivElement | null>(null);
      const inner = useRef<HTMLDivElement | null>(null);
      useChapterSwipe(box, inner, '1jn', 2, false, () => {});
      return (
        <div ref={box} data-testid="box">
          <div ref={inner}>text</div>
        </div>
      );
    }
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<Harness />);
    const box = screen.getByTestId('box');
    const press = (type: 'pointerDown' | 'pointerUp', x: number) => fireEvent[type](type === 'pointerDown' ? box : window, { pointerId: 1, pointerType: 'touch', clientX: x, clientY: 300, button: 0 });
    press('pointerDown', 400);
    expect(chapterSwiped()).toBe(false);
    press('pointerUp', 200);
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(window.location.hash).toContain('c=3');
    expect(chapterSwiped()).toBe(true);
  });

  it('a short drag in the scroll chapter swipe does not', async () => {
    function Harness() {
      const box = useRef<HTMLDivElement | null>(null);
      const inner = useRef<HTMLDivElement | null>(null);
      useChapterSwipe(box, inner, '1jn', 2, false, () => {});
      return (
        <div ref={box} data-testid="box">
          <div ref={inner}>text</div>
        </div>
      );
    }
    render(<Harness />);
    fireEvent.pointerDown(screen.getByTestId('box'), { pointerId: 1, pointerType: 'touch', clientX: 400, clientY: 300, button: 0 });
    fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'touch', clientX: 380, clientY: 300, button: 0 });
    expect(chapterSwiped()).toBe(false);
  });
});
