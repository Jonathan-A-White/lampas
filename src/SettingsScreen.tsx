// src/SettingsScreen.tsx — what he can set, so the reader's front screen stays clear: the Theme and Text size, the layout (verse by verse | paragraph), the section headings, the weave, the voices that read
// English and Greek aloud, how fast each is read, and how Greek is pronounced. Each choice is saved in the settings store (src/data/repositories)
// and told to the bus (src/events/bus.ts); the Study resources (src/resources/) are switched on here; Words and About open from here too.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { TEXT_SIZES } from './appearance/textSizes';
import { THEMES, type Theme } from './appearance/themes';
import {
  getGoal,
  getGrammarApproach,
  getGreekPronunciation,
  getLayout,
  getSectionHeadings,
  getSpeechRates,
  getTextSize,
  getTheme,
  getStudyResources,
  getVoice,
  getWeave,
  getWeaveGrammar,
  setResourceOn,
  setResourceOption,
  type ReadingLayout,
  type SectionHeadings,
  type VoiceLanguage,
  type Weave,
  type WeaveGrammar,
} from './data/repositories';
import { AskApproachSheet } from './AskApproachSheet';
import { APPROACHES, approachOf, nextLessonOf, type GrammarApproach } from './approaches';
import { listLevels } from './data/repositories/grammarLevels';
import { BOOK_INDEX } from './data/bookIndex';
import { goalText, goalTitle, parseGoal, type Goal } from './data/goal';
import { LAYOUTS } from './layout/layouts';
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { PHONE_VOICE, writeSetting } from './settings/registry';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { speaksLanguage, useVoices, voiceKey } from './speech/greek';
import { DEFAULT_RATE, LANGUAGES, RATE_MAX, RATE_MIN, RATE_STEP } from './speech/languages';
import { SearchableList } from './ui/SearchableList';
import { RESOURCES, tickedOf, type ResourceChoices, type StudyResource } from './resources';
import { storeUrl } from './resources/appStore';
import { checkApp } from './resources/openApp';
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

