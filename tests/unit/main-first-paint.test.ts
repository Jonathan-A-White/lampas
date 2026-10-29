import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// mw-5r3p30.862: on his phone the splash stayed ~20 s because the first render waited on placeInterest() (Dexie) with no bound.
// src/main.tsx runs at import, so each test mocks what it touches, imports it, and watches createRoot().render.

const render = vi.fn();
const placeInterest = vi.fn<() => Promise<{ greek: number; hebrew: number }>>();

vi.mock('react-dom/client', () => ({ createRoot: () => ({ render }) }));
vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn() }));
vi.mock('pwa-kit/app-update', () => ({ startAppUpdates: vi.fn() }));
vi.mock('pwa-kit/whats-new', () => ({ fetchChangelog: vi.fn() }));
vi.mock('pwa-kit/whats-new/styles.css', () => ({}));
vi.mock('pwa-kit/settings/styles.css', () => ({}));
vi.mock('voice-kit/speech/styles.css', () => ({}));
vi.mock('voice-kit/composer/styles.css', () => ({}));
vi.mock('../../src/App', () => ({ App: () => null }));
vi.mock('../../src/ErrorBoundary', () => ({ ErrorBoundary: () => null }));
vi.mock('../../src/gate/LicenceProvider', () => ({ LicenceProvider: () => null }));
vi.mock('../../src/gate/licenceTip', () => ({ noteVisit: vi.fn() }));
vi.mock('../../src/tips/LicensedTips', () => ({ LicensedTips: () => null }));
vi.mock('../../src/tutor/NightlyTuning', () => ({ NightlyTuning: () => null }));
vi.mock('../../src/whatsNew/hasNewsSince', () => ({ hasNewsSince: vi.fn() }));
vi.mock('../../src/appearance/appearanceSync', () => ({ restoreAppearance: vi.fn() }));
vi.mock('../../src/nav/lastRoute', () => ({ restoreLastRoute: vi.fn() }));
vi.mock('../../src/nav/scrollMemory', () => ({ restoreScrolls: vi.fn() }));
vi.mock('../../src/services/bookRequests', () => ({ startBookRequests: vi.fn() }));
vi.mock('../../src/ui/scrollGuard', () => ({ installScrollGuard: vi.fn() }));
vi.mock('../../src/ui/sheetBack', () => ({ leaveStaleSheets: vi.fn() }));
vi.mock('../../src/data/repositories', () => ({ placeInterest: () => placeInterest() }));

const FIRST_PAINT_MS = 2000;

async function boot(): Promise<void> {
  vi.resetModules();
  await import('../../src/main');
}

describe('the first paint (src/main.tsx)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render.mockClear();
    placeInterest.mockReset();
    document.body.innerHTML = '<div id="root"></div>';
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders at once when placing the interest is quick, and only once', async () => {
    placeInterest.mockResolvedValue({ greek: 0, hebrew: 0 });
    await boot();
    await vi.advanceTimersByTimeAsync(0);
    expect(render).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(FIRST_PAINT_MS * 5);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('renders within 2 s when placing the interest never resolves', async () => {
    placeInterest.mockReturnValue(new Promise(() => undefined));
    await boot();
    await vi.advanceTimersByTimeAsync(FIRST_PAINT_MS - 1);
    expect(render).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('renders within 2 s when placing the interest fails', async () => {
    placeInterest.mockRejectedValue(new Error('blocked'));
    await boot();
    await vi.advanceTimersByTimeAsync(0);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('still places the interest when it resolves after the render, without a second render', async () => {
    let place: (levels: { greek: number; hebrew: number }) => void = () => undefined;
    let placed = false;
    placeInterest.mockReturnValue(
      new Promise((resolve) => {
        place = (levels) => {
          placed = true;
          resolve(levels);
        };
      }),
    );
    await boot();
    await vi.advanceTimersByTimeAsync(FIRST_PAINT_MS);
    expect(render).toHaveBeenCalledTimes(1);
    expect(placeInterest).toHaveBeenCalledTimes(1);
    expect(placed).toBe(false);
    place({ greek: 2, hebrew: 2 });
    await vi.advanceTimersByTimeAsync(0);
    expect(placed).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
