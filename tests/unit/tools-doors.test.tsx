// The doors that open a moved tool, or that opened Settings beside them, still open their screen once the tools left Settings for Tools (mw-5r3p30.754, mw-5r3p30.1111): the tutor's place for
// each of the six tools draws that tool's screen, and the Goal screen's Choose a goal and a reference card's Link Logos in Settings still open their page of Settings.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { clearBus } from '../../src/events/bus';
import { navigate, type Route } from '../../src/nav/route';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { TOOL_SCREENS } from '../../src/tools';
import { lampasRegistry, placeNameOf } from '../../src/tutor/registry';
import { SCREEN_NAMES } from '../../src/tutor/screen';
import { stubChapterFetch } from '../support/chapter-fetch';
import { seedHisWords } from '../support/his-words';

beforeAll(async () => {
  stubChapterFetch();
  await db.open();
  await seedHisWords();
  await seedScheduleIfFirstOpen();
  await db.settings.bulkPut([
    { key: 'resource.logos', value: 'on' },
    { key: 'depth', value: '5' },
  ]);
  window.history.replaceState(null, '', '/');
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
});

afterAll(async () => {
  cleanup();
  clearBus();
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});

const registry = lampasRegistry();
const heading = (name: string): Promise<HTMLElement> => screen.findByRole('heading', { name, level: 1 });

describe("the tutor's place for each tool that moved to Tools", () => {
  it.each(Object.entries(TOOL_SCREENS))('opens the screen of %s', async (_, route) => {
    await act(async () => navigate('home'));
    await heading('Romans 8');
    let opened: unknown;
    await act(async () => {
      opened = await registry.open(placeNameOf(route as Route), {});
    });
    expect(opened).toEqual({ ok: true });
    await heading(SCREEN_NAMES[route as keyof typeof SCREEN_NAMES]);
  });
});

describe('the doors into Settings beside them', () => {
  it("the Goal screen's Choose a goal opens Settings at its Goal section", async () => {
    await act(async () => navigate('goal'));
    await userEvent.click(await screen.findByRole('button', { name: 'Choose a goal' }));
    expect(window.location.hash).toBe('#/settings?section=goal');
    await heading('Learning');
  });

  it("a reference card's Link Logos in Settings opens Study resources (the address it takes, as tests/unit/reference-card-unheld.test.tsx proves the link)", async () => {
    await act(async () => navigate('home'));
    await heading('Romans 8');
    await act(async () => {
      window.location.hash = '#/settings?section=resources';
    });
    await heading('Study resources');
    expect(await screen.findByRole('switch', { name: 'Logos' })).toBeInTheDocument();
  });
});
