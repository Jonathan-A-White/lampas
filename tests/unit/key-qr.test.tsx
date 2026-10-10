// The Unlock screen's key QR (mw-5r3p30.165): Postern's Issue a licence scanner reads QR codes only, so the phone's key is drawn as one.
import { render, screen } from '@testing-library/react';
import { create } from 'qrcode';
import { describe, expect, it } from 'vitest';
import { Unlock } from '../../src/gate/Unlock';
import { qrPath } from '../../src/gate/qr';

const KEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

/** Reads the dark modules back out of the SVG path, one 'M<col> <row>h1v1h-1z' a module. */
function modulesOf(path: string, size: number): boolean[] {
  const dark = new Array<boolean>(size * size).fill(false);
  for (const m of path.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) dark[Number(m[2]) * size + Number(m[1])] = true;
  return dark;
}

describe('the key as a QR code', () => {
  it('draws exactly the modules of qrcode.create(key) at error level M', () => {
    const { size, path } = qrPath(KEY);
    const expected = create(KEY, { errorCorrectionLevel: 'M' }).modules;
    expect(size).toBe(expected.size);
    expect(modulesOf(path, size)).toEqual(Array.from(expected.data, Boolean));
  });

  it('shows on Unlock above the key text and Copy, named for a screen reader, with a quiet zone of 4 and at least 192 px', () => {
    render(<Unlock locked={{ kind: 'none' }} publicKeyHex={KEY} onCheckAgain={() => {}} />);
    const qr = screen.getByRole('img', { name: 'This phone’s key as a QR code' });
    const { size, path } = qrPath(KEY);
    expect(qr.getAttribute('viewBox')).toBe(`-4 -4 ${size + 8} ${size + 8}`);
    expect(qr.querySelector('path')?.getAttribute('d')).toBe(path);
    expect(qr.getAttribute('class')).toMatch(/\bh-48\b/); // 12rem = 192 px
    expect(qr.getAttribute('class')).toMatch(/\bw-48\b/);
    const key = screen.getByTestId('device-key');
    const copy = screen.getByRole('button', { name: 'Copy' });
    expect(qr.compareDocumentPosition(key) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(key.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(key).toHaveTextContent(KEY);
  });

  it('keeps the key text in the monospace face with slashed zeros, so a 0 cannot be read as an o', () => {
    render(<Unlock locked={{ kind: 'none' }} publicKeyHex={KEY} onCheckAgain={() => {}} />);
    const key = screen.getByTestId('device-key');
    expect(key).toHaveClass('font-mono');
    expect(key).toHaveClass('slashed-zero');
  });
});
