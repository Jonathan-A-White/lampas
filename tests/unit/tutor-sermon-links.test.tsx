// The tutor's sermon link (mw-qtu3zvz.6): {kind: 'sermon', sermon: '<source>:<id>'} in a Bible talk answer is drawn as the chip 'Sermon: <title> ↗', a plain link to where the sermon lives that does not
// leave the Talk sheet; an id the request's rows lack draws nothing. sermonChip finds it among the rows.
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { sermonChip } from '../../src/resources/tutorLinks';
import { TutorLinks } from '../../src/TutorLinks';
import { setSermonSources } from '../../src/sermons';
import { closeSermonText, useOpenedText } from '../../src/sermons/sermonText';
import { openWebSetting } from '../../src/settings/definitions/sermons';
import { setSetting } from '../../src/settings/store';
import { row, sourceOf } from '../support/sermon-sources';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';

const place = { book: 'rom', chapter: 5 };
const rows = [row('testsermons', 'love', 'Love Commended', ['rom', 5, 8, 8], 'Test Preacher'), row('testsermons', 'peace', 'Peace with God', ['rom', 5, 1, 11], 'Test Preacher')];

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  registerTestSermons();
});

afterEach(() => {
  cleanup();
  closeSermonText();
  vi.restoreAllMocks();
  forgetTestSermons();
});

describe('sermonChip', () => {
  it("is 'Sermon: <title> ↗' for a '<source>:<id>' among the rows", () => {
    expect(sermonChip('testsermons:love', rows)).toMatchObject({ label: 'Sermon: Love Commended ↗', row: { id: 'love' } });
  });

  it('is no chip for an id the rows lack, for a bare id, or for no rows', () => {
    expect(sermonChip('testsermons:nope', rows)).toBeNull();
    expect(sermonChip('love', rows)).toBeNull();
    expect(sermonChip('testsermons:love', [])).toBeNull();
  });
});

