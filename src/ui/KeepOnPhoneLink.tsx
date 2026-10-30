// src/ui/KeepOnPhoneLink.tsx — the link every 'could not be fetched' or 'you are offline' message offers (mw-lcv9z3g.4, src/ui/online.ts).
import { openSetting, settingLink } from '../settings/link';

/** 'Keep the New Testament on this phone': a link to the Keep on this phone row of Settings; `onOpen` runs first, for a card that must close. */
export function KeepOnPhoneLink({ onOpen, className }: { onOpen?: () => void; className?: string }) {
  return (
    <a
      href={settingLink('offlineCopy') ?? '#/settings'}
      onClick={(e) => {
        e.preventDefault();
        onOpen?.();
        openSetting('offlineCopy');
      }}
      className={className ?? 'mt-3 block min-h-12 content-center text-center text-lg text-accent underline'}
    >
      Keep the New Testament on this phone
    </a>
  );
}
