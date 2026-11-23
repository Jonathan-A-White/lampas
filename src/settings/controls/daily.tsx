import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState, type ReactNode } from 'react';
import { ALL_TICKED, RANDOM, canDrawAnother, devotionalOf, pickableDevotionals, tickedDevotionals } from '../../data/daily/devotionals';
import { useDrawSources } from '../devotionalSources';
import { NotWatchHistory, importMessage, importWatchHistory } from '../../data/daily/youtubeHistory';
import { rephilUnheard } from '../../data/daily/dailyStore';
import { ownedResources } from '../../data/repositories';
import { openLibrary } from '../../nav/route';
import { oneTap } from '../../ui/settle';
import { SearchableList } from '../../ui/SearchableList';
import { dailyDevotionalSetting, dailyMemorizeSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalDrawSetting, devotionalLogosSetting, devotionalRephilSetting, devotionalSetting, morningRephilBackupSetting, morningRephilOrderSetting, todaysDevotionalSetting, ANOTHER } from '../definitions/daily';
import { settingOf, writeSetting } from '../registry';
import { useSetting } from '../store';
import { ChipRow, OnOff, RowName, SettingRow } from './SettingRow';
import { draws, type Control } from './types';

/** One On | Off switch of Settings > Daily: a piece of Today, or its Tick boxes. */
function dailySwitch(def: typeof dailyReviewSetting | typeof devotionalLogosSetting | typeof devotionalRephilSetting, settingKey: 'dailyReview' | 'dailyMemorize' | 'dailyPlan' | 'dailyPsalms' | 'dailyDevotional' | 'devotionalLogos' | 'devotionalRephil' | 'dailyTicks', more?: (current: 'on' | 'off') => ReactNode): Control {
  return function DailySwitch({ row }) {
    const current = useSetting(def);
    return (
      <SettingRow row={row}>
        <RowName row={row} />
        {current ? <OnOff name={row.label} current={current} settingKey={settingKey} /> : null}
        {current && more ? more(current) : null}
      </SettingRow>
    );
  };
}

export const DailyReviewControl = dailySwitch(dailyReviewSetting, 'dailyReview');
export const DailyMemorizeControl = dailySwitch(dailyMemorizeSetting, 'dailyMemorize');
export const DailyPlanControl = dailySwitch(dailyPlanSetting, 'dailyPlan');
export const DailyPsalmsControl = dailySwitch(dailyPsalmsSetting, 'dailyPsalms');
export const DailyDevotionalControl = dailySwitch(dailyDevotionalSetting, 'dailyDevotional');
/** Devotional sources (mw-r9xo1pj.4): 'Logos devotionals' On/Off, with how many of Your Logos library are in the draw; Brookfield First On/Off, naming Morning RePhil. */
function LogosDevotionalsCount({ current }: { current: 'on' | 'off' }) {
  const draw = useSetting(devotionalDrawSetting);
  if (draw === undefined) return null;
  const n = tickedDevotionals(draw).length;
  return (
    <p className="pt-1 text-base">
      {current === 'off' ? `${n} ${n === 1 ? 'devotional is' : 'devotionals are'} in Your Logos library, but none is listed or drawn.` : `${n} ${n === 1 ? 'devotional' : 'devotionals'}, the ones that are on in Your Logos library.`}
    </p>
  );
}

export const DevotionalLogosControl = dailySwitch(devotionalLogosSetting, 'devotionalLogos', (current) => <LogosDevotionalsCount current={current} />);
export const DevotionalRephilControl = dailySwitch(devotionalRephilSetting, 'devotionalRephil');
export const DailyTicksControl = dailySwitch(dailyTicksSetting, 'dailyTicks');

/** Which devotional: Random, or one of the devotionals that are On in Your Logos library (the shelf, mw-rfjjzd.5), in the shared searchable list as a choice of one. The one chosen now is always
 *  listed, though it has been turned Off in the library since, so the picker never hides what Today shows. */
