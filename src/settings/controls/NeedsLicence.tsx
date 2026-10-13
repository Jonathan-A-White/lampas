import { navigate } from '../../nav/route';
import type { SettingsRow } from '../rows';
import { SettingRow } from './SettingRow';

/** An AI option on a phone with no licence (mw-8m9dyu.3): off and greyed, so it cannot be turned on, with 'Needs a licence', which opens the Licence page. */
export function NeedsLicenceRow({ row }: { row: SettingsRow }) {
  return (
    <SettingRow row={row}>
      <div role="group" aria-label={row.label} className="inline-flex rounded-xl border border-line p-0.5 opacity-50">
        <button type="button" disabled aria-pressed="true" className="min-h-12 min-w-12 rounded-lg px-4 text-base font-medium">
          Off
        </button>
      </div>
      <button
        type="button"
        onClick={() => navigate('unlock')}
        className="ml-3 min-h-12 text-base font-medium text-accent underline"
      >
        Needs a licence
      </button>
    </SettingRow>
  );
}
