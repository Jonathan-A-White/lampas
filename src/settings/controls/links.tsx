import { navigate } from '../../nav/route';
import type { SettingsRow } from '../rows';
import { SettingRow } from './SettingRow';

const LINK_TO = { 'link.studyway': 'studyway', 'link.words': 'words', 'link.review': 'review', 'link.paradigms': 'paradigms', 'link.about': 'about' } as const;

export function LinkControl({ row }: { row: SettingsRow }) {
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
