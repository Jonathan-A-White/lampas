// src/tips/LicensedTips.tsx — the tips' sitting, only for a licensed phone: the tips grist goes to the mill, which answers a licence only
// (mw-8m9dyu.1: the app no longer sits behind the Gate, which used to guarantee it).
import { useLicence } from '../gate/licenceContext';
import { TipsSitting } from './TipsSitting';

export function LicensedTips() {
  return useLicence() === 'licensed' ? <TipsSitting /> : null;
}
