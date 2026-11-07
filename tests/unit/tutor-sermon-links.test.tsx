// The tutor's sermon link (mw-qtu3zvz.6): {kind: 'sermon', sermon: '<source>:<id>'} in a Bible talk answer is drawn as the chip 'Sermon: <title> ↗', a plain link to where the sermon lives that does not
// leave the Talk sheet; an id the request's rows lack draws nothing. sermonChip finds it among the rows.
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { sermonChip } from '../../src/resources/tutorLinks';
import { TutorLinks } from '../../src/TutorLinks';
import { row } from '../support/sermon-sources';
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
