// src/SettingsScreen.tsx — what he can set, so the reader's front screen stays clear: the Theme and Text size, the layout (verse by verse | paragraph), the section headings, the weave, the voices that read
// English and Greek aloud, how fast each is read, and how Greek is pronounced. Each choice is saved in the settings store (src/data/repositories)
// and told to the bus (src/events/bus.ts); the Study resources (src/resources/) are switched on here; Words and About open from here too.
// The rows are not written here: src/settings/rows.ts lists every row (name, hint, help, section, what it depends on) and this file draws
// them, section by section, each with the control CONTROLS names for its key. The search field at the top filters that list (visibleRows),
// and a row that depends on a setting that is off is not drawn.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { TEXT_SIZES } from './appearance/textSizes';
import { THEMES, type Theme } from './appearance/themes';
import {
  getGoal,
  getLogosBible,
  getGrammarApproach,
  getGreekPronunciation,
  getLayout,
  getSectionHeadings,
  getReadSpan,
  getReadTutor,
  getDeveloper,
  setDeveloper,
  getScriptDepth,
  getTips,
  getSpeechRates,
  getTextSize,
  getTheme,
  getStudyResources,
  getVoice,
  getWeave,
  getWeaveGrammar,
  getGrammarMove,
  getNewWordsADay,
  getPickerGrammar,
  setResourceOn,
  setResourceOption,
  type ReadingLayout,
  type ReadSpan,
  type VoiceLanguage,
} from './data/repositories';
import { AskApproachSheet } from './AskApproachSheet';
import { APPROACHES, approachOf, nextLessonOf, type GrammarApproach } from './approaches';
import { listLevels } from './data/repositories/grammarLevels';
import { BOOK_INDEX } from './data/bookIndex';
import { goalText, goalTitle, parseGoal, type Goal } from './data/goal';
import { paceNote } from './data/pace';
import { LAYOUTS } from './layout/layouts';
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { usePace } from './usePace';
import { PHONE_VOICE, writeSetting } from './settings/registry';
import { ROWS, SECTIONS, readValues, visibleRows, type SettingsRow } from './settings/rows';
import { settingsForTutor } from './settings/tutorSettings';
import { useReportScreen } from './tutor/screenContext';
import { ScriptText } from './script/ScriptText';
import { DEPTHS, SCRIPTS, type Depth, type TutorScript } from './script/scripts';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { speaksLanguage, useVoices, voiceKey } from './speech/greek';
import { DEFAULT_RATE, RATE_MAX, RATE_MIN, RATE_STEP } from './speech/languages';
import { SearchableList } from './ui/SearchableList';
import { tickedOf, type ResourceChoices, type StudyResource } from './resources';
import { COMMON_BIBLES, DEFAULT_LOGOS_BIBLE, isResourceId } from './resources/logosBible';
import { checkApp } from './resources/openApp';
import { PRONUNCIATIONS, pronunciationOf, type GreekPronunciation } from './speech/pronunciation';
import { resourceOf } from './resources';
import { READ_SPANS } from './speech/readSpan';

function Section({ title, hint, labelled, children }: { title: string; hint?: string; labelled?: boolean; children: ReactNode }) {
  return (
    <section aria-label={labelled ? title : undefined} className="border-b border-line py-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint ? <p className="pb-2 text-base text-muted">{hint}</p> : null}
      {children}
    </section>
  );
}

/** The row's longer help, behind a small 'More help' that sits on the hint's line (its tap area reaches 44 px without costing height). */
function MoreHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="relative ml-2 text-base font-medium text-accent underline before:absolute before:-inset-x-2 before:-inset-y-3"
      >
        {open ? 'Less help' : 'More help'}
      </button>
      {open ? (
        <span id={id} className="mt-1 block text-base text-muted">
          {text}
        </span>
      ) : null}
    </>
  );
}

