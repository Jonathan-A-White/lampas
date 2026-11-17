// The last three catalogue pickers ask the one owned-check (mw-qtu3zvz.167, src/data/owned.ts isOffered / offeredEntries): the Go deeper door's books, the Bible pickers of Settings > Bible in Logos, and the
// devotional picker of Settings > Daily. A book his Library import lacks is in none of them; one it holds is in all. (The Settings search is held in settings-library.test.ts.)
import { describe, expect, it } from 'vitest';
import { DEVOTIONALS, DEFAULT_DEVOTIONAL, MORNING_REPHIL_ID, pickableDevotionals } from '../../src/data/daily/devotionals';
import { GO_DEEPER_ENTRIES, goDeeperEntries } from '../../src/reader/goDeeper';
import { biblesFor, type LogosPart } from '../../src/resources/logosBible';
import { EVERY_BOOK } from '../support/logos-import';

const without = (id: string): ReadonlySet<string> => new Set([...EVERY_BOOK].filter((other) => other !== id));

describe('the Go deeper door', () => {
  it('offers a Greek text only for a resource his import holds', () => {
    const book = GO_DEEPER_ENTRIES[0];
    expect(goDeeperEntries(EVERY_BOOK).map((e) => e.resource)).toContain(book.resource);
    expect(goDeeperEntries(without(book.resource)).map((e) => e.resource)).not.toContain(book.resource);
    expect(goDeeperEntries(new Set())).toEqual([]);
  });
});

describe('the Bible pickers', () => {
  it.each(['nt', 'ot', 'apocrypha', 'septuagint'] as const satisfies readonly LogosPart[])('the %s picker drops a Bible his import lacks', (part) => {
    const all = biblesFor(part, EVERY_BOOK);
    expect(all.length).toBeGreaterThan(0);
    const gone = all[0].id;
    expect(biblesFor(part, without(gone)).map((b) => b.id)).not.toContain(gone);
    expect(biblesFor(part, without(gone)).map((b) => b.id)).toEqual(all.slice(1).map((b) => b.id));
    expect(biblesFor(part, new Set())).toEqual([]);
  });
});

describe("Settings > Daily's devotional picker", () => {
  const every = DEVOTIONALS.map((d) => d.id);
  const other = DEVOTIONALS.find((d) => d.id !== DEFAULT_DEVOTIONAL)!;

  it('lists only the Logos devotionals his import holds, and Morning RePhil last, a web page every phone may have', () => {
    expect(pickableDevotionals(every, DEFAULT_DEVOTIONAL, EVERY_BOOK).map((d) => d.id)).toEqual([...every, MORNING_REPHIL_ID]);
    expect(pickableDevotionals(every, DEFAULT_DEVOTIONAL, without(other.id)).map((d) => d.id)).not.toContain(other.id);
  });

  it('lists the one chosen now though his import lacks it, so the picker never hides what Today shows', () => {
    expect(pickableDevotionals(every, other.id, new Set()).map((d) => d.id)).toEqual([other.id, MORNING_REPHIL_ID]);
    expect(pickableDevotionals(every, DEFAULT_DEVOTIONAL, new Set()).map((d) => d.id)).toEqual([DEFAULT_DEVOTIONAL, MORNING_REPHIL_ID]);
  });

  it('lists none that is not ticked in the draw', () => {
    expect(pickableDevotionals([other.id], DEFAULT_DEVOTIONAL, EVERY_BOOK).map((d) => d.id)).toEqual(
      [...every.filter((id) => id === other.id || id === DEFAULT_DEVOTIONAL), MORNING_REPHIL_ID],
    );
  });
});
