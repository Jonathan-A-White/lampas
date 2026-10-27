// tests/unit/verse-view-source.test.tsx — the Verse view in the chapter's own language (mw-gdcyf98.4): the attributes of a Hebrew, Greek or English span, the Hebrew view's withheld Read it aloud,
// and a Hebrew word's Tap to hear (its language, and the line when the phone has no Hebrew voice).
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { rowAttrs } from '../../src/reader/sourceText';
import { GREEK_LANG, langOf, langOfSource } from '../../src/script/greekLang';
import { TapToHear } from '../../src/TapToHear';
import { actionsFor } from '../../src/verse/action';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, stubSpeech } from '../support/fake-speech';

afterEach(cleanup);

describe('the language of a span by the chapter\'s source', () => {
  it('is he, right to left, in the Hebrew face for a Hebrew chapter', () => {
    expect(langOfSource('hbo')).toEqual({ lang: 'he', 'data-lang': 'hbo', dir: 'rtl', className: 'script-he' });
  });

  it('is el with the ancient meaning in data-lang for a Greek chapter, and en otherwise', () => {
    expect(langOfSource('grc')).toEqual(GREEK_LANG);
    expect(langOfSource('en')).toEqual({ lang: 'en' });
  });

  it('leaves langOf as it was, for the callers that only know Greek or English', () => {
    expect(langOf(true)).toEqual(GREEK_LANG);
    expect(langOf(false)).toEqual({ lang: 'en' });
  });

  it('is what a row of the source view is tagged with, less the face, and the English view is en', () => {
    expect(rowAttrs('greek', 'hbo')).toEqual({ lang: 'he', 'data-lang': 'hbo', dir: 'rtl' });
    expect(rowAttrs('greek', 'grc')).toEqual(GREEK_LANG);
    expect(rowAttrs('english', 'hbo')).toEqual({ lang: 'en' });
  });
});

describe('the actions of the Verse view by its view', () => {
  it('lose Read it aloud in the Hebrew view of an Old Testament verse and keep it in the English view', () => {
    expect(actionsFor(true, 'hbo', 'greek').map((a) => a.id)).toEqual(['listen', 'ask']);
    expect(actionsFor(true, 'hbo', 'english').map((a) => a.id)).toEqual(['listen', 'read', 'ask']);
  });

  it('keep Read it aloud in the Greek view of a New Testament verse', () => {
    expect(actionsFor(true, 'grc', 'greek').map((a) => a.id)).toContain('read');
  });
});

describe('Tap to hear on a Hebrew word', () => {
  it('says it in the Hebrew voice', async () => {
    const synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]);
    render(<TapToHear text="יוֹנָה" />);
    await act(async () => {
      await userEvent.setup().click(screen.getByTestId('tap-to-hear'));
    });
    expect(synth.spoken[0]).toMatchObject({ lang: 'he-IL', voice: HEBREW_VOICE });
  });

  it('names Hebrew, and speaks nothing, where the phone has no Hebrew voice', async () => {
    const synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
    render(<TapToHear text="יוֹנָה" />);
    await act(async () => {
      await userEvent.setup().click(screen.getByTestId('tap-to-hear'));
    });
    expect(await screen.findByRole('status')).toHaveTextContent('No Hebrew voice on this phone');
    expect(synth.spoken).toEqual([]);
  });
});
