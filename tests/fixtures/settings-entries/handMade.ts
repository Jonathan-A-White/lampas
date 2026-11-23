// An entry made by hand, in a slot (tests/unit/settings-gather.test.tsx).
import { slotted } from '../../../src/settings/entry';

export const handMadeSlot = slotted(7, {
  key: 'handMadeFixture',
  section: 'more',
  label: 'Hand made',
  hint: 'An entry written out.',
  allowed: { kind: 'text', valid: () => true, example: 'x' },
  read: async () => '',
  write: async () => undefined,
  show: () => 'Hand made',
});