describe('the sermon chip', () => {
  it('is a plain link to the sermon where it lives, in a new tab, and does not leave the Talk sheet', async () => {
    const onLeave = vi.fn();
    render(<TutorLinks links={[{ kind: 'sermon', sermon: 'testsermons:love' }]} place={place} verse={8} onLeave={onLeave} />);
    const chip = await screen.findByRole('link', { name: 'Sermon: Love Commended ↗' });
    expect(chip).toHaveAttribute('href', 'https://sermons.test/testsermons/love');
    expect(chip).toHaveAttribute('target', '_blank');
    chip.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(chip);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('opens the row’s Subsplash address, not its YouTube url, as the Sermons sheet does; any other alt leaves the url', async () => {
    const subsplash = { ...row('altsource', 'love', 'Love Commended', ['rom', 5, 8, 8], 'Test Preacher'), open: { url: 'https://www.youtube.com/watch?v=abc' }, alt: 'https://brookfieldfirst.subspla.sh/x' };
    const gems = { ...row('altsource', 'peace', 'Peace with God', ['rom', 5, 1, 11], 'Test Preacher'), open: { url: 'https://www.youtube.com/watch?v=def' }, alt: 'https://www.spurgeongems.org/sermon/chs1.pdf' };
    setSermonSources([sourceOf('altsource', 'Alt Sermons', { rom: [subsplash, gems] })]);
    render(<TutorLinks links={[{ kind: 'sermon', sermon: 'altsource:love' }, { kind: 'sermon', sermon: 'altsource:peace' }]} place={place} verse={8} onLeave={() => undefined} />);
    expect(await screen.findByRole('link', { name: 'Sermon: Love Commended ↗' })).toHaveAttribute('href', 'https://brookfieldfirst.subspla.sh/x');
    expect(await screen.findByRole('link', { name: 'Sermon: Peace with God ↗' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=def');
  });

  describe('under "Open web sermons in" (mw-qtu3zvz.49.25)', () => {
    const ANDROID = 'Mozilla/5.0 (Linux; Android 16; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
    const intentOf = (address: string): string => {
      const u = new URL(address);
      return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=org.mozilla.firefox;S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
    };
    const subsplash = { ...row('altsource', 'love', 'Love Commended', ['rom', 5, 8, 8], 'Test Preacher'), open: { url: 'https://www.youtube.com/watch?v=abc' }, alt: 'https://brookfieldfirst.subspla.sh/x104' };

    it('with Firefox chosen on Android is the Firefox intent, the https address its fallback, and not a new tab', async () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID);
      await setSetting(openWebSetting, 'firefox');
      render(<TutorLinks links={[{ kind: 'sermon', sermon: 'testsermons:love' }]} place={place} verse={8} onLeave={() => undefined} />);
      const chip = await screen.findByRole('link', { name: 'Sermon: Love Commended ↗' });
      await waitFor(() => expect(chip.getAttribute('href')).toMatch(/^intent:\/\//));
      expect(chip).toHaveAttribute('href', intentOf('https://sermons.test/testsermons/love'));
      expect(chip).not.toHaveAttribute('target');
    });

    it('with Firefox chosen on Android leaves the row’s Subsplash address, which is the fallback, as a plain https link: it is a video (mw-qtu3zvz.62)', async () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID);
      await setSetting(openWebSetting, 'firefox');
      setSermonSources([sourceOf('altsource', 'Alt Sermons', { rom: [subsplash] })]);
      render(<TutorLinks links={[{ kind: 'sermon', sermon: 'altsource:love' }]} place={place} verse={8} onLeave={() => undefined} />);
      const chip = await screen.findByRole('link', { name: 'Sermon: Love Commended ↗' });
      await waitFor(() => expect(chip).toHaveAttribute('href', 'https://brookfieldfirst.subspla.sh/x104'));
      expect(chip).toHaveAttribute('target', '_blank');
    });

    it('with This browser chosen on Android is the https address in a new tab, as before', async () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID);
      await setSetting(openWebSetting, 'browser');
      render(<TutorLinks links={[{ kind: 'sermon', sermon: 'testsermons:love' }]} place={place} verse={8} onLeave={() => undefined} />);
      const chip = await screen.findByRole('link', { name: 'Sermon: Love Commended ↗' });
      expect(chip).toHaveAttribute('href', 'https://sermons.test/testsermons/love');
      expect(chip).toHaveAttribute('target', '_blank');
    });
  });

  describe('under "Lampas, read aloud" (mw-ecpivg5.4)', () => {
    const spurgeon = row('spurgeon-ccel', '311', 'The Beginning, Increase, and End of the Divine Life', ['rom', 5, 8, 8], 'C. H. Spurgeon');
    const video = { ...row('spurgeon-ccel', 'v1', 'A Video One', ['rom', 5, 8, 8]), open: { url: 'https://www.youtube.com/watch?v=abcdefghijk' } };
    const other = row('henry-sermons', 'h1', 'Henry on Love', ['rom', 5, 8, 8], 'Matthew Henry');
    // what the reader's host listens to: the sermon open in the reader
    const Reader = () => <span data-testid="reader">{useOpenedText()?.id ?? 'none'}</span>;
    const draw = (sermon: string) =>
      render(
        <>
          <TutorLinks links={[{ kind: 'sermon', sermon }]} place={place} verse={8} onLeave={() => undefined} />
          <Reader />
        </>,
      );
    beforeEach(() => {
      setSermonSources([sourceOf('spurgeon-ccel', 'Spurgeon Sermons', { rom: [spurgeon, video] }), sourceOf('henry-sermons', 'Henry Sermons', { rom: [other] })]);
    });

    it('opens the reader on a text sermon of a served source, and does not follow the link or leave the Talk sheet', async () => {
      await setSetting(openWebSetting, 'lampas');
      const onLeave = vi.fn();
      render(
        <>
          <TutorLinks links={[{ kind: 'sermon', sermon: 'spurgeon-ccel:311' }]} place={place} verse={8} onLeave={onLeave} />
          <Reader />
        </>,
      );
      const chip = await screen.findByRole('link', { name: /^Sermon: The Beginning/ });
      const followed = vi.fn();
      // the document sees the click after the chip's own handler (React listens on the root): a prevented click follows no link
      const see = (event: Event): void => followed(event.defaultPrevented);
      document.addEventListener('click', see);
      await userEvent.click(chip);
      document.removeEventListener('click', see);
      expect(screen.getByTestId('reader')).toHaveTextContent('311');
      expect(followed).toHaveBeenCalledWith(true);
      expect(onLeave).not.toHaveBeenCalled();
    });

    it('keeps the web link for a video of the source and for a source the index serves no words of', async () => {
      await setSetting(openWebSetting, 'lampas');
      for (const id of ['spurgeon-ccel:v1', 'henry-sermons:h1']) {
        draw(id);
        const chip = await screen.findByRole('link', { name: /^Sermon:/ });
        chip.addEventListener('click', (event) => event.preventDefault());
        await userEvent.click(chip);
        expect(screen.getByTestId('reader')).toHaveTextContent('none');
        expect(chip).toHaveAttribute('target', '_blank');
        cleanup();
      }
    });

    it.each(['browser', 'firefox'] as const)('keeps the web link under %s', async (choice) => {
      await setSetting(openWebSetting, choice);
      draw('spurgeon-ccel:311');
      const chip = await screen.findByRole('link', { name: /^Sermon: The Beginning/ });
      chip.addEventListener('click', (event) => event.preventDefault());
      await userEvent.click(chip);
      expect(screen.getByTestId('reader')).toHaveTextContent('none');
      expect(chip).toHaveAttribute('href', 'https://sermons.test/spurgeon-ccel/311');
    });
  });

  it('is not drawn for an id the passage lacks, and nothing at all is drawn when it is the only link', async () => {
    render(<TutorLinks links={[{ kind: 'sermon', sermon: 'testsermons:invented' }]} place={place} verse={8} onLeave={() => undefined} />);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('link', { name: /^Sermon:/ })).toBeNull();
    expect(document.querySelector('[data-tutor-links]')).toBeNull();
  });

  it('is not drawn in a talk with no place (a talk from a screen)', async () => {
    render(<TutorLinks links={[{ kind: 'sermon', sermon: 'testsermons:love' }]} onLeave={() => undefined} />);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('link', { name: /^Sermon:/ })).toBeNull();
  });
});
