// Hebrew in the tutor's text (mw-5r3p30.97): a Hebrew stretch is set apart as lang="he" dir="rtl" in its own font, so it sits inside an English
// line without turning the line round, and it is never read by the English voice.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Markdown } from '../../src/markdown/Markdown';
import { splitScripts } from '../../src/script/scripts';
import { answerRuns } from '../../src/speech/answerRuns';

afterEach(cleanup);

describe('splitScripts', () => {
  it('cuts a Hebrew word, with its points, out of the English around it, in order', () => {
    expect(splitScripts('The word צֶדֶק tsedeq means right.')).toEqual([
      { text: 'The word ' },
      { text: 'צֶדֶק', script: 'he' },
      { text: ' tsedeq means right.' },
    ]);
  });

  it('keeps a phrase of Hebrew words one stretch, and leaves text with no Hebrew whole', () => {
    expect(splitScripts('בְּרֵאשִׁית בָּרָא and so on').map((p) => p.text)).toEqual(['בְּרֵאשִׁית בָּרָא', ' and so on']);
    expect(splitScripts('tsedeq only')).toEqual([{ text: 'tsedeq only' }]);
  });
});

describe('Markdown with Hebrew in it', () => {
  it('sets each Hebrew stretch in a span lang he, dir rtl, and the rest in order around it', () => {
    const { container } = render(<Markdown text={'Righteousness is **צֶדֶק** (tsedeq) in Hebrew.'} />);
    const span = container.querySelector('span[lang="he"]');
    expect(span?.getAttribute('dir')).toBe('rtl');
    expect(span?.textContent).toBe('צֶדֶק');
    expect(span?.closest('strong')).not.toBeNull();
    expect(container.textContent).toBe('Righteousness is צֶדֶק (tsedeq) in Hebrew.');
  });

  it('adds no span to an answer with no Hebrew', () => {
    const { container } = render(<Markdown text="Only tsedeq here." />);
    expect(container.querySelector('[lang]')).toBeNull();
  });
});

describe('reading an answer aloud', () => {
  it('leaves Hebrew letters out of the English voice (the Hebrew voice is a later story)', () => {
    const runs = answerRuns('The word צֶדֶק tsedeq means right.');
    expect(runs).toEqual([{ text: 'The word tsedeq means right.', language: 'english' }]);
  });
});
