// src/SettingsScreen.tsx — what he can set, so the reader's front screen stays clear: the Theme and Text size, the layout (verse by verse | paragraph), the section headings, the weave, the voices that read
// English and Greek aloud, how fast each is read, and how Greek is pronounced. Each choice is saved in the settings store (src/data/repositories)
// and told to the bus (src/events/bus.ts); the Study resources (src/resources/) are switched on here; Words and About open from here too.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { TEXT_SIZES } from './appearance/textSizes';
import { THEMES, type Theme } from './appearance/themes';
import {
  getGreekPronunciation,
  getLayout,
  getSectionHeadings,
  getSpeechRates,
  getTextSize,
  getTheme,
  getStudyResources,
  getVoice,
  getWeave,
  setResourceOn,
  setResourceOption,
  type ReadingLayout,
  type SectionHeadings,
  type VoiceLanguage,
  type Weave,
} from './data/repositories';
import { LAYOUTS } from './layout/layouts';
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { PHONE_VOICE, writeSetting } from './settings/registry';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { speaksLanguage, useVoices, voiceKey } from './speech/greek';
import { DEFAULT_RATE, LANGUAGES, RATE_MAX, RATE_MIN, RATE_STEP } from './speech/languages';
import { RESOURCES, type StudyResource } from './resources';
import { PRONUNCIATIONS, pronunciationOf, type GreekPronunciation } from './speech/pronunciation';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint ? <p className="pb-2 text-base text-muted">{hint}</p> : null}
      {children}
    </section>
  );
}

