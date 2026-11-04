// tests/e2e/large-text-answers.ts — the ways into the screens that hold English answers or rows of buttons beside the floating ?'s reserved room (src/tutor/doorRoom.ts, 4.5 rem, 144 px at 200% text),
// for tests/e2e/large-text.spec.ts (mw-5r3p30.1039): Review's word card, the IPA drill, Memorize's Type it and the Hard sounds lesson's foot. Where it can, each draws the question that makes the answer longest
// (a fixed Review round with one long English word in every choice), so a run does not depend on the draw.
import { expect, type Page } from '@playwright/test';
import { GREEK_READING_ANSWER, makeFakePostern } from '../support/fake-postern';
import { honestMic } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

/** Long English words, each a single word that cannot wrap, as a gloss can be (the longest of the Governor's own glosses are of this length). */
export const LONG_ANSWERS = ['unrighteousness', 'uncircumcision', 'righteousnesses', 'transgressions'];

/** A Review round of one card, kept as a reload would keep it (tests/e2e/review-word-grades.spec.ts), so the card is the one asked: `flashcard` for a word's flashcard, `choice` for its multiple choice whose four choices are LONG_ANSWERS. */
export async function openReviewCard(page: Page, mode: 'choice' | 'flashcard'): Promise<void> {
  await openUnlocked(page);
  const lemma = 'ἀδικία';
  const item = {
    kind: 'word',
    id: lemma,
    mode,
    question: { lemma, prompt: lemma, gloss: LONG_ANSWERS[0], options: LONG_ANSWERS },
  };
  await page.addInitScript(
    (kept) => !window.sessionStorage.getItem('lampas.reviewRound') && window.sessionStorage.setItem('lampas.reviewRound', JSON.stringify({ round: { status: 'running', items: [kept], index: 0, picked: null, right: 0, missed: [] }, at: Date.now() })),
    item,
  );
  await page.goto('/#/review');
  await expect(page.getByTestId('prompt')).toHaveText(lemma);
}

/** Review's sound word (a word he misread, asked as a flashcard): Show, then the two grades 'I knew it' and 'Not yet' (SoundWordCard, Grades). */
export async function openReviewSoundWord(page: Page): Promise<void> {
  await openUnlocked(page);
  const item = { kind: 'sound', id: 'en:thoroughly', question: null, word: 'thoroughly', mode: 'flashcard' };
  await page.addInitScript(
    (kept) => !window.sessionStorage.getItem('lampas.reviewRound') && window.sessionStorage.setItem('lampas.reviewRound', JSON.stringify({ round: { status: 'running', items: [kept], index: 0, picked: null, right: 0, missed: [] }, at: Date.now() })),
    item,
  );
  await page.goto('/#/review');
  await expect(page.getByTestId('sound-word')).toHaveText('thoroughly');
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page.getByRole('button', { name: 'I knew it', exact: true })).toBeVisible();
}

/** The paradigm drill on The article with twelve of its cells his: a blank cell tapped shows the form with 'Had it' and 'Missed' (tests/e2e/door-overlap-sweep.spec.ts). */
export async function openParadigmDrill(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const levels = ['article', 'noun', 'number-singular', 'number-plural', 'case-nominative', 'case-genitive', 'gender-masculine', 'gender-feminine'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' }));
  levels.push({ id: 'case-dative', level: 'frontier', since: Date.now(), how: 'marked' });
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('grammarLevels', 'readwrite');
          for (const row of list) tx.objectStore('grammarLevels').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    levels,
  );
  await page.goto('/#/paradigms?t=article');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
  await page.locator('[data-cell][data-state="hidden"]').first().click();
  await expect(page.getByTestId('grade-row')).toBeVisible();
}

/** Review's multiple choice after the right pick: 'Right.', the word's three grades and the Next bar. */
export async function openReviewAnswered(page: Page): Promise<void> {
  await openReviewCard(page, 'choice');
  await expect(page.locator('[data-option]')).toHaveCount(4);
  await page.locator('[data-option]', { hasText: LONG_ANSWERS[0] }).click();
  await expect(page.getByTestId('word-grades')).toBeVisible();
}

/** Review's flashcard once Show is tapped: the word's three grades. */
export async function openReviewShown(page: Page): Promise<void> {
  await openReviewCard(page, 'flashcard');
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page.getByTestId('word-grades')).toBeVisible();
}

/** Memorize's English recall of Romans 8:28 (a short heading: the header's title does not wrap, see large-text.spec.ts) at step 1 with the box open: the verse, the box, Say it instead and Check. */
export async function openMemorizeTyping(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['reviews'], 'readwrite');
          const now = Date.now();
          tx.objectStore('reviews').put({ kind: 'verse', id: 'en:Rom.8.28', step: 0, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.goto('/#/memorize/Rom.8.28/en');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8:28', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Type it', exact: true }).click();
  await expect(page.getByLabel(/^Type the verse/)).toBeVisible();
}

/** Memorize's Greek recall with the Greek keyboard Off: the long line of buttons that points to Settings (Turn on Greek keyboard in Settings to type Greek). */
export async function openMemorizeKeyboardOff(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.goto('/#/memorize/Rom.8.28/el');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8:28', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn on Greek keyboard in Settings to type Greek' })).toBeVisible();
}

/** The Hard sounds lesson (tapped r) at its last step: Previous and Done, the foot's two buttons in the room the ? leaves. */
export async function openSoundLessonFoot(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/sounds?l=tapped-r&s=99');
  await expect(page.getByTestId('sound-lesson')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
}

/** The IPA drill's round, the sounds /x/ and /ç/ looked at first (tests/e2e/door-overlap-sweep.spec.ts): every question of the round is asked in both directions. */
export async function openIpaDrill(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/goal');
  const entry = page.getByTestId('ipa-entry');
  await entry.scrollIntoViewIfNeeded();
  await entry.click();
  await page.getByTestId('ipa-start').click();
  for (const sound of ['/x/', '/ç/']) {
    await page.locator(`[data-testid=ipa-home] li[data-sound="${sound}"] button`).click();
    await expect(page.getByTestId('ipa-card-symbol')).toHaveText(sound);
    await page.getByRole('button', { name: '‹ Sounds' }).click();
  }
  await page.getByTestId('ipa-drill').click();
  await expect(page.getByTestId('ipa-question')).toBeVisible();
}

/** The Reading check on Romans 8:28 in Greek after a reading with words to fix, then its 'Read these again' walk at Next word (`walk`): the panel's rows of buttons beside the ?'s room. The hold is timed on the page's clock, so it is
 * installed before the page opens. */
export async function openReadingCheck(page: Page, walk = false): Promise<void> {
  await page.clock.install();
  await honestMic(page);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GREEK_READING_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 28', exact: true }), 2800);
  await expect(panel).toContainText('Words to fix');
  if (!walk) return;
  await panel.getByRole('button', { name: 'Read these again', exact: true }).click();
  await expect(panel.getByRole('group', { name: 'Read these again' })).toContainText('Word 1 of 2');
}
