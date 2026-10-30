// The Reader's scroll memory (src/nav/scrollMemory.ts) keeps one place per chapter: switching the mode (English / Weave / Greek, mw-5r3p30.863) must not change
// the key the offset is kept under, or the switch restores the offset the other mode last had, unrelated to the verse he was reading.
import { describe, expect, it } from 'vitest';
import { scrollAddress } from '../../src/nav/scrollMemory';

describe('the address a Reader scroll offset is kept under', () => {
  const chapter = '#/?b=act&c=18';

  it('does not change with the view', () => {
    expect(scrollAddress(`${chapter}&view=english&weave=solid`)).toBe(scrollAddress(`${chapter}&view=greek&weave=solid`));
  });

  it('does not change with the weave', () => {
    const kept = scrollAddress(`${chapter}&view=english&weave=off`);
    expect(scrollAddress(`${chapter}&view=english&weave=solid`)).toBe(kept);
    expect(scrollAddress(`${chapter}&view=english&weave=solid%2Blearning`)).toBe(kept);
  });

  it('does not change with the selected verse', () => {
    expect(scrollAddress(`${chapter}&view=greek&weave=solid&v=14`)).toBe(scrollAddress(`${chapter}&view=greek&weave=solid`));
  });

  it('still tells one chapter from another', () => {
    expect(scrollAddress('#/?b=act&c=18&view=greek')).not.toBe(scrollAddress('#/?b=act&c=19&view=greek'));
    expect(scrollAddress('#/?b=act&c=18')).not.toBe(scrollAddress('#/?b=rom&c=18'));
  });
});
