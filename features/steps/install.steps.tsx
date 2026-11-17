// features/steps/install.steps.tsx — runs features/install.feature: the zoom and scroll rules in
// index.html and the root css, and the update banner under a fake registration (the manifest of a real build: features/build.feature).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { UpdateBanner } from '../../src/UpdateBanner';
import { startAppUpdates, type AppUpdates } from 'pwa-kit/app-update';
import { fakeSetup, fakeWorker, type FakeSetup, type FakeWorker } from '../../tests/support/fake-registration';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

let html = '';
let css = '';

let setup: FakeSetup;
let waiting: FakeWorker;
let updates: AppUpdates | undefined;
afterAll(() => {
  updates?.stop();
  cleanup();
});

const feature = await loadFeature('features/install.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The page cannot be zoomed or scrolled', ({ Given, Then }) => {
    Given('the document and its root stylesheet', () => {
      html = read('index.html');
      css = read('src/index.css');
    });

    Then('the document forbids pinch zoom and double-tap zoom and the body never scrolls under the app', () => {
      const viewport = html.match(/<meta name="viewport" content="([^"]*)"/)?.[1] ?? '';
      for (const token of ['width=device-width', 'initial-scale=1.0', 'viewport-fit=cover', 'maximum-scale=1', 'user-scalable=no', 'interactive-widget=resizes-content']) {
        expect(viewport).toContain(token);
      }
      expect(css).toMatch(/html\s*\{[^}]*touch-action:\s*manipulation/);
      const root = css.match(/html,\s*body,\s*#root\s*\{([^}]*)\}/)?.[1] ?? '';
      expect(root).toMatch(/overflow:\s*clip/);
      expect(root).toMatch(/overscroll-behavior:\s*none/);
      expect(root).toMatch(/height:\s*100dvh/);
      expect(root).not.toMatch(/100vh/);
    });
  });

  Scenario('An update waits for a tap', ({ Given, And, When, Then }) => {
    Given('the service worker registers with the prompt flow', () => {
      const config = read('vite.config.ts');
      expect(config).toMatch(/registerType:\s*'prompt'/);
      expect(config).not.toMatch(/autoUpdate/);
    });

    And('a newer build is waiting behind the one in control', () => {
      cleanup();
      updates?.stop();
      waiting = fakeWorker('installed');
      setup = fakeSetup({ waiting });
      updates = startAppUpdates({ container: setup.container, registration: setup.registration, reload: setup.reload });
      render(<UpdateBanner />);
    });

    Then('the banner says Update', () => {
      expect(screen.getByRole('button', { name: /Update/ })).toBeEnabled();
    });

    And('nothing is taken yet', () => {
      expect(waiting.postMessage).not.toHaveBeenCalled();
      expect(setup.reload).not.toHaveBeenCalled();
    });

    When('he taps Update', async () => {
      await userEvent.click(screen.getByRole('button', { name: /Update/ }));
    });

    Then('the waiting build is told to take over', () => {
      expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(waiting.postMessage).toHaveBeenCalledTimes(1);
    });
  });
});
