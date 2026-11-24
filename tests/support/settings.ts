// tests/support/settings.ts — the one way a test reaches the settings registry (src/settings: the SETTINGS list and its writers, the
// ROWS Settings draws, the CONTROLS that draw them). A test imports from here and never from src/settings itself, so a change to how a
// setting or a row registers is made in this file and not in dozens of tests (mw-6ww.175.81, stage 1 of the Lampas registry).
import * as registryModule from '../../src/settings/registry';

export * from '../../src/settings/registry';
export * from '../../src/settings/rows';
export { CONTROLS } from '../../src/settings/controls';
export { SettingRow } from '../../src/settings/controls/SettingRow';
export { CopyFormatControl } from '../../src/settings/controls/appearance';
export { ApproachControl, ApproachPicker } from '../../src/settings/controls/approach';
export { QUIZ_GOAL_DRAFT_KEY, QuizGoalControl } from '../../src/settings/controls/quizGoal';
export { LogosBibleControl } from '../../src/settings/controls/resources';

/** The registry module as a whole, for a test that wraps one of its functions (a spy on it is seen by the app, which imports the same module). */
export { registryModule };

export { SETTINGS_SOURCE } from './settings-sources';

/** What is wrong with a list of registry entries, one sentence each (an empty list when it is right): every key once, a label, a hint and, for a choice, a value. A test reads the real SETTINGS and a gathered list with a fixture setting added through this one. */
export function settingProblems(entries: readonly registryModule.SettingEntry[]): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  for (const entry of entries) {
    if (keys.has(entry.key)) problems.push(`'${entry.key}' is in the list twice`);
    keys.add(entry.key);
    if (entry.label === '') problems.push(`'${entry.key}' has no label`);
    if (entry.hint === '') problems.push(`'${entry.key}' has no hint`);
    if (entry.allowed.kind === 'choice' && entry.allowed.values.length === 0) problems.push(`'${entry.key}' allows a choice with no values`);
  }
  return problems;
}
