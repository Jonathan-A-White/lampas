// The setting When you copy (mw-9txn0x1.1, Settings > Reading): four rows of chips, each a setting with its default, and a preview of Colossians 3:1 as it will
// be copied under the last. The pure text is tests/unit/copy-format.test.ts; the Verse view's Copy is features/copy-format.feature.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkActions } from '../../src/ui/LinkActions';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { copyLinkSetting, copyNumbersSetting, copyReferenceSetting, copyTextSetting } from '../../src/settings/definitions';
import { CopyFormatControl } from '../../src/settings/controls/appearance';
import { rowOf } from '../../src/settings/rows';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  window.localStorage.clear();
  stubChapterFetch();
  await db.open();
  await db.settings.clear();
});

afterEach(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
});

describe('the four settings of When you copy', () => {
  it('are in Settings > Reading with the defaults English, after, on and on', () => {
    for (const setting of [copyTextSetting, copyReferenceSetting, copyNumbersSetting, copyLinkSetting]) {
      expect(setting.section).toBe('reading');
      expect(setting.hint).toBeTruthy();
      expect(setting.help).toBeTruthy();
    }
    expect([copyTextSetting.default, copyReferenceSetting.default, copyNumbersSetting.default, copyLinkSetting.default]).toEqual(['english', 'after', 'on', 'on']);
    expect(copyTextSetting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'english' }, { value: 'original' }, { value: 'both' }] });
    expect(copyReferenceSetting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'after' }, { value: 'before' }, { value: 'off' }] });
  });

  it('read back a saved choice, else the default', () => {
    expect(copyTextSetting.parse('both')).toBe('both');
    expect(copyTextSetting.parse('nonsense')).toBe('english');
    expect(copyLinkSetting.parse('off')).toBe('off');
    expect(copyLinkSetting.parse(undefined)).toBe('on');
  });
});

describe('the rows of When you copy', () => {
  it('a chip writes its setting', async () => {
    const row = rowOf('copyReference');
    if (!row) throw new Error('no copyReference row');
    render(<CopyFormatControl row={row} />);
    const group = await screen.findByRole('group', { name: row.label });
    expect(within(group).getByRole('button', { name: 'After' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: 'Before' }));
    await waitFor(() => expect(within(group).getByRole('button', { name: 'Before' })).toHaveAttribute('aria-pressed', 'true'));
    expect(await db.settings.get('copyReference')).toMatchObject({ value: 'before' });
  });

  it('the last row previews Colossians 3:1 as it will be copied, and follows a change', async () => {
    const row = rowOf('copyLink');
    if (!row) throw new Error('no copyLink row');
    const { container } = render(<CopyFormatControl row={row} />);
    const preview = async () => (await waitFor(() => container.querySelector('[data-copy-preview]') as HTMLElement));
    await waitFor(async () => expect((await preview()).textContent).toContain('— Colossians 3:1 (MSB)\nhttps://lampas.allmymind.org/#/?ref=Col.3.1'));
    await act(async () => {
      await db.settings.put({ key: 'copyReference', value: 'before' });
      await db.settings.put({ key: 'copyLink', value: 'off' });
    });
    await waitFor(async () => expect((await preview()).textContent?.startsWith('Colossians 3:1 (MSB)\n')).toBe(true));
    expect((await preview()).textContent).not.toContain('https://');
  });

  it('only the last row has the preview', async () => {
    const row = rowOf('copyText');
    if (!row) throw new Error('no copyText row');
    const { container } = render(<CopyFormatControl row={row} />);
    await screen.findByRole('group', { name: row.label });
    expect(container.querySelector('[data-copy-preview]')).toBeNull();
  });
});

describe('LinkActions given the text to copy', () => {
  it('copies it, says Copied, and shows it to copy by hand where the clipboard is refused', async () => {
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('no')) } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false });
    render(<LinkActions url="https://example.org/u" title="Colossians 3:1" text={'Words\n— Colossians 3:1 (MSB)\nhttps://example.org/u'} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    const box = await screen.findByRole('textbox', { name: 'Text to copy' });
    expect(box).toHaveValue('Words\n— Colossians 3:1 (MSB)\nhttps://example.org/u');
  });

  it('shares the text without the link and the link as the share\'s url', async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(window.navigator, 'share', { configurable: true, value: share });
    render(<LinkActions url="https://example.org/u" title="Colossians 3:1" text="Words\nhttps://example.org/u" shareText="Words" shareUrl="https://example.org/u" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Colossians 3:1', text: 'Words', url: 'https://example.org/u' }));
    Object.defineProperty(window.navigator, 'share', { configurable: true, value: undefined });
  });
});
