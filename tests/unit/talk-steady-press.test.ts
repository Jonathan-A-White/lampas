// A swipe never starts a hold on Hold to talk (mw-5r3p30.930): a touch is held back until it has stayed put, a tap goes through at once.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { holdBackSwipes, STEADY_MS, STEADY_SLOP_PX } from '../../src/talk/steadyPress';
import { pageHeightFor } from '../../src/talk/documentScroll';

let root: HTMLElement;
let bar: HTMLButtonElement;
let stop: () => void;
let heard: string[];

const touch = (type: string, x: number, y: number, id = 1): PointerEvent =>
  new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 });

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement('div');
  bar = document.createElement('button');
  bar.className = 'bk-composer__bar';
  root.appendChild(bar);
  document.body.appendChild(root);
  heard = [];
  // what the kit's bar listens to
  for (const type of ['pointerdown', 'pointerup', 'pointercancel']) bar.addEventListener(type, () => heard.push(type));
  stop = holdBackSwipes(root);
});
afterEach(() => {
  stop();
  root.remove();
  vi.useRealTimers();
});

describe('holdBackSwipes', () => {
  it('lets a touch that stays put through as a press once the wait is over', () => {
    bar.dispatchEvent(touch('pointerdown', 100, 100));
    expect(heard).toEqual([]);
    vi.advanceTimersByTime(STEADY_MS + 1);
    expect(heard).toEqual(['pointerdown']);
  });

  it('never presses for a touch that moves up the screen: nothing begins, and the lift after it is just a lift', () => {
    bar.dispatchEvent(touch('pointerdown', 100, 100));
    bar.dispatchEvent(touch('pointermove', 100, 100 - STEADY_SLOP_PX - 2));
    vi.advanceTimersByTime(STEADY_MS * 5);
    bar.dispatchEvent(touch('pointerup', 100, 60));
    expect(heard).toEqual(['pointerup']);
  });

  it('lets a wobble inside the slop through', () => {
    bar.dispatchEvent(touch('pointerdown', 100, 100));
    bar.dispatchEvent(touch('pointermove', 103, 102));
    vi.advanceTimersByTime(STEADY_MS + 1);
    expect(heard).toEqual(['pointerdown']);
  });

  it('puts a quick tap through at once, press first and lift after it', () => {
    bar.dispatchEvent(touch('pointerdown', 100, 100));
    vi.advanceTimersByTime(40);
    bar.dispatchEvent(touch('pointerup', 100, 100));
    expect(heard).toEqual(['pointerdown', 'pointerup']);
  });

  it('drops a touch the phone cancels (it took the gesture for a scroll)', () => {
    bar.dispatchEvent(touch('pointerdown', 100, 100));
    bar.dispatchEvent(touch('pointercancel', 100, 100));
    vi.advanceTimersByTime(STEADY_MS * 3);
    expect(heard).toEqual(['pointercancel']);
  });

  it('does not hold back a mouse', () => {
    bar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientX: 1, clientY: 1 }));
    expect(heard).toEqual(['pointerdown']);
  });
});

describe('pageHeightFor', () => {
  it('is the window and what the conversation has below its fold, so the page scrolls as far as the conversation does', () => {
    expect(pageHeightFor(7000, 600, 844)).toBe(6400 + 844);
    expect(pageHeightFor(500, 600, 844)).toBe(844);
  });
});
