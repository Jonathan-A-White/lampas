// features/steps/sermons-online.steps.tsx — runs features/sermons-online.feature: the Sermons sheet asking the sermon index service (src/services/sermons.ts) for the newest rows and its search (mw-qtu3zvz.5).
// The service is a stubbed fetch that answers with the examples of the sermon-index repository's docs/api.md (tests/fixtures/sermons, copied from it at the commit the fixture names); the bundled sources are the
// tests' own (tests/support/test-sermons.ts), and the service's rows for them are the fixture's rows given their ids.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { forgetServiceSources } from '../../src/sermons';
import { setKnownSermonSources } from '../../src/sermons/known';
import { closeSermons } from '../../src/sermons/openSermons';
import { setSermonsUrl, type ServiceHit, type ServiceSermon } from '../../src/services/sermons';
import { forgetGrownSermonRows } from '../../src/settings/rows';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { forgetTestMaps, registerTestMaps } from '../../tests/support/test-maps';
import { forgetTestSermons, registerTestSermons } from '../../tests/support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../../tests/support/test-themes';
import api from '../../tests/fixtures/sermons/api-rom-5-8.json';
import apiSources from '../../tests/fixtures/sermons/api-sources.json';
import apiDirect from '../../tests/fixtures/sermons/api-direct-theme.json';
import { closeDatabase } from './close-database';

const BASE = 'https://sermons.test';

afterAll(async () => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  forgetTestThemes();
  forgetTestMaps();
  setSermonsUrl(undefined);
  vi.unstubAllGlobals();
  await closeDatabase();
});

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

const user = userEvent.setup();
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** The fixture's two rows of Romans 5 (docs/api.md: Love's Commendation on 5:8, Reigning Grace on 5:21), given the ids the tests' source has. */
const [A, B] = api['GET /v1/sermons?ref=Rom.5&limit=2&offset=1'].rows as ServiceSermon[];
const ROWS: Record<string, ServiceSermon[]> = {
  testsermons: [
    { ...A, source: 'testsermons', id: 'love', title: 'Love Commended, Revised', url: 'https://sermons.test/testsermons/love-new' },
    { ...B, source: 'testsermons', id: 'reign-grace' },
  ],
  'spurgeon-20': [A],
};
const [, THEMES_DEMO] = apiSources['GET /v1/sources'].rows;
const SOURCES = [
  { ...apiSources['GET /v1/sources'].rows[0], id: 'testsermons', name: 'Test Sermons', on_by_default: true },
  apiSources['GET /v1/sources'].rows[0],
  THEMES_DEMO,
];
/** The search's example answer, and a theme beside its sermons (the example has none). */
const HITS: ServiceHit[] = [...(api['GET /v1/search?q=spurgeon+grace'].rows as ServiceHit[]), { kind: 'theme', source: 'themes-demo', id: 'atonement', title: 'Atonement', ref: null, url: null, rank: 0.2 }, { kind: 'theme', source: 'themes-demo', id: 'business-life', title: 'Business Life', ref: null, url: null, rank: 0.1 }];

/** The direct-link Example's one marked row, put under the tests' own Atonement topic (the Example's is the demo's Grace). */
const [NOTES_ROW] = apiDirect['GET /v1/sermons?ref=eph.2.8&tier=theme-only'].theme.rows;
const NOTES_ANSWER = { ref: 'Rom.5.8', passage: null, theme: { total: 1, rows: [{ ...NOTES_ROW, theme: { ...NOTES_ROW.theme, source: 'testthemes', topic: 'atonement', label: 'Atonement' } }] } };

interface Service {
  down: boolean;
  onByDefault: boolean;
  notes: boolean;
  asked: { url: URL; init: RequestInit | undefined }[];
}
let service: Service;

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const askedFor = (path: string): URL[] => service.asked.filter((a) => a.url.pathname === path).map((a) => a.url);

