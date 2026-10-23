import { useLiveQuery } from 'dexie-react-hooks';
import { DEVOTIONALS, RANDOM, devotionalOf, tickedDevotionals } from '../../data/daily/devotionals';
import { openLibrary } from '../../nav/route';
import { oneTap } from '../../ui/settle';
import { SearchableList } from '../../ui/SearchableList';
import { dailyDevotionalSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalDrawSetting, devotionalSetting, todaysDevotionalSetting, ANOTHER } from '../definitions';
import { settingOf, writeSetting } from '../registry';
import { useSetting } from '../store';
import { OnOff, RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

const ITEMS = DEVOTIONALS.map((d) => ({ id: d.id, name: d.title }));

/** One On | Off switch of Settings > Daily: a piece of Today, or its Tick boxes. */
function dailySwitch(def: typeof dailyReviewSetting, settingKey: 'dailyReview' | 'dailyPlan' | 'dailyPsalms' | 'dailyDevotional' | 'dailyTicks'): Control {
  return function DailySwitch({ row }) {
    const current = useSetting(def);
    return (
      <SettingRow row={row}>
        <RowName row={row} />
        {current ? <OnOff name={row.label} current={current} settingKey={settingKey} /> : null}
      </SettingRow>
    );
  };
}

export const DailyReviewControl = dailySwitch(dailyReviewSetting, 'dailyReview');
export const DailyPlanControl = dailySwitch(dailyPlanSetting, 'dailyPlan');
export const DailyPsalmsControl = dailySwitch(dailyPsalmsSetting, 'dailyPsalms');
export const DailyDevotionalControl = dailySwitch(dailyDevotionalSetting, 'dailyDevotional');
export const DailyTicksControl = dailySwitch(dailyTicksSetting, 'dailyTicks');

/** Which devotional: Random, or one of the devotionals that are On in Your Logos library (the shelf, mw-rfjjzd.5), in the shared searchable list as a choice of one. The one chosen now is always
 *  listed, though it has been turned Off in the library since, so the picker never hides what Today shows. */
export const DevotionalControl: Control = ({ row }) => {
  const devotional = useSetting(devotionalSetting);
  const draw = useSetting(devotionalDrawSetting);
  if (devotional === undefined || draw === undefined) return null;
  const on = tickedDevotionals(draw);
  const ids = [...on, ...(devotional !== RANDOM && !on.includes(devotional) ? [devotional] : [])];
  const items = [{ id: RANDOM, name: 'Random' }, ...ITEMS.filter((i) => ids.includes(i.id))];
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

/** In the draw: the devotionals Random may show are the ones that are On in Your Logos library, so this says how many and opens the Library's Devotionals page, where they are turned On and Off
 *  (shown only while Random is chosen). */
export const DevotionalDrawControl: Control = ({ row }) => {
  const draw = useSetting(devotionalDrawSetting);
  if (draw === undefined) return null;
  const n = tickedDevotionals(draw).length;
  return (
    <SettingRow row={row}>
      <div role="group" aria-label={row.label}>
        <span className="block text-base font-medium">{row.label}</span>
        <p className="pb-1 text-base">
          {n === 0 ? 'No devotional is on, so Random shows Morning and Evening.' : `${n} ${n === 1 ? 'devotional is' : 'devotionals are'} in the draw: the ones that are on in Your Logos library.`}
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
  if (id === undefined) return null;
  return (
    <SettingRow row={row}>
      <div role="group" aria-label={row.label}>
        <span className="block text-base font-medium">{row.label}</span>
        <span className="block pb-1 text-base text-muted">{devotionalOf(id)?.title ?? id}</span>
        <button
          type="button"
          aria-label="Another devotional for today"
          onClick={() => oneTap('todays-devotional-another', () => void writeSetting(todaysDevotionalSetting.key, ANOTHER))}
          className="flex min-h-12 items-center rounded-lg bg-surface px-3 text-base font-medium text-accent active:bg-line"
        >
          Another
        </button>
      </div>
    </SettingRow>
  );
};
