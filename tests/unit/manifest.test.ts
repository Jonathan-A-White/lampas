import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pwaManifest, THEME_COLOR } from '../../pwa-manifest';
import { injectManifestOptions } from '../../pwa-precache';
import { SHARE_FILE_ACCEPT, SHARE_FILES_FIELD, SHARE_TARGET_PATH } from '../../src/share/target';

const html = readFileSync('index.html', 'utf-8');

describe('pwaManifest', () => {
  it('is Lampas, standalone, scoped to the root of its own domain', () => {
    expect(pwaManifest.name).toBe('Lampas');
    expect(pwaManifest.short_name).toBe('Lampas');
    expect(pwaManifest.display).toBe('standalone');
    expect(pwaManifest.start_url).toBe('/');
    expect(pwaManifest.scope).toBe('/');
  });

  it('has the same theme colour as index.html', () => {
    expect(pwaManifest.theme_color).toBe(THEME_COLOR);
    expect(pwaManifest.background_color).toBe(THEME_COLOR);
    expect(html).toContain(`<meta name="theme-color" content="${THEME_COLOR}" />`);
  });

  it('ships PNG icons at 192 and 512, one of them maskable, and a PNG touch icon for iOS', () => {
    const icons = pwaManifest.icons ?? [];
    expect(icons.some((i) => i.sizes === '192x192' && i.type === 'image/png')).toBe(true);
    expect(icons.some((i) => i.sizes === '512x512' && i.type === 'image/png' && i.purpose === 'maskable')).toBe(true);
    expect(html).toContain('<link rel="apple-touch-icon" href="/icon-192.png" />');
  });

  it('hands web+lampas: links to the reference in the address', () => {
    expect(pwaManifest.protocol_handlers).toEqual([{ protocol: 'web+lampas', url: '/#/?ref=%s' }]);
  });

  it('is a share target: a POST of multipart/form-data with the pictures, title, text and link', () => {
    expect(pwaManifest.share_target).toEqual({
      action: SHARE_TARGET_PATH,
      method: 'POST',
      enctype: 'multipart/form-data',
      params: { title: 'title', text: 'text', url: 'url', files: [{ name: SHARE_FILES_FIELD, accept: SHARE_FILE_ACCEPT }] },
    });
    expect(SHARE_FILE_ACCEPT).toEqual(['image/*']);
  });

  it('raises the precache size limit past workbox default of 2 MiB', () => {
    expect(injectManifestOptions.maximumFileSizeToCacheInBytes).toBeGreaterThan(2 * 1024 * 1024);
  });
});
