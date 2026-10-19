// tests/unit/tap-guard.test.tsx — one guard, app-wide (src/ui/tapGuard.ts, mw-5r3p30.597): after any screen change (the address names another screen) and any
// sheet or confirm card that opens or closes (an element of role dialog or alertdialog comes or goes), taps are swallowed for the settle moment, so the
// second tap of a double tap lands on nothing on what the first brought up or left bare. A screen or sheet needs no code of its own for it: the ones here
// have none. Before this, every sheet asked for it itself (useSheetBack, useSettleAround, mw-i7xe0n.26), and the screens did not (about 25 Tester bugs).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigate, openParadigm, openVerse, replaceHash, useRoute } from '../../src/nav/route';
import { settle, SETTLE_MS } from '../../src/ui/settle';
import { screenOf, useTapGuard } from '../../src/ui/tapGuard';

// the clock only goes on: a moment the last test started (its listeners stay until the clock passes it) is long over in the next
let now = 0;
beforeEach(() => {
  now += 10_000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  settle.ms = SETTLE_MS;
  window.history.replaceState(null, '', '/#/');
});
afterEach(() => {
  settle.ms = 0;
  cleanup();
  vi.restoreAllMocks();
});

/** A sheet with no settle code of its own: only its role says it is one. */
function Sheet({ onClose, onAct, role = 'dialog' }: { onClose: () => void; onAct: () => void; role?: 'dialog' | 'alertdialog' }) {
  return (
    <div role={role} aria-modal="true" aria-label="Sheet">
      <button type="button" onClick={onClose}>
        Done
      </button>
      <button type="button" onClick={onAct}>
        Act
      </button>
    </div>
  );
}

function Shell({ beneath, act: onAct, role }: { beneath: () => void; act: () => void; role?: 'dialog' | 'alertdialog' }) {
  useTapGuard();
  const route = useRoute();
  const [open, setOpen] = useState(false);
  return (
    <>
      <p>on {route}</p>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button" onClick={beneath}>
        Beneath
      </button>
      <button type="button" onClick={() => navigate('settings')}>
        Settings
      </button>
      {open ? <Sheet onClose={() => setOpen(false)} onAct={onAct} role={role} /> : null}
    </>
  );
}

const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
// the guard hears a sheet come or go a microtask after the commit (a MutationObserver): let it before the clock moves
const wait = async (ms: number) => {
  await act(async () => {});
  now += ms;
};

