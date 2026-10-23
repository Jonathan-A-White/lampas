import { useState } from 'react';
import { useAiAllowed } from '../../gate/licenceContext';
import { AskForBook } from '../../library/AskForBook';
import { SettingRow } from './SettingRow';
import type { Control } from './types';

/** Ask for a devotional (mw-1fwagb.8, now mw-rfjjzd.14), the last row of Settings > Daily: a button that opens Ask for a book with the kind set to a devotional (src/library/AskForBook.tsx). The makers add it
 * to Which devotional when they find its Logos id. Sent to the mill, so with no licence the row says so. */
export const AskDevotionalControl: Control = ({ row }) => {
  const ai = useAiAllowed();
  const [open, setOpen] = useState(false);
  return (
    <SettingRow row={row}>
      {ai ? (
        <button type="button" onClick={() => setOpen(true)} className="block min-h-12 w-full rounded-xl border border-line px-4 py-2 text-left text-base font-medium">
          {row.label}
        </button>
      ) : (
        <p className="text-base text-muted">Asking goes to the factory through the tutor's mill, so it needs a licence.</p>
      )}
      {open ? <AskForBook kind="devotional" onClose={() => setOpen(false)} /> : null}
    </SettingRow>
  );
};
