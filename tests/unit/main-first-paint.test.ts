import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// mw-5r3p30.862: on his phone the splash stayed ~20 s because the first render waited on placeInterest() (Dexie) with no bound.
// src/main.tsx runs at import, so each test mocks what it touches, imports it, and watches createRoot().render.

const render = vi.fn();
const placeInterest = vi.fn<() => Promise<{ greek: number; hebrew: number }>>();
const refreshOfflineCopy = vi.fn<() => Promise<undefined>>();
const registerSW = vi.fn<(options: { onRegisteredSW?: (url: string, registration: unknown) => void }) => void>();
const startAppUpdates = vi.fn<(deps: { registration: { update(): Promise<unknown> } }) => void>();

vi.mock('react-dom/client', () => ({ createRoot: () => ({ render }) }));
vi.mock('virtual:pwa-register', () => ({ registerSW: (options: never) => registerSW(options) }));
vi.mock('pwa-kit/app-update', () => ({ startAppUpdates: (deps: never) => startAppUpdates(deps) }));
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
vi.mock('../../src/data/offlineCopy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/data/offlineCopy')>()),
  refreshOfflineCopy: () => refreshOfflineCopy(),
}));
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
    refreshOfflineCopy.mockReset().mockResolvedValue(undefined);
    registerSW.mockReset();
    startAppUpdates.mockReset();
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

  describe('the kept copy (mw-lcv9z3g.3)', () => {
    it('is refreshed after the first render, which does not wait for it', async () => {
      const order: string[] = [];
      render.mockImplementation(() => void order.push('render'));
      refreshOfflineCopy.mockImplementation(() => {
        order.push('refresh');
        return new Promise(() => undefined);
      });
      placeInterest.mockResolvedValue({ greek: 0, hebrew: 0 });
      await boot();
      await vi.advanceTimersByTimeAsync(0);
      expect(order).toEqual(['render', 'refresh']);
      expect(render).toHaveBeenCalledTimes(1);
      render.mockReset();
    });

    it('is refreshed once more after each update check that ends, never before the first render', async () => {
      placeInterest.mockReturnValue(new Promise(() => undefined));
      await boot();
      const registration = { waiting: null, installing: null, update: vi.fn(async () => undefined), addEventListener: vi.fn(), removeEventListener: vi.fn() };
      registerSW.mock.calls[0][0].onRegisteredSW?.('/sw.js', registration);
      const wrapped = startAppUpdates.mock.calls[0][0].registration;
      await wrapped.update();
      expect(registration.update).toHaveBeenCalledTimes(1);
      expect(refreshOfflineCopy).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(FIRST_PAINT_MS);
      expect(refreshOfflineCopy).toHaveBeenCalledTimes(1);
      await wrapped.update();
      expect(refreshOfflineCopy).toHaveBeenCalledTimes(2);
      render.mockReset();
    });
  });
});
