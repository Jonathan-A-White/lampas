// A definition file as a story adds one (tests/unit/settings-gather.test.tsx): one file, no number, no list to edit.
import { defineSetting } from '../../../src/settings/define';

export const exampleSetting = defineSetting<'on' | 'off'>({
  key: 'exampleFixture',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'more',
  label: 'Example',
  hint: 'A setting that only a test declares.',
  slot: 5,
  order: 5,
});

/** Declared in the same directory but kept out of both lists. */
export const keptOutSetting = defineSetting<'on' | 'off'>({
  key: 'keptOutFixture',
  outside: 'a row of its own',
  default: 'off',
  allowed: { kind: 'choice', values: [{ value: 'off', label: 'Off' }] },
  section: 'more',
  label: 'Kept out',
  hint: 'Not in DEFINITIONS or SETTINGS.',
});
