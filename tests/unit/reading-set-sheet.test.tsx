// tests/unit/reading-set-sheet.test.tsx — the line under 'Read as' says what the set in force reads (mw-5r3p30.874): it was ECM's line whatever set was picked.
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { chooseReading, setActive } from '../../src/data/repositories';
import { ReadAs } from '../../src/reader/ReadingSetSheet';
import { ECM_ID, NA_ID } from '../../src/reader/readingSets';

const ECM_LINE = 'ECM where the apparatus gives it (18 places in Acts); elsewhere NA';

beforeEach(async () => {
  await db.open();
  await db.readingSets.clear();
  await db.settings.delete('readingSet');
});
afterEach(cleanup);
afterAll(() => db.close());

/** The line under the chips: the paragraph that follows the 'Read as' group. */
const lineUnder = async (): Promise<string> => {
  const group = await screen.findByRole('group', { name: 'Read as' });
  const line = group.nextElementSibling;
  expect(line?.tagName).toBe('P');
  return line?.textContent ?? '';
};

describe("the line under 'Read as'", () => {
  it('says the text as it stands under Byzantine', async () => {
    render(<ReadAs />);
    expect(await lineUnder()).toBe('The text as it stands');
  });

  it("says Nestle-Aland's reading where the apparatus gives it under NA", async () => {
    await setActive(NA_ID);
    render(<ReadAs />);
    expect(await lineUnder()).toBe('Nestle-Aland where the apparatus gives it; elsewhere the text as it stands');
  });

  it("keeps ECM's line under ECM", async () => {
    await setActive(ECM_ID);
    render(<ReadAs />);
    expect(await lineUnder()).toBe(ECM_LINE);
  });

  it('counts the places chosen under Mine', async () => {
    await chooseReading('rev 3:2 ἔμελλες ἀποβάλλειν', 1);
    await chooseReading('rev 3:7 ἀνοίξει', 0);
    render(<ReadAs />);
    expect(await lineUnder()).toBe('Your own set: 2 places chosen');
  });

  it('says one place, not one places, and none yet for a set with no choice', async () => {
    await chooseReading('rev 3:7 ἀνοίξει', 0);
    const { unmount } = render(<ReadAs />);
    expect(await lineUnder()).toBe('Your own set: 1 place chosen');
    unmount();
    await db.readingSets.put({ id: 'empty', name: 'Empty', choices: {} });
    await setActive('empty');
    render(<ReadAs />);
    expect(await lineUnder()).toBe('Your own set: no places chosen yet');
  });
});
