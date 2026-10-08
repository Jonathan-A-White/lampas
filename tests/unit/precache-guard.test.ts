import { describe, expect, it } from 'vitest';
import { isGuardedAsset, typeFits } from '../../src/precacheGuard';

const reply = (type: string) => new Response('x', { headers: { 'Content-Type': type } });

describe('the precache guard', () => {
  it('watches scripts and stylesheets only', () => {
    expect(isGuardedAsset('/assets/index-abc.css')).toBe(true);
    expect(isGuardedAsset('/assets/index-abc.js')).toBe(true);
    expect(isGuardedAsset('/icon-192.png')).toBe(false);
  });

  it('refuses the app page standing in for a stylesheet or script', () => {
    expect(typeFits('https://lampas.allmymind.org/assets/a.css', reply('text/html'))).toBe(false);
    expect(typeFits('https://lampas.allmymind.org/assets/a.js', reply('text/html; charset=utf-8'))).toBe(false);
    expect(typeFits('https://lampas.allmymind.org/assets/a.css', reply('text/css; charset=utf-8'))).toBe(true);
    expect(typeFits('https://lampas.allmymind.org/assets/a.js', reply('text/javascript'))).toBe(true);
  });
});
