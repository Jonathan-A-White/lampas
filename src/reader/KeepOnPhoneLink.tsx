// src/reader/KeepOnPhoneLink.tsx — 'Keep the New Testament on this phone' (mw-lcv9z3g.4): the link that goes with a passage that could not be fetched (src/reader/offlineWords.ts), to Settings >
// Reading > Keep on this phone, which keeps the New Testament so it reads with no signal.
import { openSetting, settingLink } from '../settings/link';

/** 'Keep the New Testament on this phone': a link that opens Settings at the Keep on this phone row. `onOpen` runs first (a card closes itself). */
export function KeepOnPhoneLink({ onOpen, className }: { onOpen?: () => void; className?: string }) {
  return (
    <a
      href={settingLink('offlineCopy') ?? '#/settings'}
      onClick={(e) => {
        e.preventDefault();
        onOpen?.();
        openSetting('offlineCopy');
      }}
      className={className ?? 'inline-block min-h-12 py-3 text-base text-accent underline'}
    >
      Keep the New Testament on this phone
    </a>
  );
}
