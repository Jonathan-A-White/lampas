// src/reader/VariantBrace.tsx — the brace after a variant unit's words (mw-9ji6ek0.5): '{the Lord NA ECM}', the other reading(s) of the unit, each once with the small chip
// of every witness that reads it (src/reader/variants.ts braceReadings), in the Greek of the reading or its English as VerseText says. It is a button: a tap opens the
// unit's sheet (mw-9ji6ek0.6). It is an inline span like a word (VerseText's Tap), so it wraps with the line and its 44 px tap height costs the line nothing.
import { Fragment, type KeyboardEvent } from 'react';
import type { VariantUnit } from '../data/chapter';
import { GREEK_LANG } from '../script/greekLang';
import { NO_SELECT } from '../ui/longPress';
import { braceReadings, type ShownUnit, type WitnessChip } from './variants';

/** Each chip spelled out, for a screen reader. */
const SPELLED: Record<WitnessChip, string> = { B: 'Byzantine split', NA: 'Nestle-Aland', ECM: 'ECM' };
const LEFT_OUT = 'left out';
const SAME = 'same';

export function VariantBrace({ shown, language, onOpen }: {
  shown: ShownUnit;
  /** the language of the readings: the Greek view's and a woven unit's Greek, else English */
  language: 'greek' | 'english';
  onOpen?: (unit: VariantUnit) => void;
}) {
  const readings = braceReadings(shown, language);
  const label = `Other reading${readings.length > 1 ? 's' : ''}: ${readings
    .map((r) => `${r.same ? 'the same in English' : r.text || LEFT_OUT} (${r.chips.map((c) => SPELLED[c]).join(', ')})`)
    .join('; ')}`;
  const open = () => onOpen?.(shown.unit);
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        data-brace=""
        data-brace-lang={language}
        aria-label={label}
        onClick={open}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        className={`cursor-pointer ${NO_SELECT} rounded py-[calc((var(--lp-tap)-1em)/2)] font-sans text-[0.85em] font-normal text-muted no-underline active:bg-line`}
      >
        <span aria-hidden="true" className="text-accent">{'{'}</span>
        {readings.map((r, i) => (
          <Fragment key={i}>
            {i > 0 ? <span aria-hidden="true" className="px-0.5 text-accent">|</span> : null}
            <span data-brace-reading="">
              <span data-brace-text="" {...(language === 'greek' && r.text ? GREEK_LANG : { lang: 'en' })} className={r.text && !r.same ? (language === 'greek' ? 'font-greek text-fg' : 'text-fg') : 'italic'}>
                {r.same ? SAME : r.text || LEFT_OUT}
              </span>
              {r.chips.map((c) => (
                <span key={c} data-witness="" className="ms-1 inline-block rounded border border-accent/60 px-1 align-[0.1em] text-[0.75em] font-semibold leading-tight text-accent">
                  {c}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
        <span aria-hidden="true" className="text-accent">{'}'}</span>
      </span>{' '}
    </>
  );
}
