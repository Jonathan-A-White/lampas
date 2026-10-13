// features/steps/app-update.steps.tsx — runs features/app-update.feature: the real update logic
// (src/services/appUpdate.ts) and banner on a fake service worker container (tests/support/fake-registration.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, expect, vi } from 'vitest';
import type { ChangelogEntry } from 'bsv-kit/whats-new';
import { APP_SEMVER } from '../../src/config';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { startAppUpdates, UPDATE_CHECK_EVERY_MS } from '../../src/services/appUpdate';
import { UpdateBanner } from '../../src/UpdateBanner';
import { fakeSetup, fakeWorker, type FakeSetup, type FakeWorker } from '../../tests/support/fake-registration';

const feature = await loadFeature('features/app-update.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let setup: FakeSetup;
  let waiting: FakeWorker | undefined;
  let stop: (() => void) | undefined;

  function open(withWaiting: boolean, changelog?: () => Promise<ChangelogEntry[] | null>) {
    cleanup();
    waiting = withWaiting ? fakeWorker() : undefined;
    setup = fakeSetup({ waiting });
    stop = startAppUpdates({ container: setup.container, registration: setup.registration, reload: setup.reload, changelog, version: APP_SEMVER }).stop;
    render(<UpdateBanner />);
  }

  BeforeEachScenario(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });
  AfterEachScenario(() => {
    stop?.();
    cleanup();
    vi.useRealTimers();
  });
  afterAll(() => cleanup());

  Scenario('A worker waiting behind the one in control shows Update ready', ({ Given, Then }) => {
    Given('Lampas is open on a phone whose service worker has a newer build waiting', () => open(true));
    Then('the update banner reads "Update ready, tap to reload"', () => {
      expect(screen.getByRole('button', { name: 'Update ready, tap to reload' })).toBeEnabled();
    });
  });

  Scenario('No waiting worker shows no banner', ({ Given, Then }) => {
    Given('Lampas is open on a phone with nothing waiting', () => open(false));
    Then('there is no update banner', () => {
      expect(screen.queryByText('Update ready, tap to reload')).toBeNull();
    });
  });

  Scenario('The tap tells the waiting worker to take over and the page reloads once when it has', ({ Given, When, Then, And }) => {
    Given('Lampas is open on a phone whose service worker has a newer build waiting', () => open(true));
    When('he taps the update banner', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Update ready, tap to reload' }));
    });
    Then('the waiting worker is sent SKIP_WAITING', () => {
      expect(waiting!.postMessage).toHaveBeenCalledTimes(1);
      expect(waiting!.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
    And('the banner goes dead and says "Updating…"', () => {
      expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled();
    });
    When('the new worker takes control twice over', () => {
      act(() => {
        setup.controllerChanges();
        setup.controllerChanges();
      });
    });
    Then('the page has reloaded exactly once', () => {
      expect(setup.reload).toHaveBeenCalledTimes(1);
    });
  });

  Scenario('The app looks for an update on start, on return to the foreground and every 30 minutes', ({ Given, When, Then }) => {
    Given('Lampas is open on a phone with nothing waiting', () => open(false));
    Then('it has looked for an update once', () => {
      expect(setup.registration.update).toHaveBeenCalledTimes(1);
    });
    When('the phone brings Lampas back to the foreground', () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Then('it has looked for an update twice', () => {
      expect(setup.registration.update).toHaveBeenCalledTimes(2);
    });
    When('30 minutes pass', () => void vi.advanceTimersByTime(UPDATE_CHECK_EVERY_MS));
    Then('it has looked for an update 3 times', () => {
      expect(setup.registration.update).toHaveBeenCalledTimes(3);
    });
  });

  Scenario('A build with nothing new to show waits for the app to be hidden, then takes over by itself', ({ Given, Then, And, When }) => {
    Given('Lampas is open on a phone and a newer build with nothing new to show is found waiting', async () => {
      open(false, async () => [{ version: APP_SEMVER, date: '2026-10-12', story: 'fx-1', kind: 'fixed', text: 'A line.' }]);
      waiting = setup.newWorkerWaits();
      await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
    });
    Then('there is no update banner', () => {
      expect(screen.queryByText('Update ready, tap to reload')).toBeNull();
    });
    And('the waiting worker has not been told to take over', () => {
      expect(waiting!.postMessage).not.toHaveBeenCalled();
    });
    When('the phone puts Lampas in the background', () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Then('the waiting worker is sent SKIP_WAITING', () => {
      expect(waiting!.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
    When('the new worker takes control twice over', () => {
      act(() => {
        setup.controllerChanges();
        setup.controllerChanges();
      });
    });
    Then('the page has reloaded exactly once', () => {
      expect(setup.reload).toHaveBeenCalledTimes(1);
    });
  });

  Scenario('A take-over that did not happen is asked for again the next time the app is hidden', ({ Given, When, And, Then }) => {
    const setVisibility = (value: DocumentVisibilityState) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    Given('Lampas is open on a phone and a newer build with nothing new to show is found waiting', async () => {
      open(false, async () => [{ version: APP_SEMVER, date: '2026-10-12', story: 'fx-1', kind: 'fixed', text: 'A line.' }]);
      waiting = setup.newWorkerWaits();
      await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
    });
    When('the phone puts Lampas in the background', () => setVisibility('hidden'));
    And('the phone brings Lampas back at once without the worker taking over', () => setVisibility('visible'));
    And('the phone puts Lampas in the background again', () => setVisibility('hidden'));
    Then('the waiting worker has been sent SKIP_WAITING twice', () => {
      expect(waiting!.postMessage).toHaveBeenCalledTimes(2);
    });
  });
});
