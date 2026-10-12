// tests/support/licence-probe.tsx — shows what useLicence() says, for a feature step to read.
import { useLicence } from '../../src/gate/licenceContext';

export function LicenceProbe() {
  return <p data-testid="licence-state">{useLicence()}</p>;
}
