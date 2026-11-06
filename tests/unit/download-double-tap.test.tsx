// tests/unit/download-double-tap.test.tsx — the two buttons that save a file take one tap per moment (mw-5r3p30.1101, found in mw-5r3p30.1093's sweep of launchers):
// 'Download my recording' (ReadCheck, Developer mode) and Memory's 'Export'. The second tap of a double tap would save the same file twice; the Export's file is made
// by an await, so a second tap must not start a second one while the first is still being made.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadSeam, type Clip } from '../../src/audio/clip';
import { ClipPlayer } from '../../src/audio/clipPlayer';
import { setDeveloper } from '../../src/data/repositories';
import { MemoryScreen } from '../../src/MemoryScreen';
import { MyReading } from '../../src/ReadCheck';
import { SETTLE_MS, settle } from '../../src/ui/settle';
import { ASYNC_WAIT_MS } from '../support/timeouts';

/** The Export's file: made when `release` is called, if a test holds it. */
const made = vi.hoisted(() => ({ hold: null as Promise<string> | null }));
vi.mock('../../src/data/repositories/memory', async (original) => {
  const actual = await original<typeof import('../../src/data/repositories/memory')>();
  return { ...actual, exportMemory: () => made.hold ?? actual.exportMemory() };
});

const FILE_LINE = /Saved lampas-memory-\d{4}-\d{2}-\d{2}\.json\./;
const timeout = ASYNC_WAIT_MS;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clip: Clip = { bytes: new Uint8Array([1, 2, 3]).buffer, mime: 'audio/webm' };
const NAME = 'lampas-rom.8.28-20261009T120000Z.webm';

let saved: string[];
let before: number;
beforeEach(async () => {
  // oneTap remembers the last tap for the whole page: let the previous test's moment pass, as a later tap would
  await wait(SETTLE_MS + 50);
  before = settle.ms;
  settle.ms = SETTLE_MS;
  saved = [];
  vi.spyOn(downloadSeam, 'save').mockImplementation((name) => void saved.push(name));
});
afterEach(() => {
  cleanup();
  settle.ms = before;
  made.hold = null;
  vi.restoreAllMocks();
});

describe('Download my recording', () => {
  const show = async () => {
    await setDeveloper('on');
    render(<MyReading clip={clip} fileName={NAME} player={new ClipPlayer(() => {})} />);
    return screen.findByRole('button', { name: 'Download my recording' });
  };

  it('saves one file for a double tap', async () => {
    const button = await show();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(saved).toEqual([NAME]);
  });

  it('saves again for a tap after the moment, with the same label and file name', async () => {
    const button = await show();
    fireEvent.click(button);
    await wait(SETTLE_MS + 50);
    fireEvent.click(button);
    expect(saved).toEqual([NAME, NAME]);
  });
});

describe('Export', () => {
  const FILE = /^lampas-memory-\d{4}-\d{2}-\d{2}\.json$/;

  it('saves one file for a double tap while the file is still being made', async () => {
    let release: (text: string) => void = () => {};
    made.hold = new Promise<string>((resolve) => (release = resolve));
    render(<MemoryScreen />);
    const button = await screen.findByRole('button', { name: 'Export' });
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => release('{}'));
    await screen.findByText(FILE_LINE);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatch(FILE);
  });

  it('saves one file for a double tap when the file is made at once', async () => {
    render(<MemoryScreen />);
    const button = await screen.findByRole('button', { name: 'Export' });
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    await screen.findByText(FILE_LINE);
    expect(saved).toHaveLength(1);
  });

  it('does not save a second file for a tap after the moment while the first is still being made', async () => {
    let release: (text: string) => void = () => {};
    made.hold = new Promise<string>((resolve) => (release = resolve));
    render(<MemoryScreen />);
    const button = await screen.findByRole('button', { name: 'Export' });
    fireEvent.click(button);
    await wait(SETTLE_MS + 50);
    fireEvent.click(button);
    await act(async () => release('{}'));
    await screen.findByText(FILE_LINE);
    expect(saved).toHaveLength(1);
  });

  it('saves again for a tap after the first file is saved and the moment has passed', async () => {
    render(<MemoryScreen />);
    const button = await screen.findByRole('button', { name: 'Export' });
    await act(async () => fireEvent.click(button));
    await screen.findByText(FILE_LINE);
    await wait(SETTLE_MS + 50);
    await act(async () => fireEvent.click(button));
    await vi.waitFor(() => expect(saved).toHaveLength(2), { timeout });
    expect(saved[1]).toMatch(FILE);
  });
});
