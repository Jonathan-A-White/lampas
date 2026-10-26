// The Maps door (src/maps/MapsDoor.tsx, mw-zbjgn3r.2): a 44 px button 'Maps · N', drawn only when N is above 0; the chapter foot (src/reader/ChapterActions.tsx) draws it for the
// Old and the New Testament and, with the Immersive reader On, nowhere in the Reader.
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MapsDoor } from '../../src/maps/MapsDoor';
import { ChapterActions } from '../../src/reader/ChapterActions';
import { forgetTestMaps, registerTestMaps } from '../support/test-maps';

beforeEach(registerTestMaps);
afterEach(() => {
  cleanup();
  forgetTestMaps();
});

describe('the Maps door', () => {
  it('is labelled Maps · N with the card count, 44 px tall', async () => {
    render(<MapsDoor mapRef={{ book: 'gen', chapter: 10, from: 19, to: 19 }} />);
    const door = await screen.findByRole('button', { name: 'Maps · 6' });
    expect(door.className).toContain('min-h-11');
  });

  it('is not drawn where a chapter has no maps', async () => {
    render(<MapsDoor mapRef={{ book: 'gen', chapter: 11 }} />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: /^Maps/ })).toBeNull();
  });
});

describe('the chapter foot', () => {
  it('draws the door at the foot of an Old Testament chapter and of a New Testament one', async () => {
    render(<ChapterActions name="Genesis" code="gen" chapter={10} immersive={false} />);
    expect(await screen.findByRole('button', { name: 'Maps · 6' })).toBeInTheDocument();
    cleanup();
    render(<ChapterActions name="Romans" code="rom" chapter={8} immersive={false} />);
    expect(await screen.findByRole('button', { name: 'Maps · 1' })).toBeInTheDocument();
    // the Logos and Audible actions are the Old Testament's only
    expect(screen.queryByRole('group', { name: /read or listen/ })).toBeNull();
  });

  it('draws no door anywhere in the Reader with the Immersive reader On', async () => {
    render(<ChapterActions name="Genesis" code="gen" chapter={10} immersive />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: /^Maps/ })).toBeNull();
  });
});
