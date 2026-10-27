import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { getGreekPronunciation, getReadSpan, getSpeechRates, getVoice, type PlayTo, type VoiceLanguage } from '../../data/repositories';
import { hasVoice, noVoiceHelp, speaksLanguage, testGreekVoice, useSpeakingKey, useVoices, voiceInUse, voiceKey, VOICE_TEST_KEY, warmVoices } from '../../speech/greek';
import { DEFAULT_RATE, LANGUAGES, RATE_MAX, RATE_MIN, RATE_STEP, type SettableLanguage } from '../../speech/languages';
import { ACCENTS } from '../../speech/accents';
import { pronunciationOf, pronunciationsOf, type GreekPronunciation, type PronunciationLanguage } from '../../speech/pronunciation';
import { PLAY_TOS } from '../../speech/readSpan';
import { englishAccentSetting, hebrewPronunciationSetting, ipaCourseSetting, pronunciationSeparateSetting, pronunciationSetting } from '../definitions';
import { PRONUNCIATION_FAMILIES } from '../definitions/pronunciation';
import { PHONE_VOICE, writeSetting } from '../registry';
import { getSetting, useSetting } from '../store';
import { OnOff, RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

function ReadSpanChoice({ span }: { span: PlayTo }) {
  return (
    <div role="group" aria-label="Play to" className="inline-flex rounded-xl border border-line p-0.5">
      {PLAY_TOS.map((s) => (
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

/** Under the Greek voice picker (mw-5r3p30.357): the name of the voice the Greek is said in now (the one he picked, or the phone's own pick) and Test, which
 * says πατήρ then ἀγάπη in it, as Tap to hear says a word, so he hears whether the stress falls where the respelling puts it; a second tap stops it. */
function GreekVoiceInUse({ saved }: { saved: string | null }) {
  const listed = useVoices();
  const speaking = useSpeakingKey() === VOICE_TEST_KEY;
  const [help, setHelp] = useState<string | null>(null);
  useEffect(() => void warmVoices(), []);
  const voice = voiceInUse(listed, 'greek', saved);
  const none = listed.length > 0 && !voice;
  const test = () => setHelp(testGreekVoice() === 'no-voice' ? noVoiceHelp() : null);
  return (
    <div data-testid="greek-voice-in-use" className="mt-2">
      <p role="status" className="text-base">
        {voice ? (
          <>
            In use: <span className="font-medium">{voice.name}</span>
          </>
        ) : none || hasVoice('greek') === false ? (
          noVoiceHelp()
        ) : (
          'In use: the phone’s own Greek voice'
        )}
      </p>
      {none ? null : (
        <button
          type="button"
          onClick={test}
          aria-label={speaking ? 'Stop the test' : 'Test the Greek voice'}
          className="mt-2 min-h-12 min-w-24 rounded-xl border border-line px-4 text-base font-medium text-fg"
        >
          {speaking ? 'Stop' : 'Test'}
        </button>
      )}
      {help ? <p className="mt-1 text-sm text-muted">{help}</p> : null}
    </div>
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

/** A list of radio buttons, a label and a note each: the schemes of a language, or the families. */
function ChoiceList({ name, settingKey, chosen, items }: { name: string; settingKey: string; chosen: string; items: readonly { id: string; label: string; note: string }[] }) {
  return (
    <div role="radiogroup" aria-label={name} className="space-y-2">
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={chosen === p.id}
          aria-labelledby={`${settingKey}-${p.id}`}
          aria-describedby={`${settingKey}-${p.id}-note`}
          onClick={() => void writeSetting(settingKey, p.id)}
          className={`block min-h-12 w-full rounded-xl border px-4 py-2 text-left ${chosen === p.id ? 'border-accent bg-accent/15' : 'border-line'}`}
        >
          <span id={`${settingKey}-${p.id}`} className="block text-base font-medium">
            {p.label}
          </span>
          <span id={`${settingKey}-${p.id}-note`} className="block text-sm text-muted">
            {p.note}
          </span>
        </button>
      ))}
    </div>
  );
}

function PronunciationList({ language, name, chosen }: { language: PronunciationLanguage; name: string; chosen: GreekPronunciation }) {
  return <ChoiceList name={name} settingKey={language === 'he' ? 'hebrewPronunciation' : 'greekPronunciation'} chosen={chosen} items={pronunciationsOf(language)} />;
}

export const ReadSpanControl: Control = ({ row }) => {
  const readSpan = useLiveQuery(getReadSpan, []);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {readSpan ? <ReadSpanChoice span={readSpan} /> : null}
    </SettingRow>
  );
};

/** The language a voice or speed row is for, from its key ('hebrewVoice', 'greekRate'): the entry of LANGUAGES whose id starts it. */
const languageOfRow = (key: string): SettableLanguage => (LANGUAGES.find((l) => key.startsWith(l.id)) ?? LANGUAGES[0]).id;

export const VoiceControl: Control = ({ row }) => {
  const language = languageOfRow(row.key);
  const saved = useLiveQuery(() => getVoice(language), [language]);
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  // Greek's voices are those of the chosen scheme's language tag; the others' are their language's own
  const lang = language === 'greek' ? pronunciationOf(pronunciation).lang : (LANGUAGES.find((l) => l.id === language)?.lang ?? 'en');
  return (
    <SettingRow row={row}>
      {saved !== undefined ? <VoicePicker language={language} label={row.label} lang={lang} saved={saved} /> : null}
      {saved !== undefined && language === 'greek' ? <GreekVoiceInUse saved={saved} /> : null}
    </SettingRow>
  );
};

export const SpeedControl: Control = ({ row }) => {
  const language = languageOfRow(row.key);
  const rates = useLiveQuery(getSpeechRates, []);
  return <SettingRow row={row}>{rates ? <SpeedSlider language={language} label={row.label} saved={rates[language]} /> : null}</SettingRow>;
};

/** The Greek and the Hebrew pronunciation rows: a list of the schemes of the row's language. */
export const PronunciationControl: Control = ({ row }) => {
  const language: PronunciationLanguage = row.key === 'hebrewPronunciation' ? 'he' : 'grc';
  const chosen = useLiveQuery(() => (language === 'he' ? getSetting(hebrewPronunciationSetting) : getGreekPronunciation()), [language]);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {chosen ? <PronunciationList language={language} name={row.label} chosen={chosen} /> : null}
    </SettingRow>
  );
};

/** Pronunciation, the family that sets Greek and Hebrew together (mw-gdcyf98.6). */
export const FamilyControl: Control = ({ row }) => {
  const chosen = useSetting(pronunciationSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {chosen ? <ChoiceList name={row.label} settingKey="pronunciation" chosen={chosen} items={PRONUNCIATION_FAMILIES} /> : null}
    </SettingRow>
  );
};

/** Set each language on its own: On shows the Greek and the Hebrew row, Off the family. */
export const PronunciationSeparateControl: Control = ({ row }) => {
  const current = useSetting(pronunciationSeparateSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {current ? <OnOff name={row.label} current={current} settingKey="pronunciationSeparate" /> : null}
    </SettingRow>
  );
};

/** IPA lesson: whether the Goal screen offers the optional lesson on the IPA sounds, for Greek and for Hebrew (mw-gdcyf98.24). */
export const IpaLessonControl: Control = ({ row }) => {
  const current = useSetting(ipaCourseSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {current ? <OnOff name={row.label} current={current} settingKey="ipaLesson" /> : null}
    </SettingRow>
  );
};

/** The accent the sound hints are said in: one 48 px button a line, so the longest name fits any width, upright or sideways. */
export const EnglishAccentControl: Control = ({ row }) => {
  const accent = useSetting(englishAccentSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
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
