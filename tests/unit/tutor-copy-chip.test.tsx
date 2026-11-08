// The tutor's copy and share chips (mw-5r3p30.1075): {kind: 'copy' | 'share', reference} in a Bible talk answer is a chip 'Copy Hebrews 9:11-10:4' that, in one tap, puts the
// text of the range on the clipboard (or hands it to the share sheet), says 'Copied' for COPIED_MS, and says 'Could not read Hebrews 10' when a chapter cannot be read.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MS } from '../../src/copy/useCopyHold';
import { db } from '../../src/data/db';
import { forgetChapters } from '../../src/data/chapter';
import { TutorLinks } from '../../src/TutorLinks';
import { stubChapterFetch } from '../support/chapter-fetch';

let written: string[];
let shared: ShareData[];

const setShare = (value: unknown) => Object.defineProperty(window.navigator, 'share', { configurable: true, value });
const setClipboard = (refuse = false) =>
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (refuse ? Promise.reject(new Error('refused')) : (written.push(text), Promise.resolve())) },
  });

beforeEach(async () => {
  cleanup();
  written = [];
  shared = [];
  stubChapterFetch();
  setShare(undefined);
  setClipboard();
  Object.defineProperty(document, 'execCommand', { configurable: true, value: undefined });
  await db.open();
  await db.settings.clear();
  window.location.hash = '#/';
});

afterAll(async () => {
  // the chips made their text as they were drawn: let the last of that finish before the database closes
  await new Promise((r) => setTimeout(r, 200));
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

describe('the copy chip', () => {
  it('is a button named for the range, and one tap puts the text across the chapter boundary on the clipboard, then says Copied and goes back to Copy', async () => {
    render(<TutorLinks links={[{ kind: 'copy', reference: 'Heb.9.11-10.4' }]} onLeave={() => undefined} />);
    const chip = await screen.findByRole('button', { name: 'Copy Hebrews 9:11-10:4' });
    expect(chip).toHaveTextContent('Copy');
    await userEvent.click(chip);
    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]).toContain(' 10:1 ');
    expect(written[0]).toContain('— Hebrews 9:11-10:4 (MSB)');
    expect(written[0].endsWith('https://lampas.allmymind.org/#/?ref=Heb.9.11')).toBe(true);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Copied Hebrews 9:11-10:4/ })).toHaveTextContent('Copied'));
    // Copied stays for COPIED_MS (2.5 s, inside the 10 s a bare waitFor waits), then the chip is Copy again
    expect(COPIED_MS).toBeLessThan(5000);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy Hebrews 9:11-10:4' })).toHaveTextContent(/^Copy$/));
  });

  it('does not leave the Talk sheet', async () => {
    const onLeave = vi.fn();
    render(<TutorLinks links={[{ kind: 'copy', reference: 'Hebrews 9:11' }]} onLeave={onLeave} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Copy Hebrews 9:11' }));
    await waitFor(() => expect(written).toHaveLength(1));
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('says Could not read Hebrews 10 on the chip when a chapter cannot be read, and puts nothing on the clipboard', async () => {
    const real = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith('/data/heb/10.json') ? Promise.resolve(new Response('no', { status: 500 })) : real(input, init)));
    forgetChapters();
    render(<TutorLinks links={[{ kind: 'copy', reference: 'Heb.9.11-10.4' }]} onLeave={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Copy Hebrews 9:11-10:4' }));
    expect(await screen.findByRole('button', { name: 'Could not read Hebrews 10' })).toHaveTextContent('Could not read Hebrews 10');
    expect(written).toEqual([]);
  });

  it('says the clipboard refused it when the phone refuses', async () => {
    setClipboard(true);
    render(<TutorLinks links={[{ kind: 'copy', reference: 'Hebrews 9:11' }]} onLeave={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Copy Hebrews 9:11' }));
    expect(await screen.findByRole('button', { name: 'Could not copy Hebrews 9:11' })).toBeInTheDocument();
  });

  it('draws no chip for a reference it cannot read, and nothing at all when that is the only link', async () => {
    const { container } = render(<TutorLinks links={[{ kind: 'copy', reference: 'every verse about faith' }]} onLeave={() => undefined} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('[data-tutor-links]')).toBeNull();
  });
});

describe('the share chip', () => {
  it('opens the share sheet with the text, the title and the link, and copies nothing', async () => {
    setShare((data: ShareData) => (shared.push(data), Promise.resolve()));
    render(<TutorLinks links={[{ kind: 'share', reference: 'Hebrews 9:11-10:4' }]} onLeave={() => undefined} />);
    const chip = await screen.findByRole('button', { name: 'Share Hebrews 9:11-10:4' });
    expect(chip).toHaveTextContent('Share');
    await userEvent.click(chip);
    await waitFor(() => expect(shared).toHaveLength(1));
    expect(shared[0].title).toBe('Hebrews 9:11-10:4');
    expect(shared[0].url).toBe('https://lampas.allmymind.org/#/?ref=Heb.9.11');
    expect(shared[0].text).toContain(' 10:1 ');
    expect(written).toEqual([]);
  });

  it('copies it, and says so, where the phone has no share', async () => {
    render(<TutorLinks links={[{ kind: 'share', reference: 'Hebrews 9:11' }]} onLeave={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Share Hebrews 9:11' }));
    await waitFor(() => expect(written).toHaveLength(1));
    expect(await screen.findByRole('button', { name: /^Copied Hebrews 9:11/ })).toHaveTextContent('Copied');
  });

  it('says nothing more when he closes the share sheet (AbortError)', async () => {
    setShare(() => Promise.reject(new DOMException('closed', 'AbortError')));
    render(<TutorLinks links={[{ kind: 'share', reference: 'Hebrews 9:11' }]} onLeave={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Share Hebrews 9:11' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Share Hebrews 9:11' })).toHaveTextContent('Share');
    expect(written).toEqual([]);
  });

  it('copies it instead when the phone refuses the share sheet', async () => {
    setShare(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    render(<TutorLinks links={[{ kind: 'share', reference: 'Hebrews 9:11' }]} onLeave={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Share Hebrews 9:11' }));
    await waitFor(() => expect(written).toHaveLength(1));
  });
});

describe('the links together', () => {
  it('keeps the limit of three links in all, a copy link counting among them', async () => {
    render(
      <TutorLinks
        links={[
          { kind: 'copy', reference: 'Hebrews 9:11' },
          { kind: 'share', reference: 'Hebrews 9:12' },
          { kind: 'copy', reference: 'Hebrews 9:13' },
          { kind: 'copy', reference: 'Hebrews 9:14' },
        ]}
        onLeave={() => undefined}
      />,
    );
    await screen.findByRole('button', { name: 'Copy Hebrews 9:13' });
    expect(screen.queryByRole('button', { name: 'Copy Hebrews 9:14' })).toBeNull();
  });
});