export const DevotionalControl: Control = ({ row }) => {
  const devotional = useSetting(devotionalSetting);
  const draw = useSetting(devotionalDrawSetting);
  const owned = useLiveQuery(ownedResources, []);
  const sources = useDrawSources();
  if (devotional === undefined || draw === undefined || owned === undefined || sources === undefined) return null;
  // with Logos Off, or 'Logos devotionals' Off, a Logos book opens nothing: the list is what is chosen now and Morning RePhil while Brookfield First is On (mw-r9xo1pj.2, mw-r9xo1pj.4)
  const items = [...(sources.logos || devotional === RANDOM ? [{ id: RANDOM, name: 'Random' }] : []), ...pickableDevotionals(tickedDevotionals(draw), devotional, owned, sources).map((d) => ({ id: d.id, name: d.title }))];
  return (
    <SettingRow row={row}>
      <SearchableList
        label={row.label}
        noun="devotional"
        items={items}
        status={devotional === RANDOM ? 'Random: a different one each day' : (devotionalOf(devotional)?.title ?? devotional)}
        rankOf={(id) => (id === devotional ? 0 : id === RANDOM ? 1 : 2)}
        row={(item) => (
          <button
            type="button"
            role="radio"
            aria-checked={item.id === devotional}
            onClick={() => oneTap(`devotional:${item.id}`, () => void writeSetting(devotionalSetting.key, item.id))}
            className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-base"
          >
            <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line ${item.id === devotional ? 'bg-accent text-accent-fg' : ''}`}>
              {item.id === devotional ? '✓' : ''}
            </span>
            <span className="title-wrap min-w-0 flex-1">{item.name}</span>
          </button>
        )}
      />
    </SettingRow>
  );
};

/** Import YouTube history (mw-r9xo1pj.3; drawn below the order's help, with a status line while the file is read and a plain word when no episode matched, mw-r9xo1pj.16): he chooses the watch-history.json from Google Takeout and the Morning RePhil episodes in it are marked Seen. The file is read here on the phone; nothing of it is kept or sent. */
function ImportYoutubeHistory() {
  const input = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState<{ text: string; problem: boolean } | undefined>();
  const pick = async (file: File | undefined): Promise<void> => {
    if (input.current) input.current.value = '';
    if (!file) return;
    setSaid({ text: 'Reading the file...', problem: false });
    try {
      const text = await file.text();
      // a frame for the status line to be drawn before a big file is parsed, which holds the page
      await new Promise<void>((done) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(done, 0)) : setTimeout(done, 0)));
      setSaid({ text: importMessage(await importWatchHistory(text)), problem: false });
    } catch (error) {
      setSaid({ text: error instanceof NotWatchHistory ? error.message : 'This file could not be read.', problem: true });
    }
  };
  return (
    <div className="pt-3">
      <p className="pb-1 text-base text-muted">
        Mark the episodes you watched on YouTube as seen: in Google Takeout export YouTube and YouTube Music history as JSON, then choose its watch-history.json. It is read on this phone; nothing is kept or sent.
      </p>
      <button
        type="button"
        onClick={() => oneTap('rephil-import-history', () => input.current?.click())}
        className="flex min-h-12 items-center rounded-lg bg-surface px-3 text-base font-medium text-accent active:bg-line"
      >
        Import YouTube history
      </button>
      <input ref={input} type="file" accept=".json,application/json" aria-label="YouTube watch history file" tabIndex={-1} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
      {said ? (
        <p role="status" className={`pt-2 text-base ${said.problem ? 'text-accent' : ''}`}>
          {said.text}
        </p>
      ) : null}
    </div>
  );
}

/** Morning RePhil order: which episode is next, the oldest one he has not heard or the newest (shown while Which devotional is Random or Morning RePhil and Logos is On: with Logos Off Today shows no backup, mw-r9xo1pj.11). */
export const MorningRephilOrderControl: Control = ({ row }) => {
  const order = useSetting(morningRephilOrderSetting);
  return (
    <SettingRow row={row} details={<ImportYoutubeHistory />}>
      <RowName row={row} />
      {order ? (
        <ChipRow
          name={row.label}
          current={order}
          options={[
            ['oldest', 'Oldest first'],
            ['newest', 'Newest first'],
          ]}
          settingKey="morningRephilOrder"
        />
      ) : null}
    </SettingRow>
  );
};

/** When all Morning RePhil are seen: the Logos devotional Today shows then (shown while Which devotional is Random or Morning RePhil and Logos is On: with Logos Off Today shows no backup, mw-r9xo1pj.11). The ones on his shelf, and the one chosen now, in the shared searchable list. */
export const MorningRephilBackupControl: Control = ({ row }) => {
  const backup = useSetting(morningRephilBackupSetting);
  const owned = useLiveQuery(ownedResources, []);
  if (backup === undefined || owned === undefined) return null;
  const items = pickableDevotionals(tickedDevotionals(ALL_TICKED), backup, owned)
    .filter((d) => d.kind === undefined)
    .map((d) => ({ id: d.id, name: d.title }));
  return (
    <SettingRow row={row}>
      <SearchableList
        label={row.label}
        noun="devotional"
        items={items}
        status={devotionalOf(backup)?.title ?? backup}
        rankOf={(id) => (id === backup ? 0 : 1)}
        row={(item) => (
          <button
            type="button"
            role="radio"
            aria-checked={item.id === backup}
            onClick={() => oneTap(`rephil-backup:${item.id}`, () => void writeSetting(morningRephilBackupSetting.key, item.id))}
            className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-base"
          >
            <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line ${item.id === backup ? 'bg-accent text-accent-fg' : ''}`}>
              {item.id === backup ? '✓' : ''}
            </span>
            <span className="title-wrap min-w-0 flex-1">{item.name}</span>
          </button>
        )}
      />
    </SettingRow>
  );
};

