// A definition that gives no `order` or `slot`: it comes last (tests/unit/settings-gather.test.tsx).
import { defineSetting } from '../../../src/settings/define';

export const lastSetting = defineSetting<string>({
  key: 'lastFixture',
  default: 'a',
  allowed: { kind: 'choice', values: [{ value: 'a', label: 'A' }] },
  section: 'more',
  label: 'Last',
  hint: 'A setting with no place of its own.',
});
