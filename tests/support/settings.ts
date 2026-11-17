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