/** One row of the Weave: a small label at the left and three chips on one line (never wrapped), the hint beneath. `name` is the setting's label in the registry. */
function WeaveRow({ label, name, hint, current, options, settingKey }: { label: string; name: string; hint: string; current: string; options: [string, string][]; settingKey: 'weave' | 'weaveGrammar' }) {
  return (
    <div className="pb-3">
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-sm font-medium text-muted">{label}</span>
        <div role="group" aria-label={name} className="inline-flex min-w-0 flex-nowrap rounded-xl border border-line p-0.5">
          {options.map(([value, text]) => (
            <button
              key={value}
              type="button"
              aria-pressed={current === value}
              onClick={() => void writeSetting(settingKey, value)}
              className={`min-h-12 min-w-12 whitespace-nowrap rounded-lg px-3 text-base font-medium ${current === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
      <p className="pt-1 text-base text-muted">{hint}</p>
    </div>
  );
}

function WeaveChoice({ weave, grammar }: { weave: Weave; grammar: WeaveGrammar }) {
  return (
    <>
      <WeaveRow
        label="Words"
        name="Weave"
        settingKey="weave"
        current={weave}
        options={[['off', 'Off'], ['solid', 'Solid'], ['solid+learning', '+ Learning']]}
        hint="Which words stand in Greek: Solid ones, or + Learning too, with their English beneath in small grey until they turn solid."
      />
      <WeaveRow
        label="Grammar"
        name="Grammar"
        settingKey="weaveGrammar"
        current={grammar}
        options={[['any', 'Any'], ['solid', 'Solid'], ['solid+frontier', '+ Frontier']]}
        hint="Of the words that stand in Greek, keep only the forms whose grammar you have at this level: Any, Solid, or Solid and frontier."
      />
    </>
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

/** The lexicons (or other choices) of a resource, in the shared searchable list; kept as he taps (a JSON array of ids). */
function ChoiceList({ resourceId, choices, ticked }: { resourceId: string; choices: ResourceChoices; ticked: string[] }) {
  const toggle = (id: string): void => {
    const next = ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id];
    void setResourceOption(resourceId, JSON.stringify(choices.items.map((i) => i.id).filter((i) => next.includes(i))));
  };
  return <SearchableList label={choices.label} hint={choices.hint} noun="lexicon" items={choices.items} ticked={ticked} onToggle={toggle} />;
}

/** What the check of an app said when he last turned it On: still waiting for the phone, the app opened, or it is not on this phone. */
type AppCheck = 'checking' | 'found' | 'missing' | null;

/** One study resource: its switch (a 44 px row), what it adds, and the field it asks for, if any (kept as he types).
 *  Turning an app On opens it once (openApp.ts checkApp): if the page goes away the app is there and stays On; if not, the switch goes back Off
 *  and the row says so, with Install, here and not at the word sheet. */
function ResourceRow({ resource, on, typed }: { resource: StudyResource; on: boolean; typed: string }) {
  const [value, setValue] = useState(typed);
  const [check, setCheck] = useState<AppCheck>(null);
  const dropCheck = useRef<(() => void) | null>(null);
  const option = resource.option;
  useEffect(() => () => dropCheck.current?.(), []);
  const flip = (): void => {
    dropCheck.current?.();
    dropCheck.current = null;
    setCheck(null);
    void setResourceOn(resource.id, !on);
    if (on || !resource.probe) return;
    setCheck('checking');
    dropCheck.current = checkApp(resource.probe, {
      onBack: () => setCheck('found'),
      onMissing: () => {
        void setResourceOn(resource.id, false);
        setCheck('missing');
      },
    });
  };
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
          onClick={flip}
          className={`min-h-12 min-w-16 rounded-lg px-4 text-base font-medium ${on ? 'bg-accent text-accent-fg' : 'border border-line text-fg'}`}
        >
          {on ? 'On' : 'Off'}
        </button>
      </div>
      <p className="text-sm text-muted">{resource.describe}</p>
      {check === 'checking' ? (
        <p role="status" className="pt-1 text-sm text-muted">{`Looking for ${resource.name} on this phone…`}</p>
      ) : null}
      {check === 'found' ? (
        <p role="status" className="pt-1 text-base font-medium">{`${resource.name} found`}</p>
      ) : null}
      {check === 'missing' ? (
        <div role="status" className="pt-1">
          <p className="text-base font-medium">{`${resource.name} isn't on this phone`}</p>
          <a
            href={storeUrl(resource.name)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex min-h-12 items-center justify-center rounded-xl bg-accent px-4 text-base font-medium text-accent-fg"
          >
            {`Install ${resource.name}`}
          </a>
        </div>
      ) : null}
      {on && resource.choices ? <ChoiceList resourceId={resource.id} choices={resource.choices} ticked={tickedOf(resource, typed)} /> : null}
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

const PICKER = 'mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg disabled:opacity-50';
const NO_BOOK = 'Choose a book';
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

/** A select with a label above it; the options are [value, text] pairs. */
function GoalPicker({ label, value, options, disabled, onChange }: { label: string; value: string; options: [string, string][]; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="block text-base font-medium">{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={PICKER}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The reading goal: Book, then Chapter, then Verse, each narrower than the one before; every change is written as the whole goal. */
function GoalPickers({ saved }: { saved: string }) {
  const goal: Goal | undefined = parseGoal(saved, BOOK_INDEX);
  const info = goal && BOOK_INDEX.books.find((b) => b.code === goal.book);
  const write = (next: Goal | undefined) => void writeSetting('goal', next ? goalText(next) : '');
  return (
    <div role="group" aria-label="Goal">
      <p data-testid="goal-now" className="text-base font-medium">
        {goal ? goalTitle(goal, BOOK_INDEX) : 'Goal: none'}
      </p>
      <GoalPicker
        label="Book"
        value={goal?.book ?? ''}
        options={[['', NO_BOOK], ...BOOK_INDEX.books.map((b): [string, string] => [b.code, b.name])]}
        onChange={(code) => write(code === '' ? undefined : { book: code })}
      />
      <GoalPicker
        label="Chapter"
        value={String(goal?.chapter ?? '')}
        disabled={!info}
        options={[['', 'Whole book'], ...range(info?.chapters ?? 0).map((n): [string, string] => [String(n), String(n)])]}
        onChange={(n) => goal && write(n === '' ? { book: goal.book } : { book: goal.book, chapter: Number(n) })}
      />
      <GoalPicker
        label="Verse"
        value={String(goal?.verse ?? '')}
        disabled={!info || goal?.chapter === undefined}
        options={[['', 'Whole chapter'], ...range(info && goal?.chapter ? (info.verses[goal.chapter - 1] ?? 0) : 0).map((n): [string, string] => [String(n), String(n)])]}
        onChange={(n) => goal?.chapter !== undefined && write(n === '' ? { book: goal.book, chapter: goal.chapter } : { ...goal, verse: Number(n) })}
      />
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={!goal}
          onClick={() => write(undefined)}
          className="min-h-12 min-w-16 rounded-lg border border-line px-4 text-base font-medium text-fg disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => navigate('placement')}
          className="min-h-12 min-w-16 rounded-lg bg-accent px-4 text-base font-medium text-accent-fg"
        >
          Place me
        </button>
      </div>
    </div>
  );
}

/** The credit line, with the source's name a link when the approach has its address. */
function CreditLine({ approach }: { approach: GrammarApproach }) {
  const credit = approach.credit;
  if (!credit) return null;
  const at = credit.line.indexOf(credit.name);
  return (
    <p data-approach-credit className="pt-3 text-base">
      {at < 0 ? (
        credit.line
      ) : (
        <>
          {credit.line.slice(0, at)}
          <a href={credit.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">
            {credit.name}
          </a>
          {credit.line.slice(at + credit.name.length)}
        </>
      )}
    </p>
  );
}

/** The grammar approach: a choice of the approaches, then the chosen one's credit line, its method and its lessons, with the lesson
 * that holds the earliest idea he has no level for marked Next. Choosing writes only the approach: his levels are not touched. */
function ApproachPicker({ chosen, levels }: { chosen: string; levels: ReadonlyMap<string, { level: 'solid' | 'frontier' | 'notYet' }> }) {
  const approach = approachOf(chosen) ?? APPROACHES[0];
  const next = nextLessonOf(approach, (id) => levels.get(id)?.level);
  return (
    <div>
      <div role="radiogroup" aria-label="Grammar approach" className="space-y-2">
        {APPROACHES.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={approach.id === a.id}
            onClick={() => void writeSetting('grammarApproach', a.id)}
            className={`block min-h-12 w-full rounded-xl border px-4 py-2 text-left text-base font-medium ${approach.id === a.id ? 'border-accent bg-accent/15' : 'border-line'}`}
          >
            {a.name}
          </button>
        ))}
      </div>
      <CreditLine approach={approach} />
      <p data-approach-method className="pt-3 text-base">
        {approach.method}
      </p>
      <div data-approach-lessons className="pt-3">
        {approach.stages.map((stage) => (
          <div key={stage.title}>
            <h3 className="pt-3 text-base font-semibold">{stage.title}</h3>
            {stage.levels.map((level) => (
              <div key={level.title}>
                <h4 className="pt-2 text-base font-medium text-muted">{level.title}</h4>
                <ol className="list-inside list-decimal text-base">
                  {level.lessons.map((lesson) => (
                    <li key={lesson.title} className={lesson === next?.lesson ? 'font-medium' : undefined}>
                      <span data-lesson-title>{lesson.title}</span>
                      {lesson === next?.lesson ? (
                        <span data-next className="ml-2 rounded-md bg-accent px-2 text-sm text-accent-fg">
                          Next
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The last control of Settings > Grammar approach: it opens the sheet that asks the factory for another approach. */
function AskApproach() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 block min-h-12 w-full rounded-xl border border-line px-4 py-2 text-left text-base font-medium"
      >
        Ask for another approach
      </button>
      {open ? <AskApproachSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function LinkRow({ label, to }: { label: string; to: 'words' | 'review' | 'about' }) {
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
  const weaveGrammar = useLiveQuery(getWeaveGrammar, []);
  const layout = useLiveQuery(getLayout, []);
  const headings = useLiveQuery(getSectionHeadings, []);
  const english = useLiveQuery(() => getVoice('english'), []);
  const greek = useLiveQuery(() => getVoice('greek'), []);
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  const resources = useLiveQuery(getStudyResources, []);
  const goal = useLiveQuery(getGoal, []);
  const approach = useLiveQuery(getGrammarApproach, []);
  const levels = useLiveQuery(listLevels, []);
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
          <Section title="Weave" hint="In the English view, show the Greek of your words in place of their English.">
            {weave && weaveGrammar ? <WeaveChoice weave={weave} grammar={weaveGrammar} /> : null}
          </Section>
          <Section title="Goal" hint="The passage you are working toward: a whole book, one chapter or a single verse.">
            {goal !== undefined ? <GoalPickers saved={goal} /> : null}
          </Section>
          <Section title="Grammar approach" hint="The order grammar is taught and tested in.">
            {approach !== undefined && levels !== undefined ? <ApproachPicker chosen={approach} levels={levels} /> : null}
            <AskApproach />
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
            <LinkRow label="Review" to="review" />
            <LinkRow label="About" to="about" />
          </Section>
        </div>
      </main>
    </>
  );
}
