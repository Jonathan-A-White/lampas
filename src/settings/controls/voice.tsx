import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { getGreekPronunciation, getReadSpan, getSpeechRates, getVoice, type ReadSpan, type VoiceLanguage } from '../../data/repositories';
import { speaksLanguage, useVoices, voiceKey } from '../../speech/greek';
import { DEFAULT_RATE, RATE_MAX, RATE_MIN, RATE_STEP } from '../../speech/languages';
import { ACCENTS } from '../../speech/accents';
import { PRONUNCIATIONS, pronunciationOf, type GreekPronunciation } from '../../speech/pronunciation';
import { READ_SPANS } from '../../speech/readSpan';
import { englishAccentSetting } from '../definitions';
import { PHONE_VOICE, writeSetting } from '../registry';
import { useSetting } from '../store';
import { SettingRow } from './SettingRow';
import type { Control } from './types';

function ReadSpanChoice({ span }: { span: ReadSpan }) {
  return (
    <div role="group" aria-label="Read aloud span" className="inline-flex rounded-xl border border-line p-0.5">
      {READ_SPANS.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={span === s.id}
          onClick={() => void writeSetting('readSpan', s.id)}
          className={`min-h-12 min-w-12 rounded-lg px-3 text-base font-medium ${span === s.id ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

const PHONE_DEFAULT = 'Phone default';

/** A picker of the phone's voices for one language, with the phone's own pick first. */
function VoicePicker({ language, label, lang, saved }: { language: VoiceLanguage; label: string; lang: string; saved: string | null }) {
  const voices = useVoices().filter((v) => speaksLanguage(v, lang));
  // A saved voice the phone no longer lists reads as the phone's default (it is what speak() falls back to).
  const shown = saved && voices.some((v) => voiceKey(v) === saved) ? saved : '';
  const change = (value: string) => writeSetting(`${language}Voice`, value === '' ? PHONE_VOICE : value);
  return (
    <label className="mt-3 block">
      <span className="block text-base font-medium">{label}</span>
      <select
        value={shown}
        onChange={(e) => void change(e.target.value)}
        className="mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
      >
        <option value="">{PHONE_DEFAULT}</option>
        {voices.map((v) => (
          <option key={voiceKey(v)} value={voiceKey(v)}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** How fast one language is read aloud: a slider from slower to faster, 1 in the middle. It keeps its own value while
 * it is dragged, so the thumb does not wait on the settings store.
 *
 * A touch moves a range input's thumb the moment the finger goes down, before the phone knows the touch is a scroll: a thumb that
 * scrolled Settings from the slider's right end saved 1.5 (mw-5r3p30.146). So while a pointer is on the slider the value is only
 * shown; it is saved when the finger lifts, and a touch that turns into a scroll (pointercancel) puts the speed back as it was. A key
 * press, with no pointer down, saves at once. */
function SpeedSlider({ language, label, saved }: { language: VoiceLanguage; label: string; saved: number }) {
  const [value, setValue] = useState(saved);
  // the speed when the pointer went down, and what the slider shows now: null while no pointer is down
  const touch = useRef<{ before: number; now: number } | null>(null);
  const keep = async (next: number) => {
    setValue(next);
    await writeSetting(`${language}Rate`, next);
  };
  const change = (next: number) => {
    if (touch.current) {
      touch.current.now = next;
      setValue(next);
    } else void keep(next);
  };
  const lift = () => {
    const held = touch.current;
    touch.current = null;
    if (held && held.now !== held.before) void keep(held.now);
  };
  const cancel = () => {
    const held = touch.current;
    touch.current = null;
    if (held) setValue(held.before);
  };
  return (
    <label className="mt-3 block">
      <span className="flex items-baseline justify-between text-base font-medium">
        {label}
        <span aria-hidden="true" className="text-muted">
          {value.toFixed(1)}×{value === DEFAULT_RATE ? ' normal' : ''}
        </span>
      </span>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={`${value.toFixed(1)} times normal`}
        min={RATE_MIN}
        max={RATE_MAX}
        step={RATE_STEP}
        value={value}
        onPointerDown={() => {
          touch.current = { before: value, now: value };
        }}
        onPointerUp={lift}
        onPointerCancel={cancel}
        onBlur={lift}
        onKeyDown={() => {
          touch.current = null;
        }}
        onChange={(e) => change(Number(e.target.value))}
        className="mt-1 block min-h-12 w-full accent-accent"
      />
    </label>
  );
}

function PronunciationList({ chosen }: { chosen: GreekPronunciation }) {
  return (
    <div role="radiogroup" aria-label="Greek pronunciation" className="space-y-2">
      {PRONUNCIATIONS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={chosen === p.id}
          aria-labelledby={`pron-${p.id}`}
          aria-describedby={`pron-${p.id}-note`}
          onClick={() => void writeSetting('greekPronunciation', p.id)}
          className={`block min-h-12 w-full rounded-xl border px-4 py-2 text-left ${chosen === p.id ? 'border-accent bg-accent/15' : 'border-line'}`}
        >
          <span id={`pron-${p.id}`} className="block text-base font-medium">
            {p.label}
          </span>
          <span id={`pron-${p.id}-note`} className="block text-sm text-muted">
            {p.note}
          </span>
        </button>
      ))}
    </div>
  );
}

export const ReadSpanControl: Control = ({ row }) => {
  const readSpan = useLiveQuery(getReadSpan, []);
  return <SettingRow row={row}>{readSpan ? <ReadSpanChoice span={readSpan} /> : null}</SettingRow>;
};

export const VoiceControl: Control = ({ row }) => {
  const language = row.key === 'englishVoice' ? 'english' : 'greek';
  const saved = useLiveQuery(() => getVoice(language), [language]);
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  return (
    <SettingRow row={row}>
      {saved !== undefined ? <VoicePicker language={language} label={row.label} lang={language === 'english' ? 'en' : pronunciationOf(pronunciation).lang} saved={saved} /> : null}
    </SettingRow>
  );
};

export const SpeedControl: Control = ({ row }) => {
  const language = row.key === 'englishRate' ? 'english' : 'greek';
  const rates = useLiveQuery(getSpeechRates, []);
  return <SettingRow row={row}>{rates ? <SpeedSlider language={language} label={row.label} saved={rates[language]} /> : null}</SettingRow>;
};

export const PronunciationControl: Control = ({ row }) => {
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  return <SettingRow row={row}>{pronunciation ? <PronunciationList chosen={pronunciation} /> : null}</SettingRow>;
};

/** The accent the sound hints are said in: one 48 px button a line, so the longest name fits any width, upright or sideways. */
export const EnglishAccentControl: Control = ({ row }) => {
  const accent = useSetting(englishAccentSetting);
  return (
    <SettingRow row={row}>
      {accent ? (
        <div role="group" aria-label={row.label} className="flex flex-col gap-1 rounded-xl border border-line p-0.5">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={accent === a.id}
              onClick={() => void writeSetting('englishAccent', a.id)}
              className={`min-h-12 rounded-lg px-4 text-left text-base font-medium ${accent === a.id ? 'bg-accent text-accent-fg' : 'text-fg'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </SettingRow>
  );
};
