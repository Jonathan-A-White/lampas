// The setting When you copy (mw-9txn0x1.1, Settings > Reading): four rows of chips, each a setting with its default, and a preview of Colossians 3:1 as it will
// be copied under the last. The pure text is tests/unit/copy-format.test.ts; the Verse view's Copy is features/copy-format.feature.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkActions } from '../../src/ui/LinkActions';
import { db } from '../../src/data/db';
import { setGreekInterest, setReaderView } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { copyLinkSetting, copyNumbersSetting, copyReferenceSetting } from '../../src/settings/definitions';
import { CopyFormatControl } from '../../src/settings/controls/appearance';
import { readValues, ROWS, rowOf } from '../../src/settings/rows';
import { DEFINITIONS } from '../../src/settings/definitions';
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

describe('the three settings of When you copy', () => {
  it('are in Settings > Reading with the defaults after, on and on', () => {
    for (const setting of [copyReferenceSetting, copyNumbersSetting, copyLinkSetting]) {
      expect(setting.section).toBe('reading');
      expect(setting.hint).toBeTruthy();
      expect(setting.help).toBeTruthy();
    }
    expect([copyReferenceSetting.default, copyNumbersSetting.default, copyLinkSetting.default]).toEqual(['after', 'on', 'on']);
    expect(copyReferenceSetting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'after' }, { value: 'before' }, { value: 'off' }] });
  });

  it('read back a saved choice, else the default', () => {
    expect(copyLinkSetting.parse('off')).toBe('off');
    expect(copyLinkSetting.parse(undefined)).toBe('on');
  });

  it('have no Copy: text: no definition, no row, and an old stored value is not read as one', async () => {
    expect(DEFINITIONS.map((d) => d.key)).not.toContain('copyText');
    expect(ROWS.map((r) => r.key)).not.toContain('copyText');
    expect(ROWS.map((r) => r.label)).not.toContain('Copy: text');
    await db.settings.put({ key: 'copyText', value: 'english' });
    expect(await readValues()).not.toHaveProperty('copyText');
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

  it('the preview shows the verse in the view he reads in, with As you read it', async () => {
    await setGreekInterest(5);
    await setReaderView('greek');
    const row = rowOf('copyLink');
    if (!row) throw new Error('no copyLink row');
    const { container } = render(<CopyFormatControl row={row} />);
    await waitFor(() => expect(container.querySelector('[data-copy-preview]')?.textContent).toContain('Εἰ οὖν συνηγέρθητε τῷ χριστῷ τὰ ἄνω ζητεῖτε'));
  });

  it('only the last row has the preview', async () => {
    const row = rowOf('copyReference');
    if (!row) throw new Error('no copyReference row');
    const { container } = render(<CopyFormatControl row={row} />);
    await screen.findByRole('group', { name: row.label });
    expect(container.querySelector('[data-copy-preview]')).toBeNull();
  });

  it('the first row says what Copy gives: the words as you read them on screen, with the variants you have on', async () => {
    const row = rowOf('copyReference');
    if (!row) throw new Error('no copyReference row');
    const { container } = render(<CopyFormatControl row={row} />);
    await screen.findByRole('group', { name: row.label });
    const line = container.querySelector('[data-copy-gives]');
    expect(line?.textContent).toBe('Copy and Share give the words as you read them on screen: English, Weave or Greek, with the variants you have on.');
    expect(line?.nextElementSibling?.getAttribute('data-setting')).toBe('copyReference');
  });

  it('the other rows do not say it again', async () => {
    for (const key of ['copyNumbers', 'copyLink']) {
      const row = rowOf(key);
      if (!row) throw new Error(`no ${key} row`);
      const { container } = render(<CopyFormatControl row={row} />);
      await screen.findByRole('group', { name: row.label });
      expect(container.querySelector('[data-copy-gives]')).toBeNull();
      cleanup();
    }
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
