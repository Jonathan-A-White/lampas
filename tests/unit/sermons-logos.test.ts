// The committed sermon bundle holds his three Logos sermon archives (mw-qtu3zvz.12): data/sermons/sources.json pins a sermon-index commit that has greg-laurie-logos, jd-greear-logos and skip-heitzig-logos
// (mw-qtu3zvz.11) and lists them, scripts/sermons-build.ts has bundled them into public/sermons/, each row's link is the ref.ly link that opens the sermon in Logos for an owner of the archive, and the three
// start Off. No network: the committed files only.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import type { SermonBookFile, SermonIndex } from '../../src/data/sermonIndex';
import { bundledSources, forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { enabledSources } from '../../src/sermons/enabled';

const config = JSON.parse(readFileSync('data/sermons/sources.json', 'utf8')) as { commit: string; sources: string[] };
const index = JSON.parse(readFileSync('public/sermons/index.json', 'utf8')) as SermonIndex;

// the pin before the Logos archives landed in the sermon-index repository (S1, mw-qtu3zvz.11, landed as 64f9469)
const STALE_PIN = 'efac7003bfef04bbcfc68e50c97fafda8fecdbc7';
const ARCHIVES = [
  { id: 'greg-laurie-logos', resource: 'GRGLRSRMNRCH', param: 'art', preacher: /Greg Laurie/, credit: 'Greg Laurie Sermon Archive (Harvest Ministries), in Logos (Faithlife)', minRows: 100 },
  { id: 'jd-greear-logos', resource: 'JDGRRSRMNRCHV', param: 'art', preacher: /Greear/, credit: 'J. D. Greear Sermon Archive, in Logos (Faithlife)', minRows: 100 },
  { id: 'skip-heitzig-logos', resource: 'SKPHTZGSRMN', param: 'art', preacher: /Heitzig/, credit: 'Skip Heitzig Sermon Archive, in Logos (Faithlife)', minRows: 100 },
  // batch 2 (mw-qtu3zvz.18): book archives, whose link is the book at the sermon's offset (?off=), unverified until the Governor taps one
  { id: 'spurgeon-sermon-notes-logos', resource: 'MYSRMNOTES0[13]', param: 'off', preacher: /Spurgeon/, credit: 'Charles H. Spurgeon, My Sermon Notes, Volumes 1 and 2 (Genesis to Malachi) and Volumes 3 and 4 (Matthew to Revelation), in Logos (Faithlife)', minRows: 200 },
  { id: 'wesley-logos', resource: '36\\.0\\.11|WORKSWESLEY0[567]', param: 'off', preacher: /Wesley/, credit: 'John Wesley, Sermons on Several Occasions, and The Works of John Wesley, Volumes 5, 6 and 7 (the sermons not in Sermons on Several Occasions), in Logos (Faithlife)', minRows: 100 },
  { id: 'whitefield-logos', resource: '36\\.0\\.12', param: 'off', preacher: /Whitefield/, credit: 'George Whitefield, Selected Sermons of George Whitefield, in Logos (Faithlife)', minRows: 40 },
  { id: 'moody-logos', resource: 'MENBBLMOODY|OVRCMNGLFMOODY|WAYGODMOODY|12SELSERMMOODY', param: 'off', preacher: /Moody/, credit: 'Dwight Lyman Moody, Men of the Bible; The Overcoming Life and Other Sermons; The Way to God and How to Find It; Twelve Select Sermons, in Logos (Faithlife)', minRows: 5 },
  // batch 3 (mw-qtu3zvz.20): the books with a preaching text, each linking the book at the sermon's offset
  { id: 'augustine-logos', resource: 'AGSTNSRMNS04', param: 'off', preacher: /Augustine/, credit: 'Augustine of Hippo, Sermons 94A-147A on the New Testament, in Logos (Faithlife)', minRows: 50 },
  { id: 'chrysostom-logos', resource: '6\\.60\\.1[0-4]', param: 'off', preacher: /Chrysostom/, credit: 'John Chrysostom, Homilies, in the Nicene and Post-Nicene Fathers, First Series, Volumes 10 to 14 (ed. Philip Schaff), in Logos (Faithlife)', minRows: 400 },
  { id: 'charles-wesley-logos', resource: 'SERMSCWESLEY|SERM1742WESLEY', param: 'off', preacher: /Charles Wesley/, credit: 'Charles Wesley, Sermons by the Late Rev. Charles Wesley; A Sermon Preached on Sunday, April 4, 1742, before the University of Oxford, in Logos (Faithlife)', minRows: 10 },
  // batch 4 (mw-qtu3zvz.24): the books with a preaching text (some rows of Burroughs, Maclaren and Broadus take the one passage they cite)
  { id: 'shedd-logos', resource: 'SRMNATMAN|SRMSPRTMAN', param: 'off', preacher: /Shedd/, credit: 'William G. T. Shedd, Sermons to the Natural Man; Sermons to the Spiritual Man, in Logos (Faithlife)', minRows: 40 },
  { id: 'burroughs-logos', resource: 'WRKSBURROUGHS0[1247]', param: 'off', preacher: /Burroughs/, credit: "Jeremiah Burroughs, The Rare Jewel of Christian Contentment; The Saints' Treasury; The Saints' Happiness; The Difference between the Spots of the Godly and of the Wicked, in Logos (Faithlife)", minRows: 50 },
  { id: 'keach-logos', resource: 'BPTSTCVNTTHLGY03|BPTSTCVNTTHLGYAX', param: 'off', preacher: /Keach/, credit: 'Benjamin Keach, The Display of Glorious Grace, or The Covenant of Peace Opened in Fourteen Sermons; The Ax Laid to the Root, Parts I and II, in Logos (Faithlife)', minRows: 15 },
  { id: 'maclaren-logos', resource: 'BTTDSTHRSRMNS', param: 'off', preacher: /Maclaren/, credit: 'Alexander Maclaren, The Beatitudes and Other Sermons, in Logos (Faithlife)', minRows: 15 },
  { id: 'broadus-logos', resource: 'JABSERMADDR', param: 'off', preacher: /Broadus/, credit: 'John Albert Broadus, Sermons and Addresses, in Logos (Faithlife)', minRows: 10 },
  { id: 'princeton-sermons-logos', resource: 'PRINCESERMON', param: 'off', preacher: /Warfield|Hodge|Aiken|Patton|Murray|Davis|Green|Paxton/, credit: 'Princeton Theological Seminary, Princeton Sermons, in Logos (Faithlife)', minRows: 15 },
  // batch 5 (mw-qtu3zvz.26): the books with a preaching text (Sedgwick names 4 of 7, W. I. Evans 1 of 10); Calvin's are Portuguese
  { id: 'sedgwick-logos', resource: 'THNKSGVNGSRMNWS|NARKADELUGE|NGLNDSPRJDGMNTS|NTRDNGRHRSS|HMNSVNTYCDVRSRS', param: 'off', preacher: /Sedgwick/, credit: "Obadiah Sedgwick, A Thanksgiving Sermon Preached before the Honourable House of Commons at Westminster, April 9, 1644; An Arke against a Deluge; Elisha, His Lamentation upon the Suddain Translation of Elijah; England's Preservation; Haman's Vanity; The Nature and Danger of Heresies, in Logos (Faithlife)", minRows: 4 },
  { id: 'moberly-logos', resource: 'SRMNSBTTD', param: 'off', preacher: /Moberly/, credit: 'George Moberly, Sermons on the Beatitudes, with Others Mostly Preached before the University of Oxford, in Logos (Faithlife)', minRows: 15 },
  { id: 'watson-logos', resource: 'SRMNSBTTDWATSON', param: 'off', preacher: /Watson/, credit: 'Alexander Watson, Jesus the Giver and the Fulfiller of the New Law: A Course of Eight Sermons on the Beatitudes, in Logos (Faithlife)', minRows: 8 },
  { id: 'wi-evans-logos', resource: 'THSRVRMSTFLW', param: 'off', preacher: /Evans/, credit: 'W. I. Evans, This River Must Flow!, in Logos (Faithlife)', minRows: 1 },
  { id: 'calvin-pt-logos', resource: 'SRMSSBRLRPRV', param: 'off', preacher: /Calvin/, credit: 'John Calvin, Sermões sobre Eleição e Reprovação (Portuguese), in Logos (Faithlife)', minRows: 13 },
];
// the lists whose rows name no preaching text (Piper's, Bunyan's, Kuyper's, The World's Great Sermons' and McPherson's only cite passages; Jimmy Evans's have dates and series, and Strong's are addresses and essays, no Scripture;
// batch 5's Eyton, Chapin, Pope and Smale print no text over their sermons):
// bundled, Off, and on no verse (tests/unit/sermons-no-ref.test.ts)
const NO_REF = ['piper-logos', 'bunyan-logos', 'jimmy-evans-logos', 'kuyper-logos', 'worlds-great-sermons-logos', 'mcpherson-logos', 'strong-logos', 'eyton-logos', 'chapin-logos', 'pope-logos', 'smale-logos'];
// every Logos list, in the index's order
const ALL = ['greg-laurie-logos', 'jd-greear-logos', 'skip-heitzig-logos', 'spurgeon-sermon-notes-logos', 'wesley-logos', 'whitefield-logos', 'moody-logos', 'augustine-logos', 'chrysostom-logos', 'piper-logos', 'bunyan-logos', 'charles-wesley-logos', 'jimmy-evans-logos', 'shedd-logos', 'burroughs-logos', 'keach-logos', 'maclaren-logos', 'kuyper-logos', 'broadus-logos', 'worlds-great-sermons-logos', 'princeton-sermons-logos', 'mcpherson-logos', 'strong-logos', 'sedgwick-logos', 'moberly-logos', 'eyton-logos', 'chapin-logos', 'watson-logos', 'pope-logos', 'smale-logos', 'wi-evans-logos', 'calvin-pt-logos'];

describe('the Logos archives in the sermon bundle', () => {
  it('are listed in sources.json at a commit that has them', () => {
    expect(config.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(config.commit).not.toBe(STALE_PIN);
    expect(config.sources).toEqual(expect.arrayContaining([...ARCHIVES.map((a) => a.id), ...NO_REF]));
  });

  for (const archive of ARCHIVES) {
    describe(archive.id, () => {
      const entry = index.sources.find((s) => s.id === archive.id);

      it('is in index.json with its licence, credit and counts, and starts Off', () => {
        expect(entry).toBeDefined();
        expect(entry!.kind).toBe('sermons');
        expect(entry!.credit).toBe(archive.credit);
        expect(entry!.rows).toBeGreaterThanOrEqual(archive.minRows);
        expect(entry!.books.length).toBeGreaterThan(0);
        expect(entry!.fingerprint).toMatch(/^[0-9a-f]{12}$/);
        expect(entry!.onByDefault).toBe(false);
      });

      it('has a book file with rows for each book it lists, each linking the sermon in Logos', () => {
        let total = 0;
        for (const book of entry!.books) {
          const path = `public/sermons/${archive.id}/${book}.json`;
          expect(existsSync(path), path).toBe(true);
          const file = JSON.parse(readFileSync(path, 'utf8')) as SermonBookFile;
          expect(file.rows.length).toBeGreaterThan(0);
          for (const row of file.rows) {
            expect(row.ref.book).toBe(book);
            expect(row.url).toMatch(new RegExp(`^https://ref\\.ly/logosres/LLS:(${archive.resource})\\?${archive.param}=`));
            expect(row.preacher ?? '').toMatch(archive.preacher);
          }
          total += file.rows.length;
        }
        expect(total).toBeGreaterThanOrEqual(entry!.rows);
      });
    });
  }

  it('keeps Spurgeon and Henry On to start, with no key to say so', () => {
    for (const id of ['spurgeon-ccel', 'henry-sermons']) {
      const entry = index.sources.find((s) => s.id === id)!;
      expect(entry.onByDefault).toBeUndefined();
    }
  });

  it('lists Spurgeon’s My Sermon Notes “Genesis 19:15” under Genesis 19, the book opened at its offset', () => {
    const file = JSON.parse(readFileSync('public/sermons/spurgeon-sermon-notes-logos/gen.json', 'utf8')) as SermonBookFile;
    const row = file.rows.find((r) => r.id === 'MYSRMNOTES01.2-14522');
    expect(row).toMatchObject({ title: 'Genesis 19:15', ref: { book: 'gen', chapter: 19, from: 15 }, url: 'https://ref.ly/logosres/LLS:MYSRMNOTES01?off=14522' });
  });

  it('lists Greg Laurie’s “Who Is Man” under Genesis 1', () => {
    const file = JSON.parse(readFileSync('public/sermons/greg-laurie-logos/gen.json', 'utf8')) as SermonBookFile;
    const row = file.rows.find((r) => r.id === 'YEAR.1996.6');
    expect(row).toMatchObject({ title: 'Who Is Man', ref: { book: 'gen', chapter: 1 } });
  });
});

describe('the bundled Logos sources', () => {
  beforeEach(() => {
    forgetSermonFiles();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => new Response(readFileSync(`public${String(input).replace(/\?v=[0-9a-f]{12}$/, '')}`, 'utf8'), { status: 200 })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const sources = () => bundledSources();
  const logos = () => sources().filter((s) => ALL.includes(s.id));

  it('are all Off to start, and On only where their switch says so', () => {
    expect(logos().map((s) => s.id)).toEqual(ALL);
    for (const source of logos()) expect(source.default).toBe('off');
    expect(sources().find((s) => s.id === 'spurgeon-ccel')!.default).toBe('on');
    const all = sources();
    expect(enabledSources(all, () => undefined).map((s) => s.id)).toEqual(['spurgeon-ccel', 'henry-sermons']);
    // a Logos list is used only while Logos is On (mw-qtu3zvz.92)
    expect(enabledSources(all, (key) => (key === 'sermons.greg-laurie-logos' || key === 'resource.logos' ? 'on' : undefined)).map((s) => s.id)).toContain('greg-laurie-logos');
    expect(enabledSources(all, (key) => (key === 'sermons.greg-laurie-logos' ? 'on' : undefined)).map((s) => s.id)).not.toContain('greg-laurie-logos');
    expect(enabledSources(all, (key) => (key === 'sermons.spurgeon-ccel' ? 'off' : undefined)).map((s) => s.id)).not.toContain('spurgeon-ccel');
  });

  it('give rows that open in Logos by the ref.ly link', async () => {
    const greg = logos()[0];
    const rows = await greg.sermonsFor({ book: 'gen', chapter: 1 });
    const who = rows.find((r) => r.title === 'Who Is Man');
    expect(who).toMatchObject({ source: 'greg-laurie-logos', opensIn: 'logos', open: { url: expect.stringMatching(/^https:\/\/ref\.ly\/logosres\/LLS:GRGLRSRMNRCH\?art=/) } });
  });

  it('give a batch 2 row that opens in Logos by the book’s offset link', async () => {
    const notes = logos().find((s) => s.id === 'spurgeon-sermon-notes-logos')!;
    const rows = await notes.sermonsFor({ book: 'gen', chapter: 19 });
    const row = rows.find((r) => r.title === 'Genesis 19:15');
    expect(row).toMatchObject({ source: 'spurgeon-sermon-notes-logos', opensIn: 'logos', open: { url: 'https://ref.ly/logosres/LLS:MYSRMNOTES01?off=14522' } });
  });

  it('give Chrysostom’s homily on Matthew 8:5 as a row that opens in Logos, and no batch 3 list is used until its switch and his library say so', async () => {
    const chrysostom = logos().find((s) => s.id === 'chrysostom-logos')!;
    const rows = await chrysostom.sermonsFor({ book: 'mat', chapter: 8, from: 5 });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toMatchObject({ source: 'chrysostom-logos', opensIn: 'logos', preacher: 'John Chrysostom', open: { url: expect.stringMatching(/^https:\/\/ref\.ly\/logosres\/LLS:6\.60\.10\?off=/) } });
    const all = sources();
    const batch3 = ['augustine-logos', 'chrysostom-logos', ...NO_REF, 'charles-wesley-logos'];
    const logosOn = (key: string) => (key === 'resource.logos' ? 'on' : undefined);
    expect(enabledSources(all, logosOn).map((s) => s.id).filter((id) => batch3.includes(id))).toEqual([]);
    const everyOn = (key: string) => (key.startsWith('sermons.') || key === 'resource.logos' ? 'on' : undefined);
    expect(enabledSources(all, everyOn, new Set(['LLS:6.60.10'])).map((s) => s.id)).toContain('chrysostom-logos');
    expect(enabledSources(all, everyOn, new Set()).map((s) => s.id)).not.toContain('chrysostom-logos');
  });

  it('give Maclaren’s The First Beatitude on Matthew 5:3 as a row that opens in Logos, and no batch 4 list is used until its switch and his library say so', async () => {
    const maclaren = logos().find((s) => s.id === 'maclaren-logos')!;
    const rows = await maclaren.sermonsFor({ book: 'mat', chapter: 5, from: 3 });
    expect(rows.map((r) => r.title)).toContain('The First Beatitude');
    for (const row of rows) expect(row).toMatchObject({ source: 'maclaren-logos', opensIn: 'logos', preacher: 'Alexander Maclaren', open: { url: expect.stringMatching(/^https:\/\/ref\.ly\/logosres\/LLS:BTTDSTHRSRMNS\?off=/) } });
    const batch4 = ['shedd-logos', 'burroughs-logos', 'keach-logos', 'maclaren-logos', 'kuyper-logos', 'broadus-logos', 'worlds-great-sermons-logos', 'princeton-sermons-logos', 'mcpherson-logos', 'strong-logos'];
    const logosOn = (key: string) => (key === 'resource.logos' ? 'on' : undefined);
    expect(enabledSources(sources(), logosOn).map((s) => s.id).filter((id) => batch4.includes(id))).toEqual([]);
    const everyOn = (key: string) => (key.startsWith('sermons.') || key === 'resource.logos' ? 'on' : undefined);
    expect(enabledSources(sources(), everyOn, new Set(['LLS:BTTDSTHRSRMNS'])).map((s) => s.id)).toContain('maclaren-logos');
    expect(enabledSources(sources(), everyOn, new Set()).map((s) => s.id)).not.toContain('maclaren-logos');
  });

  it('give Moberly’s Sermon I on Matthew 5:3 as a row that opens in Logos, Watson’s Sermon III beside it, and no batch 5 list is used until its switch and his library say so', async () => {
    const moberly = logos().find((s) => s.id === 'moberly-logos')!;
    const rows = await moberly.sermonsFor({ book: 'mat', chapter: 5, from: 3 });
    expect(rows.map((r) => r.title)).toContain('Sermon I: Matthew 5:3');
    for (const row of rows) expect(row).toMatchObject({ source: 'moberly-logos', opensIn: 'logos', preacher: 'George Moberly', open: { url: expect.stringMatching(/^https:\/\/ref\.ly\/logosres\/LLS:SRMNSBTTD\?off=/) } });
    const watson = logos().find((s) => s.id === 'watson-logos')!;
    expect((await watson.sermonsFor({ book: 'mat', chapter: 5, from: 3 })).map((r) => r.title)).toContain('Sermon III: A Heavenly Kingdom the Reward of the Poor in Spirit');
    // Eyton's The Beatitudes prints no text over its sermons, so it is on no verse, Matthew 5:3 among them
    const eyton = logos().find((s) => s.id === 'eyton-logos')!;
    expect(await eyton.sermonsFor({ book: 'mat', chapter: 5, from: 3 })).toEqual([]);
    const batch5 = ['sedgwick-logos', 'moberly-logos', 'eyton-logos', 'chapin-logos', 'watson-logos', 'pope-logos', 'smale-logos', 'wi-evans-logos', 'calvin-pt-logos'];
    const logosOn = (key: string) => (key === 'resource.logos' ? 'on' : undefined);
    expect(enabledSources(sources(), logosOn).map((s) => s.id).filter((id) => batch5.includes(id))).toEqual([]);
    const everyOn = (key: string) => (key.startsWith('sermons.') || key === 'resource.logos' ? 'on' : undefined);
    expect(enabledSources(sources(), everyOn, new Set(['LLS:SRMNSBTTD'])).map((s) => s.id)).toContain('moberly-logos');
    expect(enabledSources(sources(), everyOn, new Set()).map((s) => s.id)).not.toContain('moberly-logos');
  });
});