/** One row of Settings: its control, then the registry's one-line hint (and its help, on request), then any `details` of the control. */
function SettingRow({ row, children, details, className = 'pb-3' }: { row: SettingsRow; children: ReactNode; details?: ReactNode; className?: string }) {
  return (
    <div data-setting={row.key} className={className}>
      {children}
      <p className="pt-1 text-base text-muted">
        {row.hint}
        {row.help ? <MoreHelp text={row.help} /> : null}
      </p>
      {details}
    </div>
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

/** The three chips of a weave or New words row, on one line (never wrapped); `name` is the setting's label in the registry. */
function ChipRow({ name, current, options, settingKey }: { name: string; current: string; options: [string, string][]; settingKey: 'weave' | 'weaveGrammar' | 'pickerGrammar' | 'grammarMove' | 'newWordsADay' }) {
  return (
    <div role="group" aria-label={name} className="inline-flex max-w-full min-w-0 flex-nowrap rounded-xl border border-line p-0.5">
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
  );
}

/** The Weave's rows: a small label at the left and three chips on one line. */
function WeaveControl({ row }: { row: SettingsRow }) {
  const grammar = row.key === 'weaveGrammar';
  const current = useLiveQuery(grammar ? getWeaveGrammar : getWeave, [grammar]);
  const options: [string, string][] = grammar
    ? [['any', 'Any'], ['solid', 'Solid'], ['solid+frontier', '+ Frontier']]
    : [['off', 'Off'], ['solid', 'Solid'], ['solid+learning', '+ Learning']];
  return (
    <SettingRow row={row}>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-sm font-medium text-muted">{grammar ? 'Grammar' : 'Words'}</span>
        {current ? <ChipRow name={row.label} current={current} options={options} settingKey={grammar ? 'weaveGrammar' : 'weave'} /> : null}
      </div>
    </SettingRow>
  );
}

const NEW_WORDS = {
  newWordsADay: { read: getNewWordsADay, options: [['0', 'Off'], ['3', '3'], ['5', '5'], ['10', '10']] },
  pickerGrammar: { read: getPickerGrammar, options: [['solid', 'Solid grammar'], ['frontier', 'Frontier grammar']] },
  grammarMove: { read: getGrammarMove, options: [['ask', 'Ask'], ['auto', 'Auto'], ['off', 'Off']] },
} satisfies Record<string, { read: () => Promise<string | number>; options: [string, string][] }>;

/** What the pace did to New words a day, under its chips. */
function PaceNote() {
  const pace = usePace();
  const note = pace ? paceNote(pace.reason) : null;
  return note ? (
    <p data-testid="pace-note" className="pt-1 text-base font-medium">
      {note}
    </p>
  ) : null;
}

/** New words a day, New words at and Move it: the setting's label above, its chips on one line. */
function NewWordsControl({ row }: { row: SettingsRow }) {
  const key = row.key as keyof typeof NEW_WORDS;
  const { read, options } = NEW_WORDS[key];
  const current = useLiveQuery(async () => String(await read()), [key]);
  return (
    <SettingRow row={row}>
      <h3 className="pb-1 text-base font-medium">{row.label}</h3>
      {current !== undefined ? <ChipRow name={row.label} current={current} options={options} settingKey={key} /> : null}
      {key === 'newWordsADay' ? <PaceNote /> : null}
    </SettingRow>
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

/** The lexicons (or other choices) of a resource, in the shared searchable list; kept as he taps (a JSON array of ids). */
function ChoiceList({ resourceId, choices, ticked }: { resourceId: string; choices: ResourceChoices; ticked: string[] }) {
  const toggle = (id: string): void => {
    const next = ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id];
    void setResourceOption(resourceId, JSON.stringify(choices.items.map((i) => i.id).filter((i) => next.includes(i))));
  };
  return <SearchableList label={choices.label} hint={choices.hint} noun="lexicon" items={choices.items} ticked={ticked} onToggle={toggle} />;
}

/** What the check of an app said when he last turned it On: still waiting for the phone, or the app opened. An app that is not there turns the switch back Off, and a switch that is Off shows nothing of the app. */
type AppCheck = 'checking' | 'found' | null;

/** One study resource: its switch (a 44 px row), what it adds, and the field it asks for, if any (kept as he types).
 *  Turning an app On opens it once (openApp.ts checkApp): if the page goes away the app is there and stays On; if not, the switch goes back Off.
 *  Only an On resource shows more than its row (mw-5r3p30.106): the check's line, its choices and its field. The typed field is kept in the store while hidden. */
function ResourceRow({ row, resource, on, typed }: { row: SettingsRow; resource: StudyResource; on: boolean; typed: string }) {
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
        setCheck(null);
      },
    });
  };
  return (
    <SettingRow
      row={row}
      className="border-b border-line py-2 last:border-b-0"
      details={
        on ? (
          <>
            {check === 'checking' ? (
              <p role="status" className="pt-1 text-sm text-muted">{`Looking for ${resource.name} on this phone…`}</p>
            ) : null}
            {check === 'found' ? (
              <p role="status" className="pt-1 text-base font-medium">{`${resource.name} found`}</p>
            ) : null}
            {resource.choices ? <ChoiceList resourceId={resource.id} choices={resource.choices} ticked={tickedOf(resource, typed)} /> : null}
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
          </>
        ) : null
      }
    >
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
    </SettingRow>
  );
}

