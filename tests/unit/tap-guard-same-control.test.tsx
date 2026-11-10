// tests/unit/tap-guard-same-control.test.tsx — the app-wide guard also drops a click on the SAME control that comes within the settle moment of the last click on it
// (src/ui/tapGuard.ts, mw-t5shinh.8): the second tap of a double tap acts once, on any button, link, role=button or role=switch, with no oneTap of its own. A control
// that is meant to be tapped twice quickly carries data-repeat and is left alone (ReaderControls' Previous page, Next page, Larger split and Smaller split).
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderControls } from '../../src/ReaderControls';
import { settle, SETTLE_MS } from '../../src/ui/settle';
import { startTapGuard } from '../../src/ui/tapGuard';

// a held clock, as one-tap.test.ts: the clock only goes on, so a moment the last test started is long over in the next
let now = 0;
let stop: () => void = () => {};
beforeEach(() => {
  now += 10_000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  settle.ms = SETTLE_MS;
  stop = startTapGuard();
});
afterEach(() => {
  stop();
  settle.ms = 0;
  cleanup();
  vi.restoreAllMocks();
});

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('the guard drops a second click on the same control within the moment', () => {
  it('runs the handler once for two clicks 120 ms apart, and again for a click 500 ms later', () => {
    const act = vi.fn();
    render(<button type="button" onClick={act}>One</button>);
    click('One');
    now += 120;
    click('One');
    expect(act).toHaveBeenCalledTimes(1);
    now += 500;
    click('One');
    expect(act).toHaveBeenCalledTimes(2);
  });

  it('runs both handlers for two clicks 120 ms apart on two different buttons', () => {
    const a = vi.fn();
    const b = vi.fn();
    render(
      <>
        <button type="button" onClick={a}>A</button>
        <button type="button" onClick={b}>B</button>
      </>,
    );
    click('A');
    now += 120;
    click('B');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('takes both clicks on one button while the moment is 0', () => {
    settle.ms = 0;
    const act = vi.fn();
    render(<button type="button" onClick={act}>One</button>);
    click('One');
    now += 120;
    click('One');
    expect(act).toHaveBeenCalledTimes(2);
  });

  it('reaches a click on a child of the button, a role=button, a role=switch and a link', () => {
    const calls = { child: 0, role: 0, sw: 0, link: 0 };
    render(
      <>
        <button type="button" onClick={() => calls.child++}><span>Inner</span></button>
        <div role="button" tabIndex={0} onClick={() => calls.role++}>Role</div>
        <div role="switch" aria-checked="false" tabIndex={0} onClick={() => calls.sw++}>Switch</div>
        <a href="https://example.com/x" target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); calls.link++; }}>Link</a>
      </>,
    );
    for (const target of [screen.getByText('Inner'), screen.getByRole('button', { name: 'Role' }), screen.getByRole('switch'), screen.getByRole('link', { name: 'Link' })]) {
      fireEvent.click(target);
      now += 120;
      fireEvent.click(target);
      now += 1000;
    }
    expect(calls).toEqual({ child: 1, role: 1, sw: 1, link: 1 });
  });

  it('leaves a link inside the app alone: the address it names is the same place twice, and a change of screen is guarded already', () => {
    const open = vi.fn();
    render(<a href="#/?b=rom&c=8" onClick={open}>Inside</a>);
    fireEvent.click(screen.getByRole('link', { name: 'Inside' }));
    now += 120;
    fireEvent.click(screen.getByRole('link', { name: 'Inside' }));
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('leaves a control marked data-repeat, and one inside a marked group, alone', () => {
    const act = vi.fn();
    const inside = vi.fn();
    render(
      <>
        <button type="button" data-repeat onClick={act}>Again</button>
        <div data-repeat>
          <button type="button" onClick={inside}>Within</button>
        </div>
      </>,
    );
    click('Again');
    now += 120;
    click('Again');
    expect(act).toHaveBeenCalledTimes(2);
    click('Within');
    now += 120;
    click('Within');
    expect(inside).toHaveBeenCalledTimes(2);
  });

  it('does not count a dropped click: a third click is judged against the last one that went through', () => {
    const act = vi.fn();
    render(<button type="button" onClick={act}>One</button>);
    click('One');
    now += 300;
    click('One');
    now += 300;
    click('One');
    expect(act).toHaveBeenCalledTimes(2);
  });

  it('stops listening when the guard is stopped', () => {
    stop();
    const act = vi.fn();
    render(<button type="button" onClick={act}>One</button>);
    click('One');
    now += 120;
    click('One');
    expect(act).toHaveBeenCalledTimes(2);
    stop = startTapGuard();
  });
});

describe('ReaderControls: the buttons meant to be tapped twice quickly take both taps', () => {
  const setup = () => {
    const turn = vi.fn();
    const larger = vi.fn();
    const smaller = vi.fn();
    render(
      <ReaderControls
        immersive={false}
        away={false}
        onBars={vi.fn()}
        inert={false}
        pages={{ page: 2, count: 5, chapterBefore: true, chapterAfter: true, turn }}
        split={{ larger, smaller, close: vi.fn() }}
      />,
    );
    return { turn, larger, smaller };
  };

  it('Next page and Previous page turn twice for two clicks 120 ms apart', () => {
    const { turn } = setup();
    click('Next page');
    now += 120;
    click('Next page');
    expect(turn.mock.calls).toEqual([[1], [1]]);
    turn.mockClear();
    now += 1000;
    click('Previous page');
    now += 120;
    click('Previous page');
    expect(turn.mock.calls).toEqual([[-1], [-1]]);
  });

  it('Larger split and Smaller split step twice for two clicks 120 ms apart', () => {
    const { larger, smaller } = setup();
    click('Larger split');
    now += 120;
    click('Larger split');
    expect(larger).toHaveBeenCalledTimes(2);
    now += 1000;
    click('Smaller split');
    now += 120;
    click('Smaller split');
    expect(smaller).toHaveBeenCalledTimes(2);
  });

  it('each of the four carries data-repeat', () => {
    setup();
    for (const name of ['Previous page', 'Next page', 'Larger split', 'Smaller split']) {
      expect(screen.getByRole('button', { name }), name).toHaveAttribute('data-repeat');
    }
  });
});
