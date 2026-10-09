// features/steps/whats-new.steps.tsx — runs features/whats-new.feature: the banner's summary, the one-time sheet and
// About's list, check button and version link, over a fixture changelog (tests/support/changelog.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { versionLink } from 'bsv-kit/whats-new';
import { About } from '../../src/About';
import { APP_SEMVER, LAST_SEEN_VERSION_STORAGE_KEY, REPO, REPO_PUBLIC } from '../../src/config';
import { startAppUpdates } from '../../src/services/appUpdate';
import { UpdateBanner } from '../../src/UpdateBanner';
import { WhatsNewOnUpdate } from '../../src/whatsNew/WhatsNewOnUpdate';
import { fakeSetup, fakeWorker } from '../../tests/support/fake-registration';
import {
  OLDER_NEW,
  OLDER_VERSION,
  RUNNING_NEW,
  WAITING_FIXED,
  WAITING_NEW,
  fixtureChangelog,
  nextVersion,
  stubChangelog,
} from '../../tests/support/changelog';

const feature = await loadFeature('features/whats-new.feature');
const user = userEvent.setup();

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let stop: (() => void) | undefined;

  BeforeEachScenario(() => {
    cleanup();
    window.localStorage.clear();
    window.location.hash = '';
  });
  AfterEachScenario(() => {
    stop?.();
    stop = undefined;
    cleanup();
    vi.unstubAllGlobals();
  });
  afterAll(() => cleanup());

  /** The banner of a phone whose service worker has a newer build waiting, with the changelog the server holds. */
  function openWithWaiting(entries = fixtureChangelog()) {
    stubChangelog(entries);
    const setup = fakeSetup({ waiting: fakeWorker() });
    stop = startAppUpdates({ container: setup.container, registration: setup.registration, reload: setup.reload }).stop;
    render(<UpdateBanner />);
  }

  const sheet = () => screen.queryByRole('dialog', { name: "What's new" });
  const linesOf = (dialog: HTMLElement) => [...dialog.querySelectorAll('.bk-whats-new__line')].map((li) => li.textContent ?? '');

  Scenario("The Update ready banner names the waiting version and what is in it", ({ Given, Then, And }) => {
    Given('a newer build is waiting and its changelog lists 1 new line and 1 fixed line for it', () => openWithWaiting());
    Then('the update banner still reads "Update ready, tap to reload"', () => {
      expect(screen.getByRole('button', { name: 'Update ready, tap to reload' })).toBeEnabled();
    });
    And('the banner also says its version with "1 new, 1 fixed"', async () => {
      expect(await screen.findByText(new RegExp(`${nextVersion().replace(/\./g, '\\.')} · 1 new, 1 fixed`))).toBeVisible();
    });
  });

  Scenario("What's new in the banner opens the lines of the waiting version", ({ Given, When, Then, And }) => {
    Given('a newer build is waiting and its changelog lists 1 new line and 1 fixed line for it', () => openWithWaiting());
    When('he taps "What\'s new" in the banner', async () => {
      await user.click(await screen.findByRole('button', { name: "What's new" }));
    });
    Then("the What's new sheet lists the new line, then the fixed line, of the waiting version", () => {
      const dialog = sheet() as HTMLElement;
      expect(dialog).toBeVisible();
      expect(within(dialog).getByText(nextVersion())).toBeVisible();
      expect(linesOf(dialog)).toEqual([`New${WAITING_NEW}`, `Fixed${WAITING_FIXED}`]);
    });
    And("the What's new sheet does not list the version he is running", () => {
      expect(sheet()).not.toHaveTextContent(RUNNING_NEW);
    });
    When("he closes the What's new sheet", async () => {
      await user.click(within(sheet() as HTMLElement).getByRole('button', { name: 'Close' }));
    });
    Then("there is no What's new sheet", () => {
      expect(sheet()).toBeNull();
    });
  });

  Scenario('A waiting build with nothing new in its changelog shows the banner alone', ({ Given, Then, And }) => {
    Given('a newer build is waiting and its changelog has nothing after the running version', () =>
      openWithWaiting(fixtureChangelog().filter((e) => e.version !== nextVersion())),
    );
    Then('the update banner still reads "Update ready, tap to reload"', () => {
      expect(screen.getByRole('button', { name: 'Update ready, tap to reload' })).toBeEnabled();
    });
    And("the banner has no What's new button", async () => {
      // the changelog is read after the banner is drawn: give it the turn it needs, then look
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.queryByRole('button', { name: "What's new" })).toBeNull();
    });
  });

  Scenario('After an update the sheet shows once', ({ Given, When, Then, And }) => {
    const open = () => {
      cleanup();
      render(<WhatsNewOnUpdate />);
    };
    Given('the phone last saw an older version and the changelog lists lines since', () => {
      window.localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, OLDER_VERSION);
      stubChangelog([{ ...fixtureChangelog()[0], version: APP_SEMVER }, ...fixtureChangelog().slice(1)]);
    });
    When('Lampas opens', open);
    Then("the What's new sheet lists the lines of every version since, newest first", async () => {
      const dialog = await screen.findByRole('dialog', { name: "What's new" });
      const text = dialog.textContent ?? '';
      expect(text).toContain(WAITING_NEW);
      expect(text).toContain(RUNNING_NEW);
      expect(text).not.toContain(OLDER_NEW);
      expect(text.indexOf(WAITING_NEW)).toBeLessThan(text.indexOf(RUNNING_NEW));
    });
    When("he closes the What's new sheet", async () => {
      await user.click(within(sheet() as HTMLElement).getByRole('button', { name: 'Close' }));
    });
    And('Lampas opens again', () => {
      open();
    });
    Then("there is no What's new sheet", async () => {
      // the changelog is read again; wait until it has been, then look
      await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
      await act(async () => {
        await Promise.resolve();
      });
      expect(sheet()).toBeNull();
      expect(window.localStorage.getItem(LAST_SEEN_VERSION_STORAGE_KEY)).toBe(APP_SEMVER);
    });
  });

  Scenario("A first install is not told what's new", ({ Given, When, Then }) => {
    Given('the phone has never opened Lampas and the changelog lists lines', () => stubChangelog(fixtureChangelog()));
    When('Lampas opens', () => {
      render(<WhatsNewOnUpdate />);
    });
    Then("there is no What's new sheet", async () => {
      await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));
      await act(async () => {
        await Promise.resolve();
      });
      expect(sheet()).toBeNull();
      expect(window.localStorage.getItem(LAST_SEEN_VERSION_STORAGE_KEY)).toBe(APP_SEMVER);
    });
  });

  Scenario('About lists every version and can check for updates', ({ Given, When, Then, And }) => {
    Given('the changelog lists three versions', () => stubChangelog(fixtureChangelog()));
    When('he opens About', () => {
      render(<About />);
    });
    Then('About lists every version with its lines, newest first', async () => {
      const region = await screen.findByRole('region', { name: "What's new" });
      await waitFor(() => expect(region).toHaveTextContent(OLDER_NEW));
      const versions = [...region.querySelectorAll('.bk-whats-new__version')].map((h) => h.textContent);
      expect(versions).toEqual([nextVersion(), APP_SEMVER, OLDER_VERSION]);
      expect(linesOf(region)).toEqual([`New${WAITING_NEW}`, `Fixed${WAITING_FIXED}`, `New${RUNNING_NEW}`, `New${OLDER_NEW}`]);
    });
    And('About has a "Check for updates" button', () => {
      expect(screen.getByRole('button', { name: 'Check for updates' })).toBeEnabled();
    });
    When('he taps "Check for updates"', async () => {
      await user.click(screen.getByRole('button', { name: 'Check for updates' }));
    });
    Then('About says "Up to date"', async () => {
      expect(await screen.findByText('Up to date')).toBeVisible();
    });
  });

  Scenario('The version in About links to its place in CHANGELOG.md on GitHub', ({ Given, When, Then, And }) => {
    Given('the changelog lists three versions', () => stubChangelog(fixtureChangelog()));
    When('he opens About', () => {
      render(<About />);
    });
    Then("the version link goes to CHANGELOG.md on GitHub at this version's heading", () => {
      const href = versionLink({ repo: REPO, public: REPO_PUBLIC, version: APP_SEMVER });
      expect(href).toBe(`https://github.com/Jonathan-A-White/lampas/blob/main/CHANGELOG.md#${APP_SEMVER.replace(/\./g, '')}`);
      const link = screen.getByTestId('version-link');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
      expect(link).toHaveTextContent(APP_SEMVER);
    });
    And("the version still shows the build's time and commit", () => {
      expect(screen.getByTestId('build-version')).toHaveTextContent(`v${__APP_VERSION__}`);
    });
  });
});
