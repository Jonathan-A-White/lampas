// Settings > Grammar approach (src/settings/controls/approach.tsx, mw-foy5mb.1): with one approach there is no choice to draw, only the path's
// own name, method and lessons and 'Ask for another approach'; with two the radiogroup returns.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ladder } from '../../src/approaches/ladder';
import type { GrammarApproach } from '../../src/approaches';
import { db } from '../../src/data/db';
import { ApproachPicker, ApproachControl } from '../../src/settings/controls/approach';
import { ROWS } from '../../src/settings/rows';

const stub: GrammarApproach = {
  id: 'stub',
  name: 'Stub path',
  credit: null,
  method: 'A second path, only here to hold the door open.',
  stages: [{ title: 'Only stage', levels: [{ title: 'Only level', lessons: [{ title: 'Only lesson', ideas: ['alphabet'] }] }] }],
};

afterAll(() => {
  cleanup();
  db.close();
});
beforeEach(async () => {
  cleanup();
  await db.open();
  await Promise.all([db.settings.clear(), db.grammarLevels.clear()]);
});

describe('the approach picker', () => {
  it('with one approach draws no radiogroup: its method and its lessons only', () => {
    render(<ApproachPicker approaches={[ladder]} chosen="ladder" levels={new Map()} />);
    expect(screen.getByRole('group', { name: 'Grammar approach' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryAllByRole('radio')).toEqual([]);
    expect(document.querySelector('[data-approach-method]')?.textContent).toBe(ladder.method);
    expect(document.querySelectorAll('[data-approach-lessons] [data-lesson-title]').length).toBeGreaterThan(20);
  });

  it('with a second approach draws the radiogroup again, the chosen one checked', () => {
    render(<ApproachPicker approaches={[ladder, stub]} chosen="stub" levels={new Map()} />);
    const group = screen.getByRole('radiogroup', { name: 'Grammar approach' });
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Lampas ladder', 'Stub path']);
    expect(within(group).getByRole('radio', { name: 'Stub path' })).toHaveAttribute('aria-checked', 'true');
    expect(document.querySelector('[data-approach-method]')?.textContent).toBe(stub.method);
  });
});

describe('Settings > Grammar approach on a phone with the one path', () => {
  it('still has Ask for another approach, and the lessons, and no radiogroup', async () => {
    const row = ROWS.find((r) => r.key === 'grammarApproach')!;
    render(<ApproachControl row={row} />);
    await screen.findByRole('button', { name: 'Ask for another approach' });
    await screen.findByText('The Greek alphabet');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});
