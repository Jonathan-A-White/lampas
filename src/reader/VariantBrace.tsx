// src/reader/VariantBrace.tsx — the brace after a variant unit's words (mw-9ji6ek0.5): '{the Lord NA ECM}', the other reading(s) of the unit, each once with the small chip
// of every witness that reads it (src/reader/variants.ts braceReadings; with another reading laid in place in the text, mw-9ji6ek0.24, the brace holds the others and the text's own under RP), in the Greek of the reading or its English as VerseText says. The brace is a label, not a button
// (mw-9ji6ek0.15): each word of a reading is a Tap like a word of the text and opens the word popup (VerseText's onWord), and the siglum (the chip, B or NA) is the target of
// the unit's sheet (mw-9ji6ek0.6), a 44 px square of its own that takes its own room in the line, so a finger a few pixels off still lands on it and never on a word beside it.
import { Fragment, type KeyboardEvent } from 'react';
import { GREEK_LANG } from '../script/greekLang';
import { NO_SELECT } from '../ui/longPress';
import { Tap, TAP_PAD } from './Tap';
import { variantEnglishClass } from './englishSource';
import type { GreekWord } from '../data/chapter';
import { braceReadings, braceTokens, LEFT_OUT, SAME, type BraceReading, type ShownUnit, type WitnessChip } from './variants';

/** Each chip spelled out, for a screen reader. */
const SPELLED: Record<WitnessChip, string> = { B: 'Byzantine split', NA: 'Nestle-Aland', ECM: 'ECM', RP: 'Robinson-Pierpont text' };
/** A no-break space and a word joiner: nothing between the last word of a reading and its sigla, or between a siglum and the closing brace, is a place to break the line (mw-9ji6ek0.16). */
const NBSP = '\u00a0';
const JOIN = '\u2060';
/** a mark of the apparatus with no letter in it ('…', where a reading is in pieces) is drawn, not tapped */
const HAS_LETTER = /\p{L}/u;

export function VariantBrace({ shown, language, weaveWord, onOpen, onWord, onSay }: {
  shown: ShownUnit;
  /** the language of the readings: the Greek view's and a woven unit's Greek, else English */
  language: 'greek' | 'english';
  /** the Weave's rule for one Greek word (WovenVerse.word, set when the weave is on): an English reading the build paired word by word is drawn like the text, the words he knows in Greek and the rest English (mw-9ji6ek0.37) */
  weaveWord?: (word: GreekWord) => 'solid' | 'learning' | null;
  onOpen?: (shown: ShownUnit) => void;
  /** a tap on a word of a reading: the word as drawn, the reading it is in, and the language it is drawn in (a woven chip has both) */
  onWord?: (word: string, reading: BraceReading, shown: ShownUnit, language: 'greek' | 'english') => void;
  /** a long press on a word: say it, in the language it is drawn in */
  onSay?: (word: string, language: 'greek' | 'english') => void;
}) {
  const readings = braceReadings(shown, language);
  const label = `Other reading${readings.length > 1 ? 's' : ''}: ${readings
    .map((r) => `${r.same ? 'the same in English' : r.text || LEFT_OUT} (${r.chips.map((c) => SPELLED[c]).join(', ')})`)
    .join('; ')}`;
  const open = () => onOpen?.(shown);
  return (
    <>
      <span role="group" data-brace="" data-brace-lang={language} aria-label={label} className="font-sans text-[0.85em] font-normal text-muted">
        <span aria-hidden="true" className="text-accent">{'{'}</span>
        {readings.map((r, i) => (
          <Fragment key={i}>
            {i > 0 ? <span aria-hidden="true" className="px-0.5 text-accent">|</span> : null}
            <span data-brace-reading="">
              {/* a reading that leaves the words out has no word to tap: a tap on its 'left out' opens the unit's sheet, as its siglum does (mw-9ji6ek0.36) */}
              <span
                data-brace-text=""
                {...(language === 'greek' && r.text ? GREEK_LANG : { lang: 'en' })}
                {...(r.text ? {} : { onClick: open })}
                className={r.text && !r.same ? (language === 'greek' ? 'font-greek text-fg' : `text-fg ${variantEnglishClass(shown.unit)}`) : `italic${r.text ? '' : ' cursor-pointer'}`}
              >
                {r.same || !r.text ? (r.same ? SAME : LEFT_OUT) : (language === 'english' ? braceTokens(r, weaveWord) : r.text.split(/\s+/).filter(Boolean).map((text) => ({ text, greek: undefined }))).map(({ text, greek }, k, all) =>
                  HAS_LETTER.test(text) ? (
                    greek ? (
                      <Tap key={k} glued={k === all.length - 1} data-brace-word="" data-brace-greek="" data-learning={weaveWord?.(greek) === 'learning' ? '' : undefined} {...GREEK_LANG} className={`font-greek text-accent ${TAP_PAD}`} onTap={() => onWord?.(greek.t, r, shown, 'greek')} onLongPress={() => onSay?.(greek.t, 'greek')}>
                        {text}
                      </Tap>
                    ) : (
                      <Tap key={k} glued={k === all.length - 1} data-brace-word="" className={TAP_PAD} onTap={() => onWord?.(text, r, shown, language)} onLongPress={() => onSay?.(text, language)}>
                        {text}
                      </Tap>
                    )
                  ) : (
                    <Fragment key={k}>{k === all.length - 1 ? `${text}${NBSP}` : `${text} `}</Fragment>
                  ),
                )}
              </span>
              {r.same || !r.text ? NBSP : null}
              <span data-brace-tail="" className="whitespace-nowrap">
                {JOIN}
                {r.chips.map((c, k) => (
                  <Fragment key={c}>
                    {k > 0 ? JOIN : null}
                    <span
                      role="button"
                      tabIndex={0}
                      data-witness=""
                      aria-label={`Where the manuscripts differ: ${SPELLED[c]}`}
                      onClick={open}
                      onKeyDown={(e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          open();
                        }
                      }}
                      className={`inline-flex min-h-(--lp-tap) min-w-(--lp-tap) cursor-pointer items-center justify-center rounded align-middle ${NO_SELECT} active:bg-line`}
                    >
                      <span aria-hidden="true" className="rounded border border-accent/60 px-1 text-[0.75em] font-semibold leading-tight text-accent">
                        {c}
                      </span>
                    </span>
                  </Fragment>
                ))}
                {i === readings.length - 1 ? (
                  <span aria-hidden="true" data-brace-close="" className="text-accent">
                    {JOIN}
                    {'}'}
                  </span>
                ) : null}
              </span>
            </span>
          </Fragment>
        ))}
      </span>{' '}
    </>
  );
}