function ThemeChoice({ theme }: { theme: Theme }) {
  return (
    <div role="group" aria-label="Theme" className="inline-flex flex-wrap rounded-xl border border-line p-0.5">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={theme === t.id}
          onClick={() => void writeSetting('theme', t.id)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${theme === t.id ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TextSizeChoice({ percent }: { percent: number }) {
  return (
    <div role="group" aria-label="Text size" className="inline-flex flex-wrap rounded-xl border border-line p-0.5">
      {TEXT_SIZES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={percent === t.percent}
          onClick={() => void writeSetting('textSize', t.id)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${percent === t.percent ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function WeaveChoice({ weave }: { weave: Weave }) {
  const choice = (value: Weave, label: string) => (
    <button
      type="button"
      aria-pressed={weave === value}
      onClick={() => void writeSetting('weave', value)}
      className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${weave === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Weave" className="inline-flex rounded-xl border border-line p-0.5">
      {choice('off', 'Off')}
      {choice('solid', 'Solid words')}
    </div>
  );
}

function LayoutChoice({ layout }: { layout: ReadingLayout }) {
  return (
    <div role="group" aria-label="Layout" className="inline-flex flex-wrap rounded-xl border border-line p-0.5">
      {LAYOUTS.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={layout === l.id}
          onClick={() => void writeSetting('layout', l.id)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${layout === l.id ? 'bg-accent text-accent-fg' : 'text-fg'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function HeadingsChoice({ headings }: { headings: SectionHeadings }) {
  const choice = (value: SectionHeadings, label: string) => (
    <button
      type="button"
      aria-pressed={headings === value}
      onClick={() => void writeSetting('sectionHeadings', value)}
      className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${headings === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Section headings" className="inline-flex rounded-xl border border-line p-0.5">
      {choice('on', 'On')}
      {choice('off', 'Off')}
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

/** One study resource: its switch (a 44 px row), what it adds, and the field it asks for, if any (kept as he types). */
function ResourceRow({ resource, on, typed }: { resource: StudyResource; on: boolean; typed: string }) {
  const [value, setValue] = useState(typed);
  const option = resource.option;
  return (
    <div className="border-b border-line py-2 last:border-b-0">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <span id={`resource-${resource.id}`} className="text-base font-medium">
          {resource.name}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={resource.name}
          onClick={() => void setResourceOn(resource.id, !on)}
          className={`min-h-12 min-w-16 rounded-lg px-4 text-base font-medium ${on ? 'bg-accent text-accent-fg' : 'border border-line text-fg'}`}
        >
          {on ? 'On' : 'Off'}
        </button>
      </div>
      <p className="text-sm text-muted">{resource.describe}</p>
      {option ? (
        <div className="mt-2">
          <label className="block">
            <span className="block text-base font-medium">{option.label}</span>
            <input
              type="text"
              value={value}
              placeholder={option.default}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby={`resource-${resource.id}-hint`}
              onChange={(e) => {
                setValue(e.target.value);
                void setResourceOption(resource.id, e.target.value);
              }}
              className="mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
            />
          </label>
          <p id={`resource-${resource.id}-hint`} className="pt-1 text-sm text-muted">
            {option.hint}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function LinkRow({ label, to }: { label: string; to: 'words' | 'about' }) {
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex min-h-12 w-full items-center justify-between border-b border-line text-left text-base font-medium"
    >
      {label}
      <span aria-hidden="true" className="text-muted">
        ›
      </span>
    </button>
  );
}

export function SettingsScreen() {
  const scrollRef = useScrollMemory('settings');
  const theme = useLiveQuery(getTheme, []);
  const textSize = useLiveQuery(getTextSize, []);
  const rates = useLiveQuery(getSpeechRates, []);
  const weave = useLiveQuery(getWeave, []);
  const layout = useLiveQuery(getLayout, []);
  const headings = useLiveQuery(getSectionHeadings, []);
  const english = useLiveQuery(() => getVoice('english'), []);
  const greek = useLiveQuery(() => getVoice('greek'), []);
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  const resources = useLiveQuery(getStudyResources, []);
  return (
    <>
      <ScreenHeader title="Settings" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div>
          <Section title="Appearance" hint="Phone follows the phone's own light or dark setting. Normal text is the size your phone uses.">
            <h3 className="pb-1 text-base font-medium">Theme</h3>
            {theme ? <ThemeChoice theme={theme} /> : null}
            <h3 className="pb-1 pt-3 text-base font-medium">Text size</h3>
            {textSize !== undefined ? <TextSizeChoice percent={textSize} /> : null}
          </Section>
          <Section title="Layout" hint="Verse by verse is one verse per line. Paragraph runs the verses of a paragraph together, with small verse numbers.">
            {layout ? <LayoutChoice layout={layout} /> : null}
          </Section>
          <Section title="Section headings" hint="Show the Bible's headings (such as Walking by the Spirit) above their verses.">
            {headings ? <HeadingsChoice headings={headings} /> : null}
          </Section>
          <Section title="Weave" hint="In the English view, show the Greek of your solid words in place of their English.">
            {weave ? <WeaveChoice weave={weave} /> : null}
          </Section>
          <Section title="Reading voices" hint="Which of this phone's voices reads aloud. Phone default lets the phone choose.">
            {english !== undefined && greek !== undefined ? (
              <>
                <VoicePicker language="english" label="English voice" lang="en" saved={english} />
                <VoicePicker language="greek" label="Greek voice" lang={pronunciationOf(pronunciation).lang} saved={greek} />
              </>
            ) : null}
          </Section>
          <Section title="Reading speed" hint="How fast each language is read aloud, on its own: 1.0 is normal.">
            {rates ? LANGUAGES.map((l) => <SpeedSlider key={l.id} language={l.id} label={`${l.label} speed`} saved={rates[l.id]} />) : null}
          </Section>
          <Section title="Greek pronunciation" hint="How Greek is read aloud.">
            {pronunciation ? <PronunciationList chosen={pronunciation} /> : null}
          </Section>
          <section aria-label="Study resources" className="border-b border-line py-4">
            <h2 className="text-lg font-semibold">Study resources</h2>
            <p className="pb-2 text-base text-muted">
              Links from a word to the tools you own. Only links are added; no lexicon text is kept in Lampas. All start off.
            </p>
            {resources
              ? RESOURCES.map((r) => <ResourceRow key={r.id} resource={r} on={resources.on.includes(r.id)} typed={resources.options[r.id] ?? ''} />)
              : null}
          </section>
          <Section title="More">
            <LinkRow label="Words" to="words" />
            <LinkRow label="About" to="about" />
          </Section>
        </div>
      </main>
    </>
  );
}
