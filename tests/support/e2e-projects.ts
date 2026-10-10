// The e2e specs that only pass at a phone's width. The 'chromium' project is 1280 wide, so it leaves them out;
// the 'shots' project (390x844) runs every spec, these included. Found by running chromium on a clean main
// (mw-5r3p30.156): add a spec here when it passes under shots and fails under chromium. A spec that sets its own
// viewport (test.use or setViewportSize) passes in both and does not belong here.
export const PHONE_WIDTH_SPECS: readonly string[] = [
  'goal-setting.spec.ts',
  'goal.spec.ts',
  'grammar-approach.spec.ts',
  'grammar-drills.spec.ts',
  'greek-audio.spec.ts',
  'page-actions.spec.ts',
  'placement.spec.ts',
  'read-aloud.spec.ts',
  'reader.spec.ts',
  'speaking-bar.spec.ts',
  'update-banner.spec.ts',
  'weave-learning.spec.ts',
];
