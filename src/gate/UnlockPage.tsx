// src/gate/UnlockPage.tsx — #/unlock: the Unlock screen as the Licence page of the app (mw-8m9dyu.1, .3). The app no longer opens on it;
// it is where Settings' 'Needs a licence' leads: Licensed or Not licensed, the phone's key as a QR code and as text with a Copy
// so a licence can be issued to it, and Check again, which turns the AI on at once when a licence is found.
import { useLicenceDetail } from './licenceContext';
import { Unlock } from './Unlock';

export function UnlockPage() {
  const detail = useLicenceDetail();
  if (!detail) return null;
  return <Unlock locked={detail.locked ?? { kind: 'licensed' }} publicKeyHex={detail.publicKeyHex} onCheckAgain={detail.checkAgain} banner={false} page siteIssued={detail.siteIssued} onRemoved={detail.removed} />;
}
