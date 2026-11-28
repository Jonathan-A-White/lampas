// tests/unit/tap-guard.test.tsx — one guard, app-wide (src/ui/tapGuard.ts, mw-5r3p30.597): after any screen change (the address names another screen) and any
// sheet or confirm card that opens or closes (an element of role dialog or alertdialog comes or goes), taps are swallowed for the settle moment, so the
// second tap of a double tap lands on nothing on what the first brought up or left bare. A screen or sheet needs no code of its own for it: the ones here
// have none. Before this, every sheet asked for it itself (useSheetBack, useSettleAround, mw-i7xe0n.26), and the screens did not (about 25 Tester bugs).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigate, openParadigm, openVerse, replaceHash, useRoute } from '../support/routes';
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
  const [strip, setStrip] = useState(true);
  return (
    <>
      {strip ? (
        <div data-open-in-app>
          <button type="button" onClick={() => setStrip(false)}>
            Strip
          </button>
        </div>
      ) : null}
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

// mw-82lb97i.44: the speaking bar's Stop takes the bar out of the page, and what lay under it is under the thumb for the second tap of a double tap
describe('the speaking bar going away at a tap on it takes no tap in the moment after it', () => {
  function Reading({ beneath }: { beneath: () => void }) {
    useTapGuard();
    const [bar, setBar] = useState(true);
    return (
      <>
        <button type="button" onClick={beneath}>
          Beneath
        </button>
        <button type="button" onClick={() => setBar(false)}>
          Ends by itself
        </button>
        {bar ? (
          <section data-testid="speaking-bar" aria-label="Speaking">
            <button type="button" onClick={() => setBar(false)}>
              Stop
            </button>
          </section>
        ) : null}
      </>
    );
  }

  it('swallows the second tap of a double tap on Stop, and takes a tap after the moment', async () => {
    const beneath = vi.fn();
    render(<Reading beneath={beneath} />);
    tap('Stop');
    expect(screen.queryByRole('region')).toBeNull();
    await wait(120);
    tap('Beneath');
    expect(beneath).not.toHaveBeenCalled();
    await wait(SETTLE_MS);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });

  it('swallows nothing for a bar that goes with no tap on it', async () => {
    const beneath = vi.fn();
    render(<Reading beneath={beneath} />);
    tap('Ends by itself');
    expect(screen.queryByRole('region')).toBeNull();
    await wait(120);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });
});

// mw-ar5k42b.27: a Play brings the speaking bar into the page and the page is laid out again for it (the Reader's header loses its Play and the English | Greek switch slides into
// its place, a foot's Play gives way to a Stop, a sheet's text is pushed up), so what the first tap put under the thumb took the second tap of a double tap
describe('the speaking bar coming at a tap takes no tap in the moment after it', () => {
  // a reading that starts or ends by itself, with no tap: the test moves the bar through these
  const reading: { start: (slot?: 'foot' | 'sheet') => void; end: () => void } = { start: () => {}, end: () => {} };
  const start = (slot?: 'foot' | 'sheet') => reading.start(slot);
  const end = () => reading.end();
  function Reader({ beneath, slid }: { beneath: () => void; slid: () => void }) {
    useTapGuard();
    const [bar, setBar] = useState<'none' | 'foot' | 'sheet'>('none');
    useEffect(() => {
      reading.start = (slot = 'foot') => setBar(slot);
      reading.end = () => setBar('none');
    }, []);
    const drawn = (
      <section data-testid="speaking-bar" aria-label="Speaking">
        <button type="button" onClick={() => setBar('none')}>
          Stop
        </button>
      </section>
    );
    return (
      <>
        {/* the header's Play leaves as the bar takes the reading, and its neighbour stands where it was */}
        {bar === 'none' ? (
          <button type="button" onClick={() => setBar('foot')}>
            Play
          </button>
        ) : (
          <button type="button" onClick={slid}>
            Greek
          </button>
        )}
        <button type="button" onClick={beneath}>
          Beneath
        </button>
        <button type="button" onClick={() => setBar('sheet')}>
          Move
        </button>
        <div data-speaking-slot="1">{bar === 'foot' ? drawn : null}</div>
        <div data-speaking-slot="3">{bar === 'sheet' ? drawn : null}</div>
      </>
    );
  }

  it('swallows the second tap of a double tap on Play, on what slid into its place and on what lay beneath, and takes a tap after the moment', async () => {
    const beneath = vi.fn();
    const slid = vi.fn();
    render(<Reader beneath={beneath} slid={slid} />);
    tap('Play');
    expect(screen.getByRole('region', { name: 'Speaking' })).toBeTruthy();
    await wait(120);
    tap('Greek');
    tap('Beneath');
    expect(slid).not.toHaveBeenCalled();
    expect(beneath).not.toHaveBeenCalled();
    await wait(SETTLE_MS);
    tap('Greek');
    tap('Beneath');
    expect(slid).toHaveBeenCalledTimes(1);
    expect(beneath).toHaveBeenCalledTimes(1);
  });

  it('holds the moment from when the bar came, not from the tap: a second tap just under a moment after the tap is still swallowed when the bar came late', async () => {
    const beneath = vi.fn();
    render(<Reader beneath={beneath} slid={() => {}} />);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
    // the voice takes 300 ms to take the reading: the bar comes then, within the moment of the tap
    await wait(300);
    act(() => start());
    await wait(SETTLE_MS - 50);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
    await wait(100);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(2);
  });

  it('swallows nothing for a bar that comes with no tap in the moment before it (a reading that starts by itself)', async () => {
    const beneath = vi.fn();
    render(<Reader beneath={beneath} slid={() => {}} />);
    tap('Beneath');
    await wait(SETTLE_MS + 50);
    act(() => start());
    await wait(120);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(2);
  });

  it('swallows nothing for a bar that a tap moves to another slot, or that goes and comes back while it was up at the tap (the voice between two verses)', async () => {
    const beneath = vi.fn();
    render(<Reader beneath={beneath} slid={() => {}} />);
    act(() => start());
    await wait(SETTLE_MS + 50);
    tap('Move');
    expect(document.querySelector('[data-speaking-slot="3"] [data-testid="speaking-bar"]')).not.toBeNull();
    await wait(120);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
    await wait(SETTLE_MS + 50);
    // a tap while the bar is up; then the bar is out of the page for a moment and back, by itself
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(2);
    act(() => end());
    await wait(20);
    act(() => start('sheet'));
    await wait(120);
    // another control than the one just tapped (the same one twice in a moment is dropped whatever the bar does): the bar's own Stop takes the tap
    tap('Stop');
    expect(screen.queryByRole('region', { name: 'Speaking' })).toBeNull();
  });

  it('takes every tap at once while the moment is 0, as the other tests do', async () => {
    settle.ms = 0;
    const slid = vi.fn();
    render(<Reader beneath={() => {}} slid={slid} />);
    tap('Play');
    await wait(120);
    tap('Greek');
    expect(slid).toHaveBeenCalledTimes(1);
  });
});

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

  it('keeps the mouse press of a swallowed tap from focusing the field under it (mw-5r3p30.1100)', async () => {
    render(
      <>
        <Shell beneath={vi.fn()} act={vi.fn()} />
        <input aria-label="Field" />
      </>,
    );
    tap('Open');
    await wait(120);
    expect(fireEvent.mouseDown(screen.getByLabelText('Field'))).toBe(false);
    await wait(SETTLE_MS);
    expect(fireEvent.mouseDown(screen.getByLabelText('Field'))).toBe(true);
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
  // mw-5r3p30.1138: a thumb of his taps again 400 ms later (mw-5r3p30.1058); every moment the guard starts (screen change, sheet or strip leaving, a link that leaves the app)
  // lasts at least that long, since each is swallowTaps() with no argument: the moment is settle.ms, and the default for it is SETTLE_MS.
  it('the moment every guard starts lasts at least the 400 ms of a thumb that taps again', () => {
    expect(SETTLE_MS).toBeGreaterThanOrEqual(400);
    const files = sources('src').filter((file) => /\bswallowTaps\(/.test(readFileSync(file, 'utf8')));
    expect(files.sort()).toEqual([join('src', 'ui', 'settle.ts'), join('src', 'ui', 'tapGuard.ts')]);
    expect(readFileSync(join('src', 'ui', 'tapGuard.ts'), 'utf8').match(/swallowTaps\([^)]/g)).toBeNull();
    expect(readFileSync(join('src', 'ui', 'settle.ts'), 'utf8')).toMatch(/const until = performance\.now\(\) \+ settle\.ms;/);
  });

  it.each([
    ['a sheet closing', async () => { tap('Open'); await wait(SETTLE_MS + 50); tap('Done'); }],
    ['the Open in the app strip leaving', async () => { tap('Strip'); }],
  ])('swallows a tap 400 ms after %s', async (_name, first) => {
    const beneath = vi.fn();
    render(<Shell beneath={beneath} act={vi.fn()} />);
    await wait(SETTLE_MS + 50);
    await first();
    await wait(400);
    tap('Beneath');
    expect(beneath).not.toHaveBeenCalled();
    await wait(100);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });

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
