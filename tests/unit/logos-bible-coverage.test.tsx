// Bible in Logos by part (mw-5r3p30.889): each Bible of the catalogue knows the parts it holds (built from the library export's ReferenceSupersets), each part's picker lists only
// Bibles that hold that part, the Apocrypha starts in his NRSV, and a saved Apocrypha Bible that has none moves to it once, with a note under the row.
import 'fake-indexeddb/auto';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getLogosBibles, moveApocryphaBible, setLogosBible, setLogosBibleFor } from '../../src/data/repositories';
import { LogosBibleControl } from '../../src/settings/controls/resources';
import { rowOf } from '../../src/settings/rows';
import { entryOf } from '../../src/resources/catalogue';
import { DEFAULT_APOCRYPHA_BIBLE, DEFAULT_LOGOS_BIBLE, biblesFor, bibleFor } from '../../src/resources/logosBible';
import { partsOfSupersets } from '../../src/library/parseExport';

const LSB = 'LLS:LGCYSTNDRDBBLSB';
const NRSV = 'LLS:1.0.50';
const ESV = 'LLS:1.0.710';
const ids = (part: 'nt' | 'ot' | 'apocrypha'): string[] => biblesFor(part).map((b) => b.id);

afterAll(() => {
  cleanup();
  db.close();
});
beforeEach(async () => {
  cleanup();
  await db.open();
  await db.settings.clear();
});

describe('the parts a Bible of the catalogue holds', () => {
  it('are in the catalogue: LSB has the New Testament and the Old, not the Apocrypha; NRSV has all three; KJV Apoc (the Apocrypha volume alone, as its ranges read) has the Apocrypha', () => {
    expect(entryOf(LSB)?.parts).toEqual(['nt', 'ot']);
    expect(entryOf(NRSV)?.parts).toEqual(['nt', 'ot', 'apocrypha']);
    expect(entryOf('LLS:1.0.4')?.parts).toEqual(['apocrypha']);
  });

  it('are read from a ReferenceSupersets cell: separate ranges say what each holds, a range that ends inside the Apocrypha holds it, one that spans the gap is not enough to say', () => {
    expect(partsOfSupersets('bible.1.1.1-39.4.6\tbible.61.1.1-87.22.21')).toEqual(['nt', 'ot']);
    expect(partsOfSupersets('bible+kjv.1-39\tbible+kjv.61-87')).toEqual(['nt', 'ot']);
    expect(partsOfSupersets('bible+nrsv.1.1.1-87.22.21')).toEqual(['nt', 'ot']);
    expect(partsOfSupersets('bible+lxx2.1.1.1-58.14.46')).toEqual(['ot', 'apocrypha']);
    expect(partsOfSupersets('bible+vul2.1.1.1-56.16.78')).toEqual(['ot', 'apocrypha']);
    expect(partsOfSupersets('bible+brenton.1.1.1-53.1.15')).toEqual(['ot', 'apocrypha']);
    expect(partsOfSupersets('bible+cap.52.1.1-17.F.11')).toEqual(['apocrypha']);
    expect(partsOfSupersets('bible+bhs.1.1.1-14.36.23')).toEqual(['ot']);
    expect(partsOfSupersets('')).toEqual([]);
  });
});

describe('the picker of each part', () => {
  it('lists, for the Apocrypha, only Bibles that hold it: his NRSV, RSV, RSVCE, KJV Apoc, CEB, LES and Brenton, and no LSB', () => {
    const list = ids('apocrypha');
    for (const id of [NRSV, 'LLS:1.0.40', 'LLS:1.0.41', 'LLS:1.0.4', 'LLS:CEB', 'LLS:LELXX', 'LLS:BRENTONLXXEN']) expect(list, id).toContain(id);
    expect(list).not.toContain(LSB);
    expect(list).not.toContain(ESV);
  });

  it('lists, for the Old Testament, the Bibles that hold it and his Lexham Hebrew Bible; for the New Testament none that lacks it', () => {
    expect(ids('ot')).toContain(LSB);
    expect(ids('ot')).toContain('LLS:LHB');
    expect(ids('nt')).toContain(LSB);
    expect(ids('nt')).not.toContain('LLS:LHB');
    expect(ids('nt')).not.toContain('LLS:BRENTONLXXEN');
  });
});

