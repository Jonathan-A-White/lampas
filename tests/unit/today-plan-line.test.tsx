// tests/unit/today-plan-line.test.tsx — Today's Reading plan card says how far he is and where to change it as two lines, never one string with ' · ' between them
// that wraps and leaves the separator ending the first line ('1,181 of 1,189 chapters done ·', mw-indx1x6.15).
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { startPlan } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { readingPlanSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { Today } from '../../src/today/Today';

beforeEach(async () => {
  clearBus();
  await db.open();
  await Promise.all([db.settings.clear(), db.meta.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }]);
  window.history.replaceState(null, '', '/#/today');
});
afterEach(cleanup);

describe("Today's Reading plan card", () => {
  it('says the count and Change where you are each in its own element, none ending in a separator', async () => {
    await setSetting(readingPlanSetting, 'on');
    await startPlan('whole-bible', { code: '1pe', chapter: 1 });
    render(<Today />);
    const place = await screen.findByTestId('plan-place');
    const lines = Array.from(place.querySelectorAll('span')).map((s) => s.textContent ?? '');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Next: 1 Peter 1');
    expect(lines[1]).toMatch(/^[\d,]+ of 1,189 chapters done$/);
    expect(lines[2]).toBe('Change where you are');
    for (const line of lines) expect(line).not.toMatch(/[·,]\s*$/);
  });
});
