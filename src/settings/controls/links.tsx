import { navigate, openRequests } from '../../nav/route';
import type { SettingsRow } from '../rows';
import { SettingRow } from './SettingRow';
import { draws } from './types';

const LINK_TO = { 'link.aboutyou': 'aboutyou', 'link.memory': 'memory', 'link.studyway': 'studyway', 'link.goal': 'goal', 'link.askmore': 'askmore', 'link.requests': 'requests', 'link.conversations': 'conversations', 'link.help': 'help', 'link.about': 'about', 'link.variantLessons': 'lessons' } as const;

export function LinkControl({ row }: { row: SettingsRow }) {
  const to = LINK_TO[row.key as keyof typeof LINK_TO];
  return (
    <SettingRow row={row} className="border-b border-line pb-2">
      <button
        type="button"
        onClick={() => (to === 'requests' ? openRequests('settings') : navigate(to))}
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

/** The rows each control above draws (src/settings/controls/index.ts gathers them by glob): a new control names its rows here and no list is edited. */
export const linkControlDraws = draws(LinkControl, { prefixes: ['link.'] });
