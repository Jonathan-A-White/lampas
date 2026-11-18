// The Septuagint door (src/reader/SeptuagintDoor.tsx) names and opens the Septuagint he chose in Logos only when that Bible is offered: his import holds it (src/data/owned.ts isOffered,
// mw-qtu3zvz.208), as the Library's Bibles row already does (mw-qtu3zvz.184). With no import, or an import lacking it, the door is not drawn and no link into Logos is made.
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setLogosBibleFor, setResourceOn } from '../../src/data/repositories';
import { SeptuagintDoor } from '../../src/reader/SeptuagintDoor';
import { InLogosDoors } from '../../src/library/InLogosDoors';
import { offeredBibleFor } from '../../src/library/bibleParts';
import { DEFAULT_LOGOS_BIBLE, DEFAULT_SEPTUAGINT_BIBLE } from '../../src/resources/logosBible';
import { verseChips } from '../../src/resources/tutorLinks';
import { keepImport } from '../support/logos-import';

const DOOR = 'Read it in Logos: LXX Swete';

beforeEach(async () => {
  await db.open();
  await Promise.all([db.exportRows.clear(), db.settings.clear(), db.library.clear(), db.meta.clear()]);
  await setResourceOn('logos', true);
});
afterEach(async () => {
  await db.exportRows.clear();
});

describe('the Septuagint door', () => {
  it('is not offered with Logos On and no import', async () => {
    render(<SeptuagintDoor book="gen" chapter={7} />);
    // the door settles once the settings are read; give it the moment it needs, then look
    await new Promise((r) => setTimeout(r, 150)); // a real-time wait: the door draws nothing, so there is no condition to wait on
    expect(screen.queryByText(DOOR)).toBeNull();
    expect(document.querySelector('[data-septuagint-door]')).toBeNull();
  });

  it('is not offered when his import lacks the Septuagint he chose', async () => {
    await keepImport(['LLS:SOMEOTHERBOOK']);
    render(<SeptuagintDoor book="gen" chapter={7} />);
    await new Promise((r) => setTimeout(r, 150)); // a real-time wait: the door draws nothing, so there is no condition to wait on
    expect(screen.queryByText(DOOR)).toBeNull();
  });

  it('is offered when his import holds it', async () => {
    await keepImport([DEFAULT_SEPTUAGINT_BIBLE]);
    render(<SeptuagintDoor book="gen" chapter={7} />);
    const door = await screen.findByText(DOOR);
    expect(door.closest('a')?.getAttribute('href')).toBe('logosres:LLS:OTGRKSWETETXT;ref=Bible.Ge7');
  });

  it('keeps a Resource ID he typed that no catalogue row names', async () => {
    await setLogosBibleFor('septuagint', 'LLS:MYOWNLXX');
    render(<SeptuagintDoor book="gen" chapter={7} />);
    await waitFor(() => expect(document.querySelector('[data-septuagint-door]')).not.toBeNull());
  });
});

// The same check stands behind every other door that opens a place in his Bible in Logos (mw-qtu3zvz.208): the verse door, the reference card, Today's chapters and the tutor's verse chips.
describe('the other doors into his Bible in Logos', () => {
  it('offeredBibleFor names the Bible only while his import holds it (or he typed the ID)', () => {
    const bibles = { nt: DEFAULT_LOGOS_BIBLE, ot: DEFAULT_LOGOS_BIBLE, apocrypha: 'LLS:MYOWN', septuagint: DEFAULT_SEPTUAGINT_BIBLE };
    expect(offeredBibleFor('rom', bibles, new Set())).toBeUndefined();
    expect(offeredBibleFor('rom', bibles, new Set([DEFAULT_LOGOS_BIBLE]))).toBe(DEFAULT_LOGOS_BIBLE);
    expect(offeredBibleFor('sir', bibles, new Set())).toBe('LLS:MYOWN');
  });

  it('verseChips draws no Logos chip for a Bible that is not offered', () => {
    const chosen = { on: ['logos'], options: {}, pinnedLexicons: [] } as unknown as Parameters<typeof verseChips>[2];
    const place = { book: 'rom', chapter: 8, verse: 1 };
    expect(verseChips(place, 'Romans 8:1', chosen, undefined)).toEqual([]);
    expect(verseChips(place, 'Romans 8:1', chosen, DEFAULT_LOGOS_BIBLE).length).toBe(1);
  });

  it('In Logos is not drawn with no import and is drawn when his import holds his Bible', async () => {
    const place = { book: 'rom', chapter: 8, verse: 1 };
    const { unmount } = render(<InLogosDoors place={place} name="Romans 8:1" entries={[]} />);
    await screen.findByRole('group', { name: 'Romans 8:1 in Logos' });
    expect(screen.queryByRole('link', { name: /In Logos/ })).toBeNull();
    unmount();
    await keepImport([DEFAULT_LOGOS_BIBLE]);
    render(<InLogosDoors place={place} name="Romans 8:1" entries={[]} />);
    expect(await screen.findByRole('link', { name: /In Logos/ })).toBeTruthy();
  });
});
