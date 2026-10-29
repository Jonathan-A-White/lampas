// The Variants rows (Settings > Reading > Variants, mw-9ji6ek0.4): what to show of the manuscripts' differences, and whose readings count (drawn only while Variants is not Off), and Offer the lessons (always drawn, mw-9ji6ek0.19).
import { variantLessonsOfferSetting, variantsSetting, variantWitnessesSetting } from '../definitions';
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
