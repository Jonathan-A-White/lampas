import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getGrammarBooks, getLogosBible, getStudyResources, setGrammarBooks, setResourceOn, setResourceOption } from '../../data/repositories';
import { StartPlan } from '../../plan/StartPlan';
import { resourceOf, tickedOf, type ResourceChoices, type StudyResource } from '../../resources';
import { storeUrl } from '../../resources/appStore';
import { AUDIO_BIBLES } from '../../resources/audioBible';
import { GRAMMAR_BOOKS } from '../../resources/grammarBooks';
import { logos } from '../../resources/logos';
import { COMMON_BIBLES, DEFAULT_LOGOS_BIBLE, isResourceId } from '../../resources/logosBible';
import { oneTap } from '../../ui/settle';
import { SearchableList } from '../../ui/SearchableList';
import { audioBibleSetting, readingPlanSetting } from '../definitions';
import { AskForBook } from './askBook';
import { writeSetting } from '../registry';
import type { SettingsRow } from '../rows';
import { useSetting } from '../store';
import { ON_COLOUR, OnOff, PICKER, RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

/** The lexicons (or other choices) of a resource, in the shared searchable list; kept as he taps (a JSON array of ids). */
function ChoiceList({ resourceId, choices, ticked }: { resourceId: string; choices: ResourceChoices; ticked: string[] }) {
  const toggle = (id: string): void => {
    const next = ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id];
    void setResourceOption(resourceId, JSON.stringify(choices.items.map((i) => i.id).filter((i) => next.includes(i))));
  };
  return <SearchableList label={choices.label} hint={choices.hint} noun="lexicon" items={choices.items} ticked={ticked} onToggle={toggle} />;
}

/** Fewer books than this are a plain list of ticks; a longer list is the searchable one (pwa-best-practices 08: a long list is a widget). */
const LONG_LIST = 8;

/** Logos > Grammar books (mw-5r3p30.381): a tick per book of GRAMMAR_BOOKS, the books that start ticked until he changes them. A ticked book's sections
 *  show under Read more on the idea sheet of each idea it teaches. Kept as he taps. */
function GrammarBooks() {
  const ticked = useLiveQuery(getGrammarBooks, []);
  if (!ticked) return null;
  const toggle = (id: string): void => {
    const next = ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id];
    void setGrammarBooks(GRAMMAR_BOOKS.map((b) => b.id).filter((b) => next.includes(b)));
  };
  const hint = 'Tick the grammar books of your Logos library. An idea sheet links the part of each that teaches the idea.';
  if (GRAMMAR_BOOKS.length >= LONG_LIST) {
    return (
      <>
        <SearchableList label="Grammar books" hint={hint} noun="book" items={GRAMMAR_BOOKS} ticked={ticked} onToggle={toggle} />
        <AskForBook />
      </>
    );
  }
  return (
    <>
      <div role="group" aria-label="Grammar books" aria-describedby="grammar-books-hint" className="mt-3">
        <p className="text-base font-medium">Grammar books</p>
        <p id="grammar-books-hint" className="pb-1 text-sm text-muted">
          {hint}
        </p>
        <div className="rounded-lg border border-line">
          {GRAMMAR_BOOKS.map((book) => {
            const on = ticked.includes(book.id);
            return (
              <button
                key={book.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => oneTap(`grammar-books:${book.id}`, () => toggle(book.id))}
                className="flex min-h-12 w-full items-center gap-3 border-t border-line px-3 text-left text-base first:border-t-0"
              >
                <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line ${on ? 'bg-accent text-accent-fg' : ''}`}>
                  {on ? '✓' : ''}
                </span>
                {book.name}
              </button>
            );
          })}
        </div>
      </div>
      <AskForBook />
    </>
  );
}

/** One study resource: its switch (a 44 px row), what it adds, and the field it asks for, if any (kept as he types).
 *  A web page cannot see which native apps a phone has, so turning an app On only turns it On: nothing is opened or checked, and it stays On.
 *  While an app is On its row says "Don't have <App>?" with Get <App> (appStore.ts storeUrl), so a missing app is never a dead end.
 *  Only an On resource shows more than its row (mw-5r3p30.106): that line, its choices and its field. The typed field is kept in the store while hidden. */
function ResourceRow({ row, resource, on, typed }: { row: SettingsRow; resource: StudyResource; on: boolean; typed: string }) {
  const [value, setValue] = useState(typed);
  const option = resource.option;
  const flip = (): void => oneTap(`resource-switch:${resource.id}`, () => void setResourceOn(resource.id, !on));
  return (
    <SettingRow
      row={row}
      className="border-b border-line py-2 last:border-b-0"
      details={
        on ? (
          <>
            {resource.kind === 'app' ? (
              <div className="flex min-h-12 items-center justify-between gap-3 pt-1">
                <p className="text-base text-muted">{`Don't have ${resource.name}?`}</p>
                <a
                  href={storeUrl(resource.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center rounded-lg border border-line px-4 text-base font-medium text-accent"
                >
                  {`Get ${resource.name}`}
                </a>
              </div>
            ) : null}
            {resource.choices ? <ChoiceList resourceId={resource.id} choices={resource.choices} ticked={tickedOf(resource, typed)} /> : null}
            {resource.id === logos.id ? <GrammarBooks /> : null}
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

export const ResourceControl: Control = ({ row }) => {
  const resources = useLiveQuery(getStudyResources, []);
  const resource = resourceOf(row.key.slice('resource.'.length));
  return resources && resource ? <ResourceRow row={row} resource={resource} on={resources.on.includes(resource.id)} typed={resources.options[resource.id] ?? ''} /> : null;
};

export const LogosBibleControl: Control = ({ row }) => {
  const logosBible = useLiveQuery(getLogosBible, []);
  return <SettingRow row={row}>{logosBible !== undefined ? <LogosBiblePicker saved={logosBible} /> : null}</SettingRow>;
};

/** Audio Bible: Off, or an audio Bible the Verse view links to. Stacked, full-width choices: the names are long. */
export const AudioBibleControl: Control = ({ row }) => {
  const audioBible = useSetting(audioBibleSetting);
  const choices = [{ value: 'off', label: 'Off' }, ...AUDIO_BIBLES.map((b) => ({ value: b.id, label: b.choice }))];
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {audioBible !== undefined ? (
        <div role="group" aria-label={row.label} className="flex flex-col gap-1 rounded-xl border border-line p-0.5">
          {choices.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={audioBible === c.value}
              onClick={() => void writeSetting(audioBibleSetting.key, c.value)}
              className={`min-h-12 rounded-lg px-4 text-left text-base font-medium ${audioBible === c.value ? ON_COLOUR : 'text-fg'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
    </SettingRow>
  );
};

/** Reading plan: On | Off (src/data/repositories/readingPlan.ts startPlan turns it On), and Start a listening plan, the same sheet as Today's 'Start a plan' (src/plan/StartPlan.tsx). */
export const ReadingPlanControl: Control = ({ row }) => {
  const readingPlan = useSetting(readingPlanSetting);
  const [starting, setStarting] = useState(false);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {readingPlan ? (
        <>
          <OnOff name={row.label} current={readingPlan} settingKey="readingPlan" />
          <button type="button" onClick={() => setStarting(true)} className="mt-2 block min-h-12 rounded-lg border border-line px-4 text-base font-medium text-accent">
            Start a listening plan
          </button>
        </>
      ) : null}
      {starting ? <StartPlan onClose={() => setStarting(false)} /> : null}
    </SettingRow>
  );
};