/** Bible in Logos: the Bible an Old Testament chapter opens in, from a short list or by typing its Resource ID. A typed ID is kept as soon as it is well formed. */
function LogosBiblePicker({ saved }: { saved: string }) {
  const [typed, setTyped] = useState(saved);
  const listed = COMMON_BIBLES.some((b) => b.id === saved);
  const bad = typed.trim() !== '' && !isResourceId(typed);
  return (
    <div role="group" aria-label="Bible in Logos">
      <label className="mt-1 block">
        <span className="block text-base font-medium">Bible</span>
        <select
          value={listed ? saved : ''}
          onChange={(e) => {
            if (e.target.value === '') return;
            setTyped(e.target.value);
            void writeSetting('logosBible', e.target.value);
          }}
          className={PICKER}
        >
          {listed ? null : <option value="">Another Bible (typed below)</option>}
          {COMMON_BIBLES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block">
        <span className="block text-base font-medium">Resource ID</span>
        <input
          type="text"
          value={typed}
          aria-describedby="logos-bible-hint"
          aria-invalid={bad}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setTyped(e.target.value);
            if (isResourceId(e.target.value)) void writeSetting('logosBible', e.target.value.trim());
          }}
          className={PICKER}
        />
      </label>
      <p id="logos-bible-hint" role={bad ? 'alert' : undefined} className="pt-1 text-sm text-muted">
        {bad
          ? `That is not a Resource ID. It looks like ${DEFAULT_LOGOS_BIBLE}.`
          : 'Logos shows a book\'s Resource ID in its Information pane. Old Testament chapters open in this Bible.'}
      </p>
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
        <button
          type="button"
          disabled={!goal}
          onClick={() => navigate('goal')}
          className="min-h-12 min-w-16 rounded-lg border border-line px-4 text-base font-medium text-fg disabled:opacity-50"
        >
          Progress
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

const LINK_TO = { 'link.studyway': 'studyway', 'link.words': 'words', 'link.review': 'review', 'link.paradigms': 'paradigms', 'link.about': 'about' } as const;

function LinkControl({ row }: { row: SettingsRow }) {
  const to = LINK_TO[row.key as keyof typeof LINK_TO];
  return (
    <SettingRow row={row} className="border-b border-line pb-2">
      <button
        type="button"
        onClick={() => navigate(to)}
        className="flex min-h-12 w-full items-center justify-between text-left text-base font-medium"
      >
        {row.label}
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
      </button>
    </SettingRow>
  );
}

const ON_COLOUR = 'bg-accent text-accent-fg';

/** An On | Off choice of a talkable setting. */
function OnOff({ name, current, settingKey }: { name: string; current: 'on' | 'off'; settingKey: 'sectionHeadings' | 'tips' | 'readTutor' }) {
  return (
    <div role="group" aria-label={name} className="inline-flex rounded-xl border border-line p-0.5">
      {(['on', 'off'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === value}
          onClick={() => void writeSetting(settingKey, value)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${current === value ? ON_COLOUR : 'text-fg'}`}
        >
          {value === 'on' ? 'On' : 'Off'}
        </button>
      ))}
    </div>
  );
}

function ScriptDepthChoice({ script, depth }: { script: TutorScript; depth: Depth }) {
  return (
    <div role="group" aria-label={script.settingLabel} className="flex flex-col gap-1 rounded-xl border border-line p-0.5">
      {DEPTHS.map((d) => (
        <button
          key={d.id}
          type="button"
          aria-pressed={depth === d.id}
          onClick={() => void writeSetting(script.settingKey, d.id)}
          className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-4 text-left text-base font-medium ${depth === d.id ? ON_COLOUR : 'text-fg'}`}
        >
          <span>{d.label}</span>
          <span className="text-base font-normal opacity-80" aria-hidden="true">
            <ScriptText text={script.examples[d.id]} />
          </span>
        </button>
      ))}
    </div>
  );
}

