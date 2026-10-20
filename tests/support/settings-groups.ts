// tests/support/settings-groups.ts — the groups of Settings as the specs list them (src/settings/rows.ts GROUPS; a Playwright spec does not import src/).
/** The groups of Settings, in the order the home lists them (src/settings/rows.ts GROUPS; tests/unit/settings-groups.test.ts holds the two the same). */
export const GROUP_PAGES: readonly { id: string; title: string }[] = [
  { id: 'reading', title: 'Reading' },
  { id: 'greek', title: 'Greek' },
  { id: 'tutor', title: 'The tutor' },
  { id: 'listening', title: 'Listening' },
  { id: 'daily', title: 'Daily' },
  { id: 'study', title: 'Study resources' },
  { id: 'account', title: 'Account' },
  { id: 'developer', title: 'Developer' },
];
