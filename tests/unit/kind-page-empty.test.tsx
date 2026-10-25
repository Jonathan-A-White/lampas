// tests/unit/kind-page-empty.test.tsx — a kind's page with no book in the catalogue says so (src/library/KindPage.tsx). Every kind has books now (mw-efwust: the catalogue is written from
// his whole export), so features/library.feature can no longer reach this line with the real catalogue; the catalogue is told here that one kind holds nothing.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/resources/catalogue', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/resources/catalogue')>();
  return { ...real, entriesOf: (kind: import('../../src/resources/catalogue').Kind) => (kind === 'interlinear' ? [] : real.entriesOf(kind)) };
});

import { KindPage } from '../../src/library/KindPage';

describe('a kind with no book in the catalogue', () => {
  it('says "No interlinears yet" and offers no search', async () => {
    render(<KindPage kind="interlinear" />);
    expect(await screen.findByText('No interlinears yet')).toBeTruthy();
    expect(screen.getByText('Lampas has none of these in its catalogue yet.')).toBeTruthy();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});
