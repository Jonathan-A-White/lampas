// The reader's scroll memory is keyed by the chapter, not by the mode it is read in (mw-5r3p30.863): a switch of view or weave must not look up (and restore) the offset
// the other mode last had, which is another verse in this mode's heights.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { forgetScrolls, scrollAddress, useScrollMemory } from '../../src/nav/scrollMemory';

const ENGLISH = '#/?b=act&c=18&view=english&weave=solid';
const GREEK = '#/?b=act&c=18&view=greek&weave=solid';
const OFF = '#/?b=act&c=18&view=english&weave=off';

function Box() {
  const ref = useScrollMemory('reader');
  return (
    <main ref={ref} data-box>
      <div style={{ height: 5000 }} />
    </main>
  );
}

beforeEach(() => {
  forgetScrolls();
  localStorage.clear();
});

afterEach(cleanup);

describe('the address a reader offset is kept under', () => {
  it('is the same in every view and weave of a chapter', () => {
    expect(scrollAddress(GREEK)).toBe(scrollAddress(ENGLISH));
    expect(scrollAddress(OFF)).toBe(scrollAddress(ENGLISH));
    expect(scrollAddress(`${ENGLISH}&v=14`)).toBe(scrollAddress(ENGLISH));
  });

  it('still tells one chapter from another', () => {
    expect(scrollAddress('#/?b=act&c=19&view=english')).not.toBe(scrollAddress(ENGLISH));
    expect(scrollAddress('#/?b=gen&c=18&view=english')).not.toBe(scrollAddress(ENGLISH));
  });
});

describe('a box shown again at another view of the chapter', () => {
  it('is put back to the chapter\'s one offset, not to a second one kept for that view', () => {
    window.location.hash = ENGLISH;
    const { container } = render(<Box />);
    const box = container.querySelector<HTMLElement>('[data-box]') as HTMLElement;
    box.scrollTop = 900;
    fireEvent.scroll(box);
    cleanup();

    window.location.hash = GREEK;
    const again = render(<Box />);
    const next = again.container.querySelector<HTMLElement>('[data-box]') as HTMLElement;
    expect(next.scrollTop).toBe(900);
  });
});
