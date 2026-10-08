import { describe, expect, it } from 'vitest';
import { DEFAULT_PRONUNCIATION, PRONUNCIATIONS, isPronunciation } from '../../src/speech/pronunciation';

describe('the Greek pronunciation registry', () => {
  it("has 'modern', which is the default", () => {
    expect(PRONUNCIATIONS.map((p) => p.id)).toContain('modern');
    expect(DEFAULT_PRONUNCIATION).toBe('modern');
  });

  it('names each entry for the screen and maps it to a voice language', () => {
    const modern = PRONUNCIATIONS.find((p) => p.id === 'modern');
    expect(modern).toMatchObject({ label: 'Modern Greek', lang: 'el-GR' });
  });

  it('knows its own ids and nothing else', () => {
    expect(isPronunciation('modern')).toBe(true);
    expect(isPronunciation('erasmian')).toBe(false);
    expect(isPronunciation(undefined)).toBe(false);
  });
});
