import { expect, test, type Page } from '@playwright/test';
import { planOf, type PlanChapter } from '../../src/data/plans';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The Audible send-off (mw-umv8sp.2): at the phone's width, Listen in Audible on the plan's next chapter comes up as a sheet with one big Go; Go records the start
// time in the settings store and only then opens Audible (window.open is stubbed here and notes what the store held the moment it was called).
test.use({ viewport: { width: 390, height: 844 } });

const STATE = 'readingPlanState';

/** The keys of every chapter of the whole-Bible plan before `next`, as the app keeps its done chapters. */
const doneBefore = (next: PlanChapter): string[] => {
  const chapters = planOf('whole-bible')?.chapters() ?? [];
  const at = chapters.findIndex((c) => c.code === next.code && c.chapter === next.chapter);
  return chapters.slice(0, at).map((c) => `${c.code}.${c.chapter}`);
};

/** Puts rows in the app's own settings store through raw IndexedDB, as the app wrote them. */
async function putSettings(page: Page, rows: { key: string; value: string }[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          for (const row of list) tx.objectStore('settings').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

/** The reading plan's state as stored (parsed), or null. */
const storedState = (page: Page) =>
  page.evaluate(
    (key) =>
      new Promise<{ session?: { code: string; chapter: number; startedAt: number } } | null>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const get = idb.transaction('settings').objectStore('settings').get(key);
          get.onsuccess = () => {
            idb.close();
            resolve(get.result ? JSON.parse(get.result.value as string) : null);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    STATE,
  );

/** Stubs window.open: each call is noted with the session the store held at that moment. Audible's own link is also kept from navigating the page. */
async function stubOpen(page: Page) {
  await page.addInitScript((key) => {
    const w = window as unknown as { __opens: { url: string; session: Promise<unknown> }[] };
    w.__opens = [];
    window.open = ((url: string) => {
      const session = new Promise((resolve) => {
        const open = indexedDB.open('lampas');
        open.onsuccess = () => {
          const get = open.result.transaction('settings').objectStore('settings').get(key);
          get.onsuccess = () => {
            open.result.close();
            resolve(get.result ? (JSON.parse(get.result.value as string) as { session?: unknown }).session : undefined);
          };
        };
      });
      w.__opens.push({ url, session });
      return {} as Window;
    }) as typeof window.open;
    document.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a[href*="audible"]')) e.preventDefault();
    });
  }, STATE);
}

const opens = (page: Page) =>
  page.evaluate(async () => {
    const w = window as unknown as { __opens: { url: string; session: Promise<unknown> }[] };
    return Promise.all(w.__opens.map(async (o) => ({ url: o.url, session: (await o.session) as { code: string; chapter: number; startedAt: number } | undefined })));
  });

/** A phone with the plan on and `next` its next chapter (every chapter before it done) or off, and the Audio Bible on, opened at `address`. */
async function openAt(page: Page, address: string, plan: 'on' | 'off', next: PlanChapter = { code: 'luk', chapter: 15 }) {
  await openUnlocked(page);
  await stubOpen(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putSettings(page, [
    { key: 'audioBible', value: 'word-of-promise' },
    ...(plan === 'on'
      ? [
          { key: 'readingPlan', value: 'on' },
          { key: STATE, value: JSON.stringify({ planId: 'whole-bible', start: next, done: doneBefore(next) }) },
        ]
      : []),
  ]);
  await page.goto(address);
  await page.reload();
}

const listenLink = (page: Page) => page.getByRole('link', { name: /^Listen in Audible/ });

test('Go on the send-off sheet records the start time, then opens Audible', async ({ page }) => {
  await openAt(page, '/#/?b=luk&c=15&v=11', 'on');
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  const before = Date.now();
  await listenLink(page).click();

  const sheet = page.getByRole('dialog', { name: 'Off to Audible: Luke 15' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('When you are back, tell me where you got to.')).toBeVisible();
  const go = sheet.getByRole('button', { name: 'Go' });
  await expect(sheet.getByRole('button')).toHaveCount(1);
  expect((await go.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  expect((await go.boundingBox())?.width).toBeGreaterThan(300);
  expect(await opens(page)).toEqual([]);
  expect((await storedState(page))?.session).toBeUndefined();
  await shot(page, 'reading-plan-sendoff-390x844');

  await go.click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(async () => (await opens(page)).length).toBe(1);
  const [opened] = await opens(page);
  // the session was already in the store when window.open was called, and it is Luke 15 begun at the tap
  expect(opened.session).toMatchObject({ code: 'luk', chapter: 15 });
  expect(opened.session?.startedAt).toBeGreaterThanOrEqual(before);
  expect(opened.session?.startedAt).toBeLessThanOrEqual(Date.now());
  expect(new URL(opened.url).searchParams.get('position_from_start')).toBe('300423039');
  expect((await storedState(page))?.session).toEqual(opened.session);
});

test('an Old Testament chapter in the picker goes through the same sheet', async ({ page }) => {
  await openAt(page, '/', 'on', { code: 'lev', chapter: 3 });
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  await picker.getByRole('button', { name: /^Leviticus/ }).click();
  await picker.getByRole('button', { name: 'Chapter 3' }).click();
  await listenLink(page).click();
  const sheet = page.getByRole('dialog', { name: 'Off to Audible: Leviticus 3' });
  await expect(sheet).toBeVisible();
  await expect(picker).toBeVisible();
  await sheet.getByRole('button', { name: 'Go' }).click();
  await expect.poll(async () => (await opens(page)).length).toBe(1);
  expect((await opens(page))[0].session).toMatchObject({ code: 'lev', chapter: 3 });
});

test('Back or a tap outside closes the sheet and begins no session', async ({ page }) => {
  await openAt(page, '/#/?b=luk&c=15&v=11', 'on');
  const sheet = page.getByRole('dialog', { name: 'Off to Audible: Luke 15' });

  await listenLink(page).click();
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();

  await listenLink(page).click();
  await expect(sheet).toBeVisible();
  await page.getByTestId('sendoff-backdrop').click({ position: { x: 20, y: 20 } });
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();

  expect(await opens(page)).toEqual([]);
  expect((await storedState(page))?.session).toBeUndefined();
});

test('a chapter that is not the plan\'s next one opens Audible at once, with no sheet and nothing recorded', async ({ page }) => {
  await openAt(page, '/#/?b=1pe&c=1&v=1', 'on', { code: 'mat', chapter: 5 });
  const link = listenLink(page);
  await expect(link).toBeVisible();
  const before = await storedState(page);
  await link.click();
  await expect(page.getByRole('dialog', { name: /^Off to Audible/ })).toHaveCount(0);
  expect(new URL((await link.getAttribute('href')) ?? '').searchParams.get('annotation_time_utc')).toMatch(/^\d+$/);
  // coming back from Audible asks nothing and the plan is as it was
  await page.evaluate(() => {
    for (const state of ['hidden', 'visible']) {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }
  });
  await expect(page.getByRole('dialog', { name: 'Where did you get to?' })).toHaveCount(0);
  expect(await storedState(page)).toEqual(before);
  expect(before?.session).toBeUndefined();
});

test('with the Reading plan off Listen in Audible opens Audible at once, with no sheet', async ({ page }) => {
  await openAt(page, '/#/?b=luk&c=15&v=11', 'off');
  const link = listenLink(page);
  await expect(link).toBeVisible();
  await link.click();
  await expect(page.getByRole('dialog', { name: /^Off to Audible/ })).toHaveCount(0);
  // the link was stamped with the time of the tap, as it always was
  expect(new URL((await link.getAttribute('href')) ?? '').searchParams.get('annotation_time_utc')).toMatch(/^\d+$/);
  expect(await storedState(page)).toBeNull();
});
