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

  it('is a link to the card\'s address, with its fallback armed, for a card of a link-only source; it does not open the map view', async () => {
    registerTestMaps({ links: true });
    const onLeave = vi.fn();
    render(
      <>
        <TutorLinks links={[{ kind: 'map', map: 'AtlasAtShinar' }, { kind: 'map', map: 'CommentaryAtGenesis10' }]} place={place} onLeave={onLeave} />
        <MapsHost />
      </>,
    );
    const app = await screen.findByRole('link', { name: 'Map: Test Atlas at Shinar ↗' });
    expect(app).toHaveAttribute('href', 'logos4:Atlas;id=SHINAR');
    expect(app).toHaveAttribute('data-fallback', 'https://atlas.test/shinar');
    const web = screen.getByRole('link', { name: 'Map: Test Commentary at Genesis 10 ↗' });
    expect(web).toHaveAttribute('href', 'https://atlas.test/commentary');
    expect(web).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('button', { name: /^Map:/ })).toBeNull();
    // a click on a link neither leaves the Talk sheet nor opens the Maps sheet
    web.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(web);
    expect(onLeave).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
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
