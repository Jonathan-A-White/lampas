// The tutor's map link (mw-zbjgn3r.4): {kind: 'map', map: <id>} in a Bible talk answer is drawn as the chip 'Map: <title>' that opens that map in the app through openMaps; an id the chapter
// lacks draws nothing.
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { MapsHost } from '../../src/maps/MapsSheet';
import { closeMaps } from '../../src/maps/openMaps';
import { TutorLinks } from '../../src/TutorLinks';
import { forgetTestMaps, registerTestMaps } from '../support/test-maps';

const place = { book: 'gen', chapter: 10 };

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  registerTestMaps();
});

afterEach(() => {
  cleanup();
  closeMaps();
  forgetTestMaps();
});

describe('the map chip', () => {
  it('opens that map in the app, over the Maps sheet, after leaving the Talk sheet', async () => {
    const onLeave = vi.fn();
    render(
      <>
        <TutorLinks links={[{ kind: 'map', map: 'SodomAndGomorrah' }]} place={place} onLeave={onLeave} />
        <MapsHost />
      </>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Map: Sodom and Gomorrah Are Destroyed' }));
    expect(onLeave).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'Sodom and Gomorrah Are Destroyed' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Map by David P\. Barrett/)).toBeInTheDocument());
  });

  it('is not drawn for an id the chapter lacks, and nothing at all is drawn when it is the only link', async () => {
    render(<TutorLinks links={[{ kind: 'map', map: 'NoSuchMap' }]} place={place} onLeave={() => undefined} />);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('button', { name: /^Map:/ })).toBeNull();
    expect(document.querySelector('[data-tutor-links]')).toBeNull();
  });

  it('is not drawn in a talk with no place (a talk from a screen)', async () => {
    render(<TutorLinks links={[{ kind: 'map', map: 'SodomAndGomorrah' }]} onLeave={() => undefined} />);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('button', { name: /^Map:/ })).toBeNull();
  });
});
