// A value two settings make together and no setting holds, as a story adds it (tests/unit/settings-gather.test.tsx, mw-6ww.175.112): one file, no edit to src/settings/rows.ts.
import { derivedValue } from "../../../src/settings/row";

export const PAIR_KEY = "fixture.pair";

export const pairValue = derivedValue(PAIR_KEY, async (_key, setting) => {
  const [theme, weave] = await Promise.all([setting("theme"), setting("weave")]);
  return `${String(theme)}+${String(weave)}`;
});

/** A family of keys: 'fixture.family.<word>' answers with the word. */
export const familyValue = derivedValue(
  (key) => key.startsWith("fixture.family."),
  async (key) => key.slice("fixture.family.".length),
);
