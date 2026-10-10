import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getLogosBible, getStudyResources, setResourceOn, setResourceOption } from '../../data/repositories';
import { resourceOf, tickedOf, type ResourceChoices, type StudyResource } from '../../resources';
import { storeUrl } from '../../resources/appStore';
import { COMMON_BIBLES, DEFAULT_LOGOS_BIBLE, isResourceId } from '../../resources/logosBible';
import { SearchableList } from '../../ui/SearchableList';
import { writeSetting } from '../registry';
import type { SettingsRow } from '../rows';
import { PICKER, SettingRow } from './SettingRow';
import type { Control } from './types';

/** The lexicons (or other choices) of a resource, in the shared searchable list; kept as he taps (a JSON array of ids). */
function ChoiceList({ resourceId, choices, ticked }: { resourceId: string; choices: ResourceChoices; ticked: string[] }) {
  const toggle = (id: string): void => {
    const next = ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id];
    void setResourceOption(resourceId, JSON.stringify(choices.items.map((i) => i.id).filter((i) => next.includes(i))));
  };
  return <SearchableList label={choices.label} hint={choices.hint} noun="lexicon" items={choices.items} ticked={ticked} onToggle={toggle} />;
}

/** One study resource: its switch (a 44 px row), what it adds, and the field it asks for, if any (kept as he types).
 *  A web page cannot see which native apps a phone has, so turning an app On only turns it On: nothing is opened or checked, and it stays On.
 *  While an app is On its row says "Don't have <App>?" with Get <App> (appStore.ts storeUrl), so a missing app is never a dead end.
 *  Only an On resource shows more than its row (mw-5r3p30.106): that line, its choices and its field. The typed field is kept in the store while hidden. */
function ResourceRow({ row, resource, on, typed }: { row: SettingsRow; resource: StudyResource; on: boolean; typed: string }) {
  const [value, setValue] = useState(typed);
  const option = resource.option;
  const flip = (): void => {
    void setResourceOn(resource.id, !on);
  };
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
