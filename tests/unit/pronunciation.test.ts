import { describe, expect, it } from 'vitest';
import { DEFAULT_PRONUNCIATION, PRONUNCIATIONS, isPronunciation, pronunciationOf, registerPronunciation } from '../../src/speech/pronunciation';

describe('the Greek pronunciation registry', () => {
  it("has 'modern', which is the default", () => {
    expect(PRONUNCIATIONS.map((p) => p.id)).toContain('modern');
    expect(DEFAULT_PRONUNCIATION).toBe('modern');
  });

  it('names each entry for the screen and maps it to a voice language', () => {
    const modern = PRONUNCIATIONS.find((p) => p.id === 'modern');
    expect(modern).toMatchObject({ label: 'Modern Greek', lang: 'el-GR' });
  });

  it('gives each entry a respelling', () => {
    expect(pronunciationOf('modern').respell('χριστῷ')).toBe('hree-STO');
  });

  it('knows its own ids and nothing else', () => {
    expect(isPronunciation('modern')).toBe(true);
    expect(isPronunciation('erasmian')).toBe(false);
    expect(isPronunciation(undefined)).toBe(false);
  });

  it('takes a registered scheme, and gives it up again', () => {
    const unregister = registerPronunciation({ id: 'test', label: 'Test', lang: 'el-GR', note: '', respell: (w) => `<${w}>` });
    expect(PRONUNCIATIONS.map((p) => p.id)).toEqual(['modern', 'test']);
    expect(isPronunciation('test')).toBe(true);
    expect(pronunciationOf('test').respell('λόγος')).toBe('<λόγος>');
    unregister();
    expect(PRONUNCIATIONS.map((p) => p.id)).toEqual(['modern']);
    expect(pronunciationOf('test').id).toBe('modern');
  });
});
