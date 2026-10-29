// The Variants rows (Settings > Reading > Variants, mw-9ji6ek0.4): what to show of the manuscripts' differences, and whose readings count (drawn only while Variants is not Off), Offer the lessons (always drawn, mw-9ji6ek0.19) and Read as (always drawn, mw-9ji6ek0.25).
import { variantLessonsOfferSetting, variantsSetting, variantWitnessesSetting } from '../definitions';
import { ReadAs } from '../../reader/ReadingSetSheet';
import { useSetting } from '../store';
import { ChipRow, OnOff, RowName, SettingRow } from './SettingRow';
import type { Control } from './types';

export const VariantsControl: Control = ({ row }) => {
  const variants = useSetting(variantsSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {variants ? <ChipRow name={row.label} current={variants} options={variantsSetting.allowed.kind === 'choice' ? variantsSetting.allowed.values.map((v) => [v.value, v.label]) : []} settingKey="variants" /> : null}
    </SettingRow>
  );
};

export const VariantWitnessesControl: Control = ({ row }) => {
  const witnesses = useSetting(variantWitnessesSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {witnesses ? <ChipRow name={row.label} current={witnesses} options={variantWitnessesSetting.allowed.kind === 'choice' ? variantWitnessesSetting.allowed.values.map((v) => [v.value, v.label]) : []} settingKey="variantWitnesses" /> : null}
    </SettingRow>
  );
};

export const VariantLessonsOfferControl: Control = ({ row }) => {
  const offer = useSetting(variantLessonsOfferSetting);
  return (
    <SettingRow row={row}>
      <RowName row={row} />
      {offer ? <OnOff name={row.label} current={offer} settingKey="variantLessonsOffer" /> : null}
    </SettingRow>
  );
};

/** Read as (mw-9ji6ek0.25): the reading set in force and his own sets, the panel the variants chip's sheet has (src/reader/ReadingSetSheet.tsx). Not a registry setting: the sets live in their own table. */
export const ReadingSetControl: Control = ({ row }) => (
  <SettingRow row={row}>
    <RowName row={row} />
    <ReadAs name={row.label} />
  </SettingRow>
);