/** In the draw: the devotionals Random may show are the ones that are On in Your Logos library, so this says how many and opens the Library's Devotionals page, where they are turned On and Off
 *  (shown only while Random is chosen). */
export const DevotionalDrawControl: Control = ({ row }) => {
  const draw = useSetting(devotionalDrawSetting);
  const sources = useDrawSources();
  if (draw === undefined || sources === undefined) return null;
  const n = tickedDevotionals(draw).length;
  return (
    <SettingRow row={row}>
      <div role="group" aria-label={row.label}>
        <span className="block text-base font-medium">{row.label}</span>
        <p className="pb-1 text-base">
          {n === 0 ? 'No devotional is on, so Random shows Morning and Evening.' : `${n} ${n === 1 ? 'devotional is' : 'devotionals are'} in the draw: the ones that are on in Your Logos library.`}
          {sources.rephil ? ' Morning RePhil is also in it while you have an episode left to hear.' : ' Morning RePhil is not in it: Brookfield First is Off.'}
        </p>
        <button
          type="button"
          onClick={() => openLibrary({ kind: 'devotional' })}
          className="flex min-h-12 items-center rounded-lg border border-line px-4 text-base font-medium text-accent"
        >
          Choose them in Your Logos library
        </button>
      </div>
    </SettingRow>
  );
};

/** Today's devotional: the one Today shows now and Another, which draws a different one for today and leaves Which devotional on Random (the row shows only while it is Random). */
export const TodaysDevotionalControl: Control = ({ row }) => {
  const id = useLiveQuery(async () => String(await settingOf(todaysDevotionalSetting.key)?.read()), []);
  const draw = useSetting(devotionalDrawSetting);
  const sources = useDrawSources();
  const rephil = useLiveQuery(rephilUnheard, []);
  if (id === undefined || draw === undefined || sources === undefined || rephil === undefined) return null;
  const another = canDrawAnother(id, tickedDevotionals(draw), rephil, sources);
  return (
    <SettingRow row={row}>
      <div role="group" aria-label={row.label}>
        <span className="block text-base font-medium">{row.label}</span>
        <span className="block pb-1 text-base text-muted">{devotionalOf(id)?.title ?? id}</span>
        {another ? (
          <button
            type="button"
            aria-label="Another devotional for today"
            onClick={() => oneTap('todays-devotional-another', () => void writeSetting(todaysDevotionalSetting.key, ANOTHER))}
            className="flex min-h-12 items-center rounded-lg bg-surface px-3 text-base font-medium text-accent active:bg-line"
          >
            Another
          </button>
        ) : null}
      </div>
    </SettingRow>
  );
};

/** The rows each control above draws (src/settings/controls/index.ts gathers them by glob): a new control names its rows here and no list is edited. */
export const dailyReviewControlDraws = draws(DailyReviewControl, 'dailyReview');
export const dailyMemorizeControlDraws = draws(DailyMemorizeControl, 'dailyMemorize');
export const dailyPlanControlDraws = draws(DailyPlanControl, 'dailyPlan');
export const dailyPsalmsControlDraws = draws(DailyPsalmsControl, 'dailyPsalms');
export const dailyDevotionalControlDraws = draws(DailyDevotionalControl, 'dailyDevotional');
export const devotionalControlDraws = draws(DevotionalControl, 'devotional');
export const devotionalDrawControlDraws = draws(DevotionalDrawControl, 'devotionalDraw');
export const devotionalLogosControlDraws = draws(DevotionalLogosControl, 'devotionalLogos');
export const devotionalRephilControlDraws = draws(DevotionalRephilControl, 'devotionalRephil');
export const morningRephilOrderControlDraws = draws(MorningRephilOrderControl, 'morningRephilOrder');
export const morningRephilBackupControlDraws = draws(MorningRephilBackupControl, 'morningRephilBackup');
export const todaysDevotionalControlDraws = draws(TodaysDevotionalControl, 'todaysDevotional');
export const dailyTicksControlDraws = draws(DailyTicksControl, 'dailyTicks');