describe('Apocrypha Bible in Logos on the Settings screen', () => {
  const optionIds = async (): Promise<string[]> => {
    const row = rowOf('logosBibleApocrypha')!;
    render(<LogosBibleControl row={row} />);
    const select = await screen.findByRole('combobox', { name: 'Apocrypha Bible in Logos' });
    return within(select).getAllByRole('option').map((o) => (o as HTMLOptionElement).value);
  };

  it('offers NRSV and not LSB, and shows NRSV chosen while he has chosen none', async () => {
    const options = await optionIds();
    expect(options).toContain(NRSV);
    expect(options).not.toContain(LSB);
    expect(screen.getByRole('combobox', { name: 'Apocrypha Bible in Logos' })).toHaveValue(NRSV);
  });
});

describe('the Apocrypha Bible he keeps', () => {
  it('starts as NRSV, while the New Testament starts as the Legacy Standard Bible', async () => {
    expect(DEFAULT_APOCRYPHA_BIBLE).toBe(NRSV);
    expect(await getLogosBibles()).toEqual({ nt: DEFAULT_LOGOS_BIBLE, ot: DEFAULT_LOGOS_BIBLE, apocrypha: NRSV });
    expect(bibleFor('tob', await getLogosBibles())).toBe(NRSV);
  });

  it('moves from a Bible that has no Apocrypha (his LSB) to NRSV once, and says so in a note under the row', async () => {
    await setLogosBible(LSB);
    expect(await moveApocryphaBible()).toBe(true);
    expect((await getLogosBibles()).apocrypha).toBe(NRSV);
    expect(await db.settings.get('logosBibleApocrypha')).toMatchObject({ value: NRSV });
    // once: asking again moves nothing
    expect(await moveApocryphaBible()).toBe(false);
    const row = rowOf('logosBibleApocrypha')!;
    render(<LogosBibleControl row={row} />);
    expect(await screen.findByText(/Legacy Standard Bible has no Apocrypha, so Tobit and the rest open in NRSV/)).toBeInTheDocument();
  });

  it('keeps a Bible that has the Apocrypha, and a typed Resource ID, as it is', async () => {
    await setLogosBibleFor('apocrypha', 'LLS:1.0.41');
    expect(await moveApocryphaBible()).toBe(false);
    expect((await getLogosBibles()).apocrypha).toBe('LLS:1.0.41');
    await setLogosBibleFor('apocrypha', 'LLS:MYOWNBIBLE');
    expect(await moveApocryphaBible()).toBe(false);
    expect((await getLogosBibles()).apocrypha).toBe('LLS:MYOWNBIBLE');
  });

  it('is not left on a Bible without it when the Library chooses one Bible for all three parts', async () => {
    await setLogosBible(ESV);
    expect(await getLogosBibles()).toEqual({ nt: ESV, ot: ESV, apocrypha: NRSV });
  });
});

describe('In another book at a place', () => {
  it('offers a Bible that holds the place’s part: the Lexham Hebrew Bible at Jonah, not at Romans', async () => {
    const { inLogosRows } = await import('../../src/library/inLogos');
    const { entriesOf } = await import('../../src/resources/catalogue');
    const on = new Map(entriesOf('bible').map((e) => [e.resource, 'on' as const]));
    const at = (book: string): string[] => inLogosRows(entriesOf('bible'), on, { book, chapter: 1, verse: 1 }).map((r) => r.entry.resource);
    expect(at('jon')).toContain('LLS:LHB');
    expect(at('rom')).not.toContain('LLS:LHB');
  });
});
