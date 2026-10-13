// src/gate/UnlockPage.tsx — #/unlock: the Unlock screen as a page of the app (mw-8m9dyu.1). The app no longer opens on it;
// it is where the phone's key, as a QR code and as text with a Copy, is shown so a licence can be issued to it.
import { useLicenceDetail } from './licenceContext';
import { Unlock } from './Unlock';

export function UnlockPage() {
  const detail = useLicenceDetail();
  if (!detail) return null;
  return <Unlock locked={detail.locked ?? { kind: 'licensed' }} publicKeyHex={detail.publicKeyHex} onCheckAgain={detail.checkAgain} banner={false} />;
}
