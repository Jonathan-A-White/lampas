// tests/unit/open-in-app.test.tsx — 'Open in the app' (mw-5r3p30.1041): in a Chrome tab on Android where navigator.getInstalledRelatedApps names the installed
// Lampas, one labelled control hands the same address to Android through an intent: URL. Not where the API is absent or reports nothing, not in the installed app,
// not once dismissed for the session, and nothing leaves the page but his tap.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const goTo = vi.hoisted(() => vi.fn());
vi.mock('../../src/openInApp', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/openInApp')>()), goTo }));

import { OpenInApp } from '../../src/OpenInApp';
import { DISMISSED_KEY, intentUrl } from '../../src/openInApp';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function setup({ ua = ANDROID, standalone = false, apps }: { ua?: string; standalone?: boolean; apps?: unknown[] | 'absent' } = {}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: standalone && /standalone/.test(query), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const asked = vi.fn(async () => apps ?? [{ platform: 'webapp', url: 'https://lampas.allmymind.org/manifest.webmanifest' }]);
  if (apps === 'absent') delete (navigator as unknown as Record<string, unknown>).getInstalledRelatedApps;
  else Object.defineProperty(navigator, 'getInstalledRelatedApps', { value: asked, configurable: true, writable: true });
  return asked;
}

const control = () => screen.queryByRole('button', { name: 'Open in the app' });

beforeEach(() => {
  goTo.mockReset();
  window.history.replaceState(null, '', '/#/?b=Rom&c=8&v=28');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (navigator as unknown as Record<string, unknown>).getInstalledRelatedApps;
});

describe('intentUrl', () => {
  it('hands the same https address, hash and verse included, to Android', () => {
    const url = intentUrl('https://lampas.allmymind.org/#/?b=Rom&c=8&v=28');
    expect(url.startsWith('intent://lampas.allmymind.org/#/?b=Rom&c=8&v=28#Intent;')).toBe(true);
    expect(url).toContain(';scheme=https;');
    expect(url.endsWith(';end')).toBe(true);
    // a tab that stays open when the app does not take it
    expect(url).toContain(`S.browser_fallback_url=${encodeURIComponent('https://lampas.allmymind.org/#/?b=Rom&c=8&v=28')}`);
  });
  it('keeps a port and a plain http scheme, for a preview', () => {
    expect(intentUrl('http://localhost:4173/#/words')).toMatch(/^intent:\/\/localhost:4173\/#\/words#Intent;scheme=http;/);
  });
});

describe('OpenInApp', () => {
  it('shows one labelled control in a Android browser tab where the API reports the app, and a tap goes to the same address through an intent: URL', async () => {
    const asked = setup();
    render(<OpenInApp />);
    const button = await screen.findByRole('button', { name: 'Open in the app' });
    expect(asked).toHaveBeenCalledTimes(1);
    expect(goTo).not.toHaveBeenCalled(); // no automatic redirect
    window.history.replaceState(null, '', '/#/?b=Jhn&c=3&v=16'); // he read on before he tapped: the address at the tap is the one handed over
    fireEvent.click(button);
    expect(goTo).toHaveBeenCalledTimes(1);
    expect(goTo).toHaveBeenCalledWith(intentUrl(window.location.href));
    expect(goTo.mock.calls[0]![0]).toContain('#/?b=Jhn&c=3&v=16#Intent;');
  });

  it('shows nothing where the API reports nothing', async () => {
    const asked = setup({ apps: [] });
    render(<OpenInApp />);
    await waitFor(() => expect(asked).toHaveBeenCalled());
    await Promise.resolve();
    expect(control()).toBeNull();
  });

  it('shows nothing where the API reports only another app', async () => {
    const asked = setup({ apps: [{ platform: 'play', id: 'com.example.other' }] });
    render(<OpenInApp />);
    await waitFor(() => expect(asked).toHaveBeenCalled());
    await Promise.resolve();
    expect(control()).toBeNull();
  });

  it('shows nothing where the API is absent', async () => {
    setup({ apps: 'absent' });
    const { container } = render(<OpenInApp />);
    await Promise.resolve();
    expect(control()).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing where the API rejects', async () => {
    const asked = setup();
    asked.mockRejectedValue(new Error('not allowed'));
    render(<OpenInApp />);
    await waitFor(() => expect(asked).toHaveBeenCalled());
    await Promise.resolve();
    expect(control()).toBeNull();
  });

  it('never shows inside the installed app, and does not even ask', async () => {
    const asked = setup({ standalone: true });
    render(<OpenInApp />);
    await Promise.resolve();
    expect(control()).toBeNull();
    expect(asked).not.toHaveBeenCalled();
  });

  it('shows nothing off Android: an intent: URL is Android Chrome\'s', async () => {
    const asked = setup({ ua: DESKTOP });
    render(<OpenInApp />);
    await Promise.resolve();
    expect(control()).toBeNull();
    expect(asked).not.toHaveBeenCalled();
  });

  it('is put away for the session by Not now, and stays away on the next draw', async () => {
    setup();
    const first = render(<OpenInApp />);
    await screen.findByRole('button', { name: 'Open in the app' });
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(control()).toBeNull();
    expect(goTo).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(DISMISSED_KEY)).toBe('1');
    first.unmount();
    const asked = setup();
    render(<OpenInApp />);
    await Promise.resolve();
    expect(control()).toBeNull();
    expect(asked).not.toHaveBeenCalled();
  });
});