describe('a sheet takes no tap in the moment it opens or closes, with no code of its own', () => {
  it('swallows the second tap of a double tap on Done, and takes a tap after the moment', async () => {
    const beneath = vi.fn();
    render(<Shell beneath={beneath} act={vi.fn()} />);
    tap('Open');
    await wait(SETTLE_MS + 50);
    tap('Done');
    expect(screen.queryByRole('dialog')).toBeNull();
    await wait(120);
    tap('Beneath');
    expect(beneath).not.toHaveBeenCalled();
    await wait(SETTLE_MS);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });

  it('swallows the second tap of the double tap that opened it, and takes a tap after the moment', async () => {
    const onAct = vi.fn();
    render(<Shell beneath={vi.fn()} act={onAct} />);
    tap('Open');
    await wait(120);
    tap('Act');
    expect(onAct).not.toHaveBeenCalled();
    await wait(SETTLE_MS);
    tap('Act');
    expect(onAct).toHaveBeenCalledTimes(1);
  });

  it('does the same for a confirm card (alertdialog)', async () => {
    const onAct = vi.fn();
    render(<Shell beneath={vi.fn()} act={onAct} role="alertdialog" />);
    tap('Open');
    await wait(120);
    tap('Act');
    expect(onAct).not.toHaveBeenCalled();
  });

  it('keeps the press of a swallowed tap from the app too (a hold bar starts on it)', async () => {
    const pressed = vi.fn();
    render(
      <>
        <Shell beneath={vi.fn()} act={vi.fn()} />
        <button type="button" onPointerDown={pressed}>
          Hold
        </button>
      </>,
    );
    tap('Open');
    await wait(120);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold' }));
    expect(pressed).not.toHaveBeenCalled();
    await wait(SETTLE_MS);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold' }));
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it('takes every tap at once while the moment is 0, as the other tests do', async () => {
    settle.ms = 0;
    const beneath = vi.fn();
    render(<Shell beneath={beneath} act={vi.fn()} />);
    tap('Open');
    await wait(0);
    tap('Done');
    await wait(0);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });
});

describe('a screen takes no tap in the moment after it changes, with no code of its own', () => {
  it('swallows the second tap of a double tap that opened another screen, and takes a tap after the moment', async () => {
    const beneath = vi.fn();
    render(<Shell beneath={beneath} act={vi.fn()} />);
    await wait(SETTLE_MS + 50);
    tap('Settings');
    await wait(120);
    expect(screen.getByText('on settings')).toBeInTheDocument();
    tap('Beneath');
    expect(beneath).not.toHaveBeenCalled();
    await wait(SETTLE_MS);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });

  it('swallows the tap after the phone\'s Back returns to a screen', async () => {
    const beneath = vi.fn();
    render(<Shell beneath={beneath} act={vi.fn()} />);
    act(() => navigate('settings'));
    await wait(SETTLE_MS + 50);
    act(() => {
      window.history.replaceState(null, '', '/#/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await wait(120);
    tap('Beneath');
    expect(beneath).not.toHaveBeenCalled();
  });

  it('a move inside a screen (another chapter, a view) is not a screen change: its next tap goes through', async () => {
    const beneath = vi.fn();
    render(<Shell beneath={beneath} act={vi.fn()} />);
    await wait(SETTLE_MS + 50);
    act(() => replaceHash('#/?b=rom&c=9&view=greek'));
    await wait(120);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });
});

describe('a link that leaves the app takes no tap in the moment after it is tapped (mw-5r3p30.457)', () => {
  const link = (name: string) => screen.getByRole('link', { name });
  const click = (name: string) => fireEvent.click(link(name));
  function Links({ onOpen }: { onOpen: (name: string) => void }) {
    useTapGuard();
    const open = (e: { preventDefault: () => void }, name: string) => {
      e.preventDefault(); // jsdom does not navigate; what counts is the click that reaches the link
      onOpen(name);
    };
    return (
      <>
        <a href="https://github.com/x/commit/1" target="_blank" rel="noreferrer" onClick={(e) => open(e, 'tab')}>
          tab
        </a>
        <a href="logos4:Bible;ref=Bible.Ro8.1" onClick={(e) => open(e, 'app')}>
          app
        </a>
        <a href="#/settings" onClick={(e) => open(e, 'inside')}>
          inside
        </a>
      </>
    );
  }

  it.each(['tab', 'app'])('opens the %s link once for a double tap, and again for a tap after the moment', async (name) => {
    const opened = vi.fn();
    render(<Links onOpen={opened} />);
    await wait(SETTLE_MS + 50);
    click(name);
    await wait(120);
    click(name);
    expect(opened).toHaveBeenCalledTimes(1);
    await wait(SETTLE_MS);
    click(name);
    expect(opened).toHaveBeenCalledTimes(2);
  });

  it('leaves a link inside the app alone: a double tap on it is not held back', async () => {
    const opened = vi.fn();
    render(<Links onOpen={opened} />);
    await wait(SETTLE_MS + 50);
    click('inside');
    await wait(120);
    click('inside');
    expect(opened).toHaveBeenCalledTimes(2);
  });
});

describe('what a screen is', () => {
  it('is the route, the Verse view over the Reader, and a Paradigms table over the list', () => {
    expect(screenOf('#/')).toBe(screenOf('#/?b=rom&c=9&view=greek&weave=off'));
    expect(screenOf('#/?b=rom&c=8&v=28')).not.toBe(screenOf('#/?b=rom&c=8'));
    expect(screenOf('#/?b=rom&c=8&p=1')).toBe(screenOf('#/?b=rom&c=8&v=28'));
    expect(screenOf('#/?b=rom&c=8&v=28')).toBe(screenOf('#/?b=rom&c=8&v=29'));
    expect(screenOf('#/paradigms?t=article')).not.toBe(screenOf('#/paradigms'));
    expect(screenOf('#/paradigms?t=article&mode=review')).toBe(screenOf('#/paradigms?t=article&mode=study'));
    expect(screenOf('#/requests?from=about')).toBe(screenOf('#/requests'));
    expect(screenOf('#/settings')).not.toBe(screenOf('#/about'));
  });

  it('the Verse view and a Paradigms table opening are screen changes', async () => {
    const beneath = vi.fn();
    render(<Shell beneath={beneath} act={vi.fn()} />);
    await wait(SETTLE_MS + 50);
    act(() => openVerse(28));
    await wait(120);
    tap('Beneath');
    act(() => openParadigm({ table: 'article' }));
    await wait(120);
    tap('Beneath');
    expect(beneath).not.toHaveBeenCalled();
  });
});

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('the sweep: one guard', () => {
  it('the shell starts it once, and no screen, sheet or card asks for its own moment around it', () => {
    const files = sources('src');
    expect(files.filter((file) => /^\s*useTapGuard\(\);/m.test(readFileSync(file, 'utf8')))).toEqual(['src/App.tsx']);
    const own = files.filter((file) => file !== join('src', 'ui', 'settle.ts') && file !== join('src', 'ui', 'tapGuard.ts') && /\b(useSettleAround|swallowTaps)\b/.test(readFileSync(file, 'utf8')));
    expect(own).toEqual([]);
  });

  it('every modal sheet, drill screen and confirm card in src/ is one the guard sees: it says role dialog or alertdialog', () => {
    const modal = sources('src').filter((file) => /aria-modal/.test(readFileSync(file, 'utf8')));
    expect(modal.length).toBeGreaterThan(20);
    const unseen = modal.filter((file) => !/role(=|: )["'](alert)?dialog["']/.test(readFileSync(file, 'utf8')));
    expect(unseen).toEqual([]);
  });
});
