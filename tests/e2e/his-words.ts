// tests/e2e/his-words.ts — gives a phone the Governor's own progress, as Lampas used to put it on every phone at the first open (mw-5r3p30.385:
// a new install now starts empty): the 63 BMA words, lessons 1-9 solid and lesson 10 learning. The rows are written into the app's own store
// through raw IndexedDB the moment the app first creates it, before it reads anything, with the flag that lets the app's upgrade path schedule
// them (src/data/repositories/reviews.ts seedScheduleIfFirstOpen). openUnlocked / openUnlicensed do it unless the spec says `{ empty: true }`.
import type { Page } from '@playwright/test';
import { normaliseLemma } from '../../src/data/lemma';
import { SEED_WORDS } from '../../src/data/seed-words';

const LAST_SOLID_LESSON = 9;

export async function giveHisWords(page: Page): Promise<void> {
  const now = Date.now();
  const words = SEED_WORDS.map((s) => {
    const { headword, lemmas } = normaliseLemma(s.lemma);
    return { lemma: headword, lemmas, gloss: s.gloss, lesson: s.lesson, state: s.lesson <= LAST_SOLID_LESSON ? 'solid' : 'learning', since: now };
  });
  await page.addInitScript(
    ({ words, now }) => {
      const open = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (this: IDBFactory, name: string, version?: number) {
        const request = version === undefined ? open.call(this, name) : open.call(this, name, version);
        if (name !== 'lampas') return request;
        let created = false;
        request.addEventListener('upgradeneeded', (event) => {
          if ((event as IDBVersionChangeEvent).oldVersion === 0) created = true;
        });
        // our listener is first, so this transaction is queued before any the app makes
        request.addEventListener('success', () => {
          if (!created) return;
          const tx = request.result.transaction(['words', 'meta'], 'readwrite');
          for (const word of words) tx.objectStore('words').put(word);
          tx.objectStore('meta').put({ key: 'wordsSeeded', value: String(now) });
        });
        return request;
      } as typeof IDBFactory.prototype.open;
    },
    { words, now },
  );
}
