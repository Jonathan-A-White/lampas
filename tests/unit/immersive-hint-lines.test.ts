// mw-5r3p30.611: the Immersive reader's card (src/ImmersiveHint.tsx, its lines in src/immersive.ts) is written per reading mode. With Turn pages nothing scrolls, so a card that
// said 'Scroll down and the bars slide away.' told him of something that never happens. Each line here is checked against the gestures its mode has:
// a line that names a gesture the mode does not have fails, naming the mode, the line and the gesture.
import { describe, expect, it } from 'vitest';
import { IMMERSIVE_HINT_LINES } from '../../src/immersive';
import { readingModeSetting, type ReadingMode } from '../../src/settings/definitions/readingMode';

/** Every gesture a card line could name, and the reading modes that have it (src/immersive.ts, src/reader/usePages.ts, src/reader/useChapterSwipe.ts). */
const GESTURES: Array<{ name: string; said: RegExp; modes: ReadingMode[] }> = [
  { name: 'scrolling', said: /\bscroll/i, modes: ['scroll'] },
  { name: 'turning a page', said: /\b(turn|pages?)\b/i, modes: ['pages'] },
  { name: 'a tap on the right or left third', said: /\bthirds?\b/i, modes: ['pages'] },
  { name: 'a swipe', said: /\bswip/i, modes: ['scroll', 'pages'] },
  { name: 'a two-finger tap', said: /\btwo[ -]fingers?\b/i, modes: ['scroll', 'pages'] },
];

const modes = (readingModeSetting.allowed.kind === 'choice' ? readingModeSetting.allowed.values.map((v) => v.value) : []) as ReadingMode[];

describe('the Immersive reader card says only what works in the reading mode', () => {
  it('has lines for every reading mode', () => {
    expect(modes).toEqual(['scroll', 'pages']);
    for (const mode of modes) expect(IMMERSIVE_HINT_LINES[mode]?.length ?? 0, mode).toBeGreaterThan(0);
  });

  for (const mode of modes) {
    it(`names no gesture that ${mode} does not have`, () => {
      for (const line of IMMERSIVE_HINT_LINES[mode] ?? []) {
        for (const gesture of GESTURES) {
          if (gesture.said.test(line)) expect(gesture.modes, `${mode}: "${line}" names ${gesture.name}`).toContain(mode);
        }
      }
    });

    it(`says in ${mode} how the bars slide away, how to bring them back and how to leave`, () => {
      const lines = IMMERSIVE_HINT_LINES[mode] ?? [];
      expect(lines.some((line) => /slide away/.test(line))).toBe(true);
      expect(lines).toContain('Tap with two fingers to bring them back or put them away.');
      expect(lines).toContain('To leave immersive reading: Settings > Immersive reader.');
    });
  }

  it('the sweep catches a line from the other mode', () => {
    const named = (mode: ReadingMode, line: string) => GESTURES.filter((g) => g.said.test(line) && !g.modes.includes(mode)).map((g) => g.name);
    expect(named('pages', 'Scroll down and the bars slide away.')).toEqual(['scrolling']);
    expect(named('scroll', 'Turn to the next page and the bars slide away.')).toEqual(['turning a page']);
  });
});
