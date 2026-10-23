import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getLogosBible, getStudyResources, setResourceOn, setResourceOption } from '../../data/repositories';
import { countsOf } from '../../library/kinds';
import { useShelf } from '../../library/useShelf';
import { openLibrary } from '../../nav/route';
import { StartPlan } from '../../plan/StartPlan';
import { resourceOf, type StudyResource } from '../../resources';
import { storeUrl } from '../../resources/appStore';
import { AUDIO_BIBLES } from '../../resources/audioBible';
import { KINDS, entryOf } from '../../resources/catalogue';
import { oneTap } from '../../ui/settle';
import { audioBibleSetting, readingPlanSetting } from '../definitions';
import { writeSetting } from '../registry';
import type { SettingsRow } from '../rows';
import { useSetting } from '../store';
import { ON_COLOUR, OnOff, RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

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

export const ResourceControl: Control = ({ row }) => {
  const resources = useLiveQuery(getStudyResources, []);
  const resource = resourceOf(row.key.slice('resource.'.length));
  return resources && resource ? <ResourceRow row={row} resource={resource} on={resources.on.includes(resource.id)} typed={resources.options[resource.id] ?? ''} /> : null;
};

/** Your Logos library (mw-rfjjzd.5): how many books of his shelf are on, and a door to the Library (#/library) where they are chosen. */
export const LibraryControl: Control = ({ row }) => {
  const states = useShelf();
  const on = states === undefined ? undefined : KINDS.reduce((sum, kind) => sum + countsOf(kind, states).on, 0);
  return (
    <SettingRow row={row} className="border-b border-line py-2">
      {on !== undefined ? (
        <button
          type="button"
          onClick={() => openLibrary()}
          className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-base font-medium"
        >
          <span className="title-wrap min-w-0 flex-1">{`${row.label} · ${on} ${on === 1 ? 'book' : 'books'} on`}</span>
          <span aria-hidden="true" className="shrink-0 text-muted">
            ›
          </span>
        </button>
      ) : null}
    </SettingRow>
  );
};

/** Bible in Logos: the Bible an Old Testament chapter opens in, named on a row that opens Library > Bibles, where he chooses it (or types the Resource ID of one the catalogue lacks). */
export const LogosBibleControl: Control = ({ row }) => {
  const logosBible = useLiveQuery(getLogosBible, []);
  return (
    <SettingRow row={row}>
      {logosBible !== undefined ? (
        <div role="group" aria-label={row.label}>
          <button
            type="button"
            onClick={() => openLibrary({ kind: 'bible' })}
            className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-base font-medium"
          >
            <span className="title-wrap min-w-0 flex-1">{`${row.label}: ${entryOf(logosBible)?.short ?? logosBible}`}</span>
            <span aria-hidden="true" className="shrink-0 text-muted">
              ›
            </span>
          </button>
        </div>
      ) : null}
    </SettingRow>
  );
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