function DeveloperChoice({ name, developer }: { name: string; developer: 'on' | 'off' }) {
  return (
    <div role="group" aria-label={name} className="inline-flex rounded-xl border border-line p-0.5">
      {(['on', 'off'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={developer === value}
          onClick={() => void setDeveloper(value)}
          className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${developer === value ? ON_COLOUR : 'text-fg'}`}
        >
          {value === 'on' ? 'On' : 'Off'}
        </button>
      ))}
    </div>
  );
}

/** A control of the registry's rows: it reads its own setting and draws it inside its SettingRow. */
type Control = (props: { row: SettingsRow }) => ReactNode;

const AppearanceControl: Control = ({ row }) => {
  const theme = useLiveQuery(getTheme, []);
  const textSize = useLiveQuery(getTextSize, []);
  const isTheme = row.key === 'theme';
  return (
    <SettingRow row={row}>
      <h3 className="pb-1 text-base font-medium">{row.label}</h3>
      {isTheme ? (theme ? <ThemeChoice theme={theme} /> : null) : textSize !== undefined ? <TextSizeChoice percent={textSize} /> : null}
    </SettingRow>
  );
};

const LayoutControl: Control = ({ row }) => {
  const layout = useLiveQuery(getLayout, []);
  return <SettingRow row={row}>{layout ? <LayoutChoice layout={layout} /> : null}</SettingRow>;
};

const HeadingsControl: Control = ({ row }) => {
  const headings = useLiveQuery(getSectionHeadings, []);
  return <SettingRow row={row}>{headings ? <OnOff name={row.label} current={headings} settingKey="sectionHeadings" /> : null}</SettingRow>;
};

const TipsControl: Control = ({ row }) => {
  const tips = useLiveQuery(getTips, []);
  return <SettingRow row={row}>{tips ? <OnOff name={row.label} current={tips} settingKey="tips" /> : null}</SettingRow>;
};

const ReadTutorControl: Control = ({ row }) => {
  const readTutor = useLiveQuery(getReadTutor, []);
  return <SettingRow row={row}>{readTutor ? <OnOff name={row.label} current={readTutor} settingKey="readTutor" /> : null}</SettingRow>;
};

const ScriptDepthControl: Control = ({ row }) => {
  const script = SCRIPTS.find((s) => s.settingKey === row.key);
  const depth = useLiveQuery(() => (script ? getScriptDepth(script) : Promise.resolve(undefined)), [script]);
  return <SettingRow row={row}>{script && depth ? <ScriptDepthChoice script={script} depth={depth} /> : null}</SettingRow>;
};

const DeveloperControl: Control = ({ row }) => {
  const developer = useLiveQuery(getDeveloper, []);
  return <SettingRow row={row}>{developer === 'on' || developer === 'off' ? <DeveloperChoice name={row.label} developer={developer} /> : null}</SettingRow>;
};

const ReadSpanControl: Control = ({ row }) => {
  const readSpan = useLiveQuery(getReadSpan, []);
  return <SettingRow row={row}>{readSpan ? <ReadSpanChoice span={readSpan} /> : null}</SettingRow>;
};

const GoalControl: Control = ({ row }) => {
  const goal = useLiveQuery(getGoal, []);
  return <SettingRow row={row}>{goal !== undefined ? <GoalPickers saved={goal} /> : null}</SettingRow>;
};

const ApproachControl: Control = ({ row }) => {
  const approach = useLiveQuery(getGrammarApproach, []);
  const levels = useLiveQuery(listLevels, []);
  return (
    <SettingRow row={row}>
      {approach !== undefined && levels !== undefined ? <ApproachPicker chosen={approach} levels={levels} /> : null}
      <AskApproach />
    </SettingRow>
  );
};

const VoiceControl: Control = ({ row }) => {
  const language = row.key === 'englishVoice' ? 'english' : 'greek';
  const saved = useLiveQuery(() => getVoice(language), [language]);
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  return (
    <SettingRow row={row}>
      {saved !== undefined ? <VoicePicker language={language} label={row.label} lang={language === 'english' ? 'en' : pronunciationOf(pronunciation).lang} saved={saved} /> : null}
    </SettingRow>
  );
};

const SpeedControl: Control = ({ row }) => {
  const language = row.key === 'englishRate' ? 'english' : 'greek';
  const rates = useLiveQuery(getSpeechRates, []);
  return <SettingRow row={row}>{rates ? <SpeedSlider language={language} label={row.label} saved={rates[language]} /> : null}</SettingRow>;
};

const PronunciationControl: Control = ({ row }) => {
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  return <SettingRow row={row}>{pronunciation ? <PronunciationList chosen={pronunciation} /> : null}</SettingRow>;
};

const ResourceControl: Control = ({ row }) => {
  const resources = useLiveQuery(getStudyResources, []);
  const resource = resourceOf(row.key.slice('resource.'.length));
  return resources && resource ? <ResourceRow row={row} resource={resource} on={resources.on.includes(resource.id)} typed={resources.options[resource.id] ?? ''} /> : null;
};

const LogosBibleControl: Control = ({ row }) => {
  const logosBible = useLiveQuery(getLogosBible, []);
  return <SettingRow row={row}>{logosBible !== undefined ? <LogosBiblePicker saved={logosBible} /> : null}</SettingRow>;
};

/** The control of each row, by the row's key (src/settings/rows.ts): a row with no control here is a test failure. */
const CONTROLS: Readonly<Record<string, Control>> = {
  theme: AppearanceControl,
  textSize: AppearanceControl,
  layout: LayoutControl,
  sectionHeadings: HeadingsControl,
  weave: WeaveControl,
  weaveGrammar: WeaveControl,
  newWordsADay: NewWordsControl,
  pickerGrammar: NewWordsControl,
  grammarMove: NewWordsControl,
  goal: GoalControl,
  grammarApproach: ApproachControl,
  readSpan: ReadSpanControl,
  englishVoice: VoiceControl,
  greekVoice: VoiceControl,
  englishRate: SpeedControl,
  greekRate: SpeedControl,
  greekPronunciation: PronunciationControl,
  logosBible: LogosBibleControl,
  tips: TipsControl,
  readTutor: ReadTutorControl,
  developer: DeveloperControl,
  ...Object.fromEntries(SCRIPTS.map((s) => [s.settingKey, ScriptDepthControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('resource.')).map((r) => [r.key, ResourceControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('link.')).map((r) => [r.key, LinkControl])),
};

/** The search field at the top: it filters the rows by name and hint as he types. */
function SettingsSearch({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  return (
    <div className="pt-3">
      <input
        type="search"
        value={query}
        placeholder="Search settings"
        aria-label="Search settings"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
      />
    </div>
  );
}

export function SettingsScreen() {
  const scrollRef = useScrollMemory('settings');
  const [query, setQuery] = useState('');
  const values = useLiveQuery(readValues, []);
  const rows = visibleRows(values ?? {}, query);
  // the tutor is told every setting, shown or not (mw-5r3p30.107): he can say what a setting that is off would give
  const forTutor = useLiveQuery(settingsForTutor, []);
  useReportScreen({ name: 'Settings', facts: [], settings: forTutor ?? [] });
  return (
    <>
      <ScreenHeader title="Settings" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div>
          <SettingsSearch query={query} onChange={setQuery} />
          {SECTIONS.map((section) => {
            const mine = rows.filter((r) => r.section === section.id);
            if (mine.length === 0) return null;
            return (
              <Section key={section.id} title={section.title} hint={section.hint} labelled={section.id === 'resources'}>
                {mine.map((row) => {
                  const Row = CONTROLS[row.key];
                  return Row ? <Row key={row.key} row={row} /> : null;
                })}
              </Section>
            );
          })}
          {rows.length === 0 && values ? (
            <p role="status" className="py-4 text-base text-muted">
              Nothing in Settings matches “{query.trim()}”.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
