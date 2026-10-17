// tests/unit/sheet-settle.test.tsx — a sheet swallows taps for the settle moment as it opens and as it closes (src/ui/settle.ts useSettleAround,
// mw-i7xe0n.26): a fast second tap on Done reached the control beneath (the Goal's Change, the sheet under it's own Done), and one on Drill it the
// drill's Hint. Every sheet calls useSheetBack, which does it; every other modal card in src/ calls useSettleAround itself.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settle, SETTLE_MS } from '../../src/ui/settle';
import { useSheetBack } from '../../src/ui/sheetBack';

let now = 0;
beforeEach(() => {
  now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  settle.ms = SETTLE_MS;
});
afterEach(() => {
  settle.ms = 0;
  cleanup();
  vi.restoreAllMocks();
});

function Sheet({ onClose, onAct }: { onClose: () => void; onAct: () => void }) {
  useSheetBack(onClose);
  return (
    <div role="dialog" aria-modal="true" aria-label="Sheet">
      <button type="button" onClick={onClose}>
        Done
      </button>
      <button type="button" onClick={onAct}>
        Act
      </button>
    </div>
  );
}

function Screen({ beneath, act: onAct }: { beneath: () => void; act: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button" onClick={beneath}>
        Beneath
      </button>
      {open ? <Sheet onClose={() => setOpen(false)} onAct={onAct} /> : null}
    </>
  );
}

const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const wait = (ms: number) => act(() => void (now += ms));

describe('a sheet takes no tap in the moment it opens or closes', () => {
  it('swallows the second tap of a double tap on Done, and takes a tap after the moment', () => {
    const beneath = vi.fn();
    render(<Screen beneath={beneath} act={vi.fn()} />);
    tap('Open');
    wait(SETTLE_MS + 50);
    tap('Done');
    expect(screen.queryByRole('dialog')).toBeNull();
    wait(120);
    tap('Beneath');
    expect(beneath).not.toHaveBeenCalled();
    wait(SETTLE_MS);
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });

  it('swallows the second tap of the double tap that opened it, and takes a tap after the moment', () => {
    const onAct = vi.fn();
    render(<Screen beneath={vi.fn()} act={onAct} />);
    tap('Open');
    wait(120);
    tap('Act');
    expect(onAct).not.toHaveBeenCalled();
    wait(SETTLE_MS);
    tap('Act');
    expect(onAct).toHaveBeenCalledTimes(1);
  });

  it('keeps the press of a swallowed tap from the app too (a hold bar starts on it)', () => {
    const pressed = vi.fn();
    render(
      <>
        <Screen beneath={vi.fn()} act={vi.fn()} />
        <button type="button" onPointerDown={pressed}>
          Hold
        </button>
      </>,
    );
    tap('Open');
    wait(120);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold' }));
    expect(pressed).not.toHaveBeenCalled();
    wait(SETTLE_MS);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold' }));
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it('takes every tap at once while the moment is 0, as the other tests do', () => {
    settle.ms = 0;
    const beneath = vi.fn();
    render(<Screen beneath={beneath} act={vi.fn()} />);
    tap('Open');
    tap('Done');
    tap('Beneath');
    expect(beneath).toHaveBeenCalledTimes(1);
  });
});

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) ? [path] : [];
  });
}

describe('the sweep', () => {
  it('every modal sheet, drill screen and confirm card in src/ calls useSheetBack or useSettleAround', () => {
    const modal = sources('src').filter((file) => /aria-modal/.test(readFileSync(file, 'utf8')));
    expect(modal.length).toBeGreaterThan(20);
    const bare = modal.filter((file) => !/\buse(SheetBack|SettleAround)\(/.test(readFileSync(file, 'utf8')));
    expect(bare).toEqual([]);
  });
});