async function answer(url: URL): Promise<Response> {
  if (url.pathname === '/v1/sources') return json({ rows: SOURCES.map((s) => (s.id === 'spurgeon-20' ? { ...s, on_by_default: service.onByDefault } : s)) });
  if (url.pathname === '/v1/search') return json({ q: url.searchParams.get('q'), rows: HITS });
  if (url.pathname === '/v1/sermons' && url.searchParams.get('tier') === 'theme-only' && url.searchParams.get('direct') === 'only') return json(service.notes ? NOTES_ANSWER : { ref: 'Rom.5.8', passage: null, theme: { total: 0, rows: [] } });
  // mw-qtu3zvz.65: a theme the search finds that holds no sermon at all (his 'Business Life')
  if (url.pathname === '/v1/sermons' && url.searchParams.get('tier') === 'theme-only' && url.searchParams.get('theme') === 'themes-demo:business-life') return json({ ref: 'Gen.1.1-Rev.22.21', passage: null, theme: { total: 0, rows: [] } });
  if (url.pathname === '/v1/sermons' && url.searchParams.get('tier') === 'theme-only') return json(api['GET /v1/sermons?ref=rom.5.8&tier=theme-only&theme=themes-demo:atonement']);
  if (url.pathname === '/v1/sermons') {
    const rows = (url.searchParams.get('source') ?? '').split(',').flatMap((id) => ROWS[id] ?? []);
    return json({ ref: 'Rom.5', total: rows.length, rows });
  }
  return new Response('not found', { status: 404 });
}

interface Phone {
  down?: boolean;
  onByDefault?: boolean;
  /** the service has a sermon linked from its notes, and the tests' theme source is read */
  notes?: boolean;
  /** the tests' theme source is read (the default of these scenarios reads none) */
  themes?: boolean;
}

/** Opens the app on a chapter, the sermon index stubbed as `phone` says. */
async function openOn(title: string, phone: Phone = {}): Promise<void> {
  cleanup();
  closeSermons();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  forgetServiceSources();
  forgetGrownSermonRows();
  setKnownSermonSources([]);
  registerTestSermons();
  if (phone.notes || phone.themes) registerTestThemes();
  else registerTestThemes({ none: true });
  registerTestMaps();
  stubChapterFetch();
  const chapters = globalThis.fetch;
  service = { down: phone.down ?? false, onByDefault: phone.onByDefault ?? phone.notes ?? false, notes: phone.notes ?? false, asked: [] };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const text = String(input);
    if (!text.startsWith(BASE)) return chapters(input, init);
    service.asked.push({ url: new URL(text), init });
    if (service.down) throw new TypeError('Failed to fetch');
    return answer(new URL(text));
  });
  setSermonsUrl(BASE);
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear()]);
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const sheetEl = () => screen.findByRole('dialog', { name: /^Sermons for / });
const partRows = async (part: string): Promise<string[]> => {
  const group = await within(await sheetEl()).findByRole('group', { name: part });
  return [...group.querySelectorAll('[data-sermon-title]')].map((t) => squash(t.textContent));
};
const rowNamed = async (title: string): Promise<HTMLAnchorElement> => {
  const found = await waitFor(() => {
    const row = [...document.querySelectorAll<HTMLAnchorElement>('a[data-sermon-row]')].find((r) => r.querySelector('[data-sermon-title]')?.textContent === title);
    if (!row) throw new Error(`no sermon ${title}`);
    return row;
  });
  return found;
};
const searchField = async () => within(await sheetEl()).findByRole('searchbox', { name: 'Search sermons and themes' });

async function tapVerseAndDoor(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Verse 8', exact: true }));
  const view = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(await within(view).findByRole('button', { name: 'Sermons · 4' }));
}

const feature = await loadFeature('features/sermons-online.feature');

