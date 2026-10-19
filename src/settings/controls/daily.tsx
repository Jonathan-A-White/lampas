import { DEVOTIONALS, RANDOM, tickedDevotionals, tickedText } from '../../data/daily/devotionals';
import { SearchableList } from '../../ui/SearchableList';
import { dailyDevotionalSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalDrawSetting, devotionalSetting } from '../definitions';
import { writeSetting } from '../registry';
import { useSetting } from '../store';
import { OnOff, PICKER, RowName, SettingRow } from './SettingRow';
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

/** Which devotional: one of his 37, or Random. A long list, so a picker, not a page of buttons. */
export const DevotionalControl: Control = ({ row }) => {
  const devotional = useSetting(devotionalSetting);
  return (
    <SettingRow row={row}>
      {devotional !== undefined ? (
        <label className="block">
          <span className="block text-base font-medium">{row.label}</span>
          <select value={devotional} onChange={(e) => void writeSetting(devotionalSetting.key, e.target.value)} className={PICKER}>
            <option value={RANDOM}>Random</option>
            {DEVOTIONALS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </SettingRow>
  );
};

/** In the draw: the devotionals Random may show, in the shared searchable list (shown only while Random is chosen). */
export const DevotionalDrawControl: Control = ({ row }) => {
  const draw = useSetting(devotionalDrawSetting);
  if (draw === undefined) return null;
  const ticked = tickedDevotionals(draw);
  const toggle = (id: string): void => {
    const next = ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id];
    void writeSetting(devotionalDrawSetting.key, tickedText(next));
  };
  return (
    <SettingRow row={row}>
      <SearchableList label={row.label} noun="devotional" items={ITEMS} ticked={ticked} onToggle={toggle} />
    </SettingRow>
  );
};
