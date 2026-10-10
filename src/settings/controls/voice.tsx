import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getGreekPronunciation, getReadSpan, getSpeechRates, getVoice, type ReadSpan, type VoiceLanguage } from '../../data/repositories';
import { speaksLanguage, useVoices, voiceKey } from '../../speech/greek';
import { DEFAULT_RATE, RATE_MAX, RATE_MIN, RATE_STEP } from '../../speech/languages';
import { PRONUNCIATIONS, pronunciationOf, type GreekPronunciation } from '../../speech/pronunciation';
import { READ_SPANS } from '../../speech/readSpan';
import { PHONE_VOICE, writeSetting } from '../registry';
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
 * it is dragged, so the thumb does not wait on the settings store. */
function SpeedSlider({ language, label, saved }: { language: VoiceLanguage; label: string; saved: number }) {
  const [value, setValue] = useState(saved);
  const change = async (next: number) => {
    setValue(next);
    await writeSetting(`${language}Rate`, next);
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
        onChange={(e) => void change(Number(e.target.value))}
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
