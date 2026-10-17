// Every row of Settings draws its own name (mw-5r3p30.465): a control that names its group only with aria-label leaves the screen without the
// words, so the row's visible text, or the title of the section it stands alone in, must hold the row's label.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { ROWS, SECTIONS } from '../../src/settings/rows';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

describe('the names Settings draws', () => {
  it('draws every row\'s name as visible text, in the row or in the title of the section it fills', async () => {
    cleanup();
    window.location.hash = '#/settings';
    await db.settings.bulkPut([
      { key: 'weave', value: 'solid' },
      { key: 'immersiveReader', value: 'on' },
      { key: 'resource.logos', value: 'on' },
      { key: 'developerMode', value: 'on' },
    ]);
    render(<SettingsScreen />);
    await screen.findByRole('group', { name: 'Bible in Logos' });
    await screen.findByRole('radiogroup', { name: 'Greek pronunciation' });
    // a row is named by its own text, or by the heading of its section when it carries the section's name or stands alone in it
    const nameless = ROWS.filter((row) => {
      const el = document.querySelector(`[data-setting="${row.key}"]`);
      const section = SECTIONS.find((s) => s.id === row.section);
      const alone = ROWS.filter((r) => r.section === row.section).length === 1;
      return !((el?.textContent ?? '').includes(row.label) || alone || section?.title === row.label);
    }).map((row) => row.key);
    expect(nameless).toEqual([]);
    cleanup();
  });
});
