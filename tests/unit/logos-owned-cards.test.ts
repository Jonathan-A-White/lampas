// A Logos book that is On or Pinned on his shelf but that his import does not hold is offered nowhere (mw-qtu3zvz.126, src/data/owned.ts isOffered): not as a map card
// (src/maps/sources/logosatlas.ts, the Lexham Geographic Commentary row), not in the digest of his shelf the tutor is told (worksForTutor, the registry's `works` fact), and not as the chip
// of a book the tutor links (workChip, the `open-work` place and the chips under an answer). The callers read the shelf through offeredShelfOf; this holds them to it (mw-qtu3zvz.206).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { offeredShelfOf, setResourceOn, setState } from '../../src/data/repositories';
import { mapsFor, setMapSources } from '../../src/maps';
import { setPlaceLoader } from '../../src/maps/places';
import { logosAtlas } from '../../src/maps/sources/logosatlas';
import { CATALOGUE } from '../../src/resources/catalogue';
import { GRAMMAR_BOOKS } from '../../src/resources/grammarBooks';
import { workChip } from '../../src/resources/tutorLinks';
import { workOf } from '../../src/resources/works';
import { lampasRegistry, workDoor } from '../../src/tutor/registry';
import { keepImport } from '../support/logos-import';

const LGC = 'LLS:LXGEOCOMMPENT';
const registry = lampasRegistry();
const calvin = workOf('calvin-commentaries')!.volumes[0].resource;
const grammar = GRAMMAR_BOOKS[0];

beforeEach(async () => {
  await db.open();
  await Promise.all([db.exportRows.clear(), db.settings.clear(), db.library.clear(), db.meta.clear()]);
  setMapSources([logosAtlas]);
  setPlaceLoader(async () => []);
  await setResourceOn('logos', true);
});
afterEach(() => {
  setMapSources(undefined);
  setPlaceLoader(undefined);
  vi.restoreAllMocks();
});

const commentaryCard = async () => (await mapsFor({ book: 'gen', chapter: 10, from: 19 })).filter((c) => c.title.startsWith('Lexham'));
const told = async () => {
  const read = await registry.read('works');
  return (read as { value: unknown[] }).value;
};

describe('a book On the shelf that his import does not hold', () => {
  it('is no map card, and is one once the import holds it', async () => {
    await setState(LGC, 'on');
    expect(await commentaryCard()).toEqual([]);
    await keepImport([LGC]);
    expect((await commentaryCard()).map((c) => c.id)).toEqual([LGC]);
  });

  it('is no map card when Pinned either', async () => {
    await setState(LGC, 'pinned');
    expect(await commentaryCard()).toEqual([]);
  });

  it('is not in the digest the tutor is told, and is once the import holds it', async () => {
    await setState(calvin, 'on');
    expect(await told()).toEqual([]);
    await keepImport([calvin]);
    expect(await told()).toEqual([{ more: { commentary: 1 } }]);
  });

  it('is not offered by offeredShelfOf', async () => {
    await setState(grammar.resource, 'on');
    expect(await offeredShelfOf()).toEqual([]);
  });

  it('is not the chip of an open-work, and is once the import holds it', async () => {
    const open = vi.spyOn(workDoor, 'open').mockImplementation(() => undefined);
    await setState(grammar.resource, 'on');
    expect((await registry.open('open-work', { id: grammar.resource })).ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
    await keepImport([grammar.resource]);
    expect((await registry.open('open-work', { id: grammar.resource })).ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('is no chip from workChip when the shelf handed to it is the offered one', async () => {
    await setState(grammar.resource, 'on');
    const offered = (await offeredShelfOf()).map((row) => row.id);
    expect(workChip(grammar.resource, undefined, [], undefined, undefined, offered)).toBeNull();
    expect(CATALOGUE.some((e) => e.resource === grammar.resource)).toBe(true);
  });
});