describeFeature(feature, ({ Scenario }) => {
  const openedWith = (phone: Phone) => (_: unknown, title: string) => openOn(title, phone);
  const tapVerse = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapDoor = async (_: unknown, label: string) => {
    await user.click(await within(screen.getByRole('region', { name: 'Verse view' })).findByRole('button', { name: label }));
  };
  const headed = async (_: unknown, title: string) => {
    await waitFor(async () => expect((await sheetEl()).getAttribute('aria-label')).toBe(title));
  };
  const says = async (_: unknown, line: string) => {
    await waitFor(async () => expect(squash((await sheetEl()).querySelector('[data-sermons-latest]')?.textContent)).toBe(line));
  };
  const holds = async (_: unknown, part: string, ...titles: string[]) => {
    await waitFor(async () => expect(await partRows(part)).toEqual(titles));
  };
  const holdsTwo = (_: unknown, part: string, a: string, b: string) => holds(_, part, a, b);
  const holdsThree = (_: unknown, part: string, a: string, b: string, c: string) => holds(_, part, a, b, c);
  const holdsFive = (_: unknown, part: string, a: string, b: string, c: string, d: string, e: string) => holds(_, part, a, b, c, d, e);
  const searchesFor = async (_: unknown, words: string) => {
    await user.type(await searchField(), words);
  };
  const openSettings = async () => {
    cleanup();
    closeSermons();
    window.history.replaceState(null, '', '/#/settings?sources=sermons');
    render(<App />);
    await screen.findByRole('heading', { name: 'Sermon sources', level: 1 });
  };
  // a source's switch on the page of sermon sources (src/sermons/SermonSourcesPage.tsx): a radio group named by the source
  const sectionSwitch = async (name: string) => screen.findByRole('radiogroup', { name });

  Scenario("The service's newer rows replace and add to the bundled ones", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering', openedWith({}));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the sheet says {string}', says);
    And('the part {string} holds {string} and {string}', holdsTwo);
    And('after it the part {string} holds {string}, {string} and {string}', holdsThree);
    And("the sermon {string} opens at the service's newer address", async (_, title: string) => {
      expect(await rowNamed(title)).toHaveAttribute('href', 'https://sermons.test/testsermons/love-new');
    });
  });

  Scenario("The service is asked for the chapter with the sources that are On, and for nothing of his", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering', openedWith({}));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet says {string}', says);
    And('the service was asked for {string} in the source {string}', (_, ref: string, source: string) => {
      const asks = askedFor('/v1/sermons');
      expect(asks).toHaveLength(1);
      expect(asks[0].searchParams.get('ref')).toBe(ref);
      expect(asks[0].searchParams.get('source')).toBe(source);
    });
    And('the service was sent no cookie, key or header', () => {
      expect(service.asked.length).toBeGreaterThan(0);
      for (const { init } of service.asked) {
        expect(init?.credentials).toBe('omit');
        expect(init?.headers).toBeUndefined();
      }
    });
  });

  Scenario('When the service cannot be reached the bundled rows stand and the sheet says so', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index not answering', openedWith({ down: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet says {string}', says);
    And('the part {string} holds {string} and {string}', holdsTwo);
  });

  Scenario('A source the bundle lacks gets an Off row in the list of sermon sources, and its rows show only when it is On', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering', openedWith({}));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet says {string}', says);
    And('the service was asked for no source but {string}', (_, source: string) => {
      const asks = askedFor('/v1/sermons');
      expect(asks.length).toBeGreaterThan(0);
      for (const ask of asks) expect(ask.searchParams.get('source')).toBe(source);
    });
    When('the list of sermon sources is opened', openSettings);
    Then('the list of sermon sources shows {string} Off', async (_, name: string) => {
      await waitFor(async () => expect(within(await sectionSwitch(name)).getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true'));
    });
    When('he turns {string} On in the list of sermon sources', async (_, name: string) => {
      await user.click(within(await sectionSwitch(name)).getByRole('radio', { name: 'On' }));
      await waitFor(async () => expect((await db.settings.get('sermons.spurgeon-20'))?.value).toBe('on'));
    });
    And('the Verse view of Romans 5:8 is opened again with its Sermons sheet', async () => {
      cleanup();
      service.asked = [];
      window.history.replaceState(null, '', '/#/?b=rom&c=5');
      render(<App />);
      await screen.findByRole('heading', { name: 'Romans 5', level: 1 });
      await tapVerseAndDoor();
    });
    Then('the line under the title reads {string}', says);
    And('the part {string} holds {string}, {string} and {string}', holdsThree);
    And('the service was asked for the sources {string} and {string}', (_, a: string, b: string) => {
      const asks = askedFor('/v1/sermons');
      expect(asks.map((u) => u.searchParams.get('source'))).toContain(`${a},${b}`);
    });
  });

  Scenario('A source the service says is on by default shows its rows the first time it is seen', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering with a source that is on by default', openedWith({ onByDefault: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the part {string} holds {string}, {string} and {string}', holdsThree);
    When('the list of sermon sources is opened', openSettings);
    Then('the list of sermon sources shows {string} On', async (_, name: string) => {
      await waitFor(async () => expect(within(await sectionSwitch(name)).getByRole('radio', { name: 'On' })).toHaveAttribute('aria-checked', 'true'));
    });
  });

  Scenario('The search is answered by the service, after a pause, with sermons and themes', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering', openedWith({}));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he searches the sheet for {string}', searchesFor);
    Then('the part {string} holds {string}, {string}, {string}, {string} and {string}', holdsFive);
    And('the service was asked to search once, for {string}', (_, words: string) => {
      const asks = askedFor('/v1/search');
      expect(asks).toHaveLength(1);
      expect(asks[0].searchParams.get('q')).toBe(words);
    });
    And('the sermon {string} opens at {string}', async (_, title: string, url: string) => {
      expect(await rowNamed(title)).toHaveAttribute('href', url);
    });
  });

  // mw-qtu3zvz.66: the fixture's Rom.5.20 and Rom.5.21 are on the chapter of the open verse and come before Rom.3.24, a general match, though the service listed that second
  Scenario("A match on the open verse's chapter ranks above a general match (mw-qtu3zvz.66, tier order PROVISIONAL)", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering', openedWith({}));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he searches the sheet for {string}', searchesFor);
    Then('the part {string} holds {string}, {string}, {string}, {string} and {string}', holdsFive);
  });

  Scenario('A theme found by the search lists its sermons in the same sheet when it is tapped', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering', openedWith({}));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he searches the sheet for {string}', searchesFor);
    And('he taps the theme {string}', async (_, title: string) => {
      const group = await within(await sheetEl()).findByRole('group', { name: 'Found' });
      const theme = await waitFor(() => {
        const button = [...group.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.querySelector('[data-sermon-title]')?.textContent === title);
        if (!button) throw new Error(`no theme ${title}`);
        return button;
      });
      await user.click(theme);
    });
    Then('the theme {string} lists {string}', async (_, title: string, sermon: string) => {
      const group = await within(await sheetEl()).findByRole('group', { name: 'Found' });
      await waitFor(() => {
        const theme = [...group.querySelectorAll<HTMLElement>('[data-found-theme]')].find((t) => t.querySelector('[data-sermon-title]')?.textContent === title);
        expect(theme).toBeTruthy();
        expect([...theme!.querySelectorAll('a[data-sermon-row] [data-sermon-title]')].map((t) => t.textContent)).toEqual([sermon]);
      });
      expect(askedFor('/v1/sermons').some((u) => u.searchParams.get('theme') === 'themes-demo:atonement' && u.searchParams.get('tier') === 'theme-only')).toBe(true);
    });
  });

  Scenario('A theme with no sermons is not offered in Found, and a theme with some says how many', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering', openedWith({}));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he searches the sheet for {string}', searchesFor);
    Then('the theme {string} says {string}', async (_, title: string, line: string) => {
      const group = await within(await sheetEl()).findByRole('group', { name: 'Found' });
      await waitFor(() => {
        const theme = [...group.querySelectorAll<HTMLElement>('[data-found-theme]')].find((t) => t.querySelector('[data-sermon-title]')?.textContent === title);
        expect(theme?.querySelector('[data-sermon-meta]')?.textContent).toBe(line);
      });
    });
    And('Found offers no theme {string}', async (_, title: string) => {
      const group = await within(await sheetEl()).findByRole('group', { name: 'Found' });
      // the lookup of every theme has come back: Atonement is drawn, and Business Life asked its sermons and was left out
      await waitFor(() => {
        expect(askedFor('/v1/sermons').some((u) => u.searchParams.get('theme') === 'themes-demo:business-life')).toBe(true);
        expect(group.querySelector('[data-found-theme]')).not.toBeNull();
      });
      expect([...group.querySelectorAll('[data-sermon-title]')].map((t) => t.textContent)).not.toContain(title);
      expect(within(group).queryByText('No sermons on this theme.')).toBeNull();
    });
  });

  Scenario('Offline the search field is greyed and says it needs the internet', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index not answering', openedWith({ down: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the search field is greyed and says {string}', async (_, line: string) => {
      await waitFor(async () => {
        const field = await searchField();
        expect(field).toBeDisabled();
        expect(field).toHaveAttribute('placeholder', line);
      });
    });
  });

  const partOf = async (name: string): Promise<HTMLElement> => within(await sheetEl()).findByRole('group', { name });
  const topicsOf = (part: HTMLElement): HTMLElement[] => [...part.querySelectorAll<HTMLElement>('[data-theme-topic]')];
  const titlesOf = (el: HTMLElement): string[] => [...el.querySelectorAll('[data-sermon-title]')].map((t) => squash(t.textContent));
  const rowOn = rowNamed;

  Scenario('A sermon linked from its notes is on the same theme', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index answering a sermon linked from its notes', openedWith({ notes: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('under {string} the topic {string} comes first and holds {string} then {string}', async (_, part: string, heading: string, first: string, second: string) => {
      await waitFor(async () => {
        const first_ = topicsOf(await partOf(part))[0];
        expect(squash(first_?.querySelector('h4')?.textContent)).toBe(heading);
        expect(titlesOf(first_)).toEqual([first, second]);
      });
    });
    And('the row {string} reads {string}', async (_, title: string, line: string) => {
      const row = await rowOn(title);
      expect(squash(row.querySelector('[data-sermon-why]')?.textContent)).toBe(line);
    });
    And('the row {string} has no such line', async (_, title: string) => {
      expect((await rowOn(title)).querySelector('[data-sermon-why]')).toBeNull();
    });
    And('the sheet credits {string} for it, as its only row there is on the same theme', async (_, name: string) => {
      const credits = [...(await sheetEl()).querySelectorAll('[data-sermon-credit]')].map((c) => squash(c.textContent));
      expect(credits.some((c) => c.startsWith(name))).toBe(true);
    });
    And('the service was asked for the theme tier of {string} in the sources {string} and {string}', (_, ref: string, a: string, b: string) => {
      const asks = askedFor('/v1/sermons').filter((u) => u.searchParams.get('tier') === 'theme-only' && u.searchParams.get('direct') === 'only');
      expect(asks).toHaveLength(1);
      expect(asks[0].searchParams.get('ref')).toBe(ref);
      expect(asks[0].searchParams.get('source')).toBe(`${a},${b}`);
    });
  });

  Scenario('Offline the same sheet has no sermon linked from its notes', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the sermon index not answering, and the themes read', openedWith({ down: true, themes: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet says {string}', says);
    And('under {string} the topic {string} comes first and holds {string}', async (_, part: string, heading: string, first: string) => {
      await waitFor(async () => {
        const first_ = topicsOf(await partOf(part))[0];
        expect(squash(first_?.querySelector('h4')?.textContent)).toBe(heading);
        expect(titlesOf(first_)).toEqual([first]);
      });
    });
    And('no row of the sheet reads {string}', async (_, line: string) => {
      expect(squash((await sheetEl()).textContent)).not.toContain(line);
      expect(askedFor('/v1/sermons').filter((u) => u.searchParams.get('tier') === 'theme-only')).toEqual([]);
    });
  });
});
