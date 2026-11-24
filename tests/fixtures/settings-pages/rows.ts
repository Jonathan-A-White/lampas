// Rows that are not settings and a door of the home, as a story adds them (tests/unit/settings-gather.test.tsx, mw-6ww.175.107).
import type { SectionId } from "../../../src/settings/define";
import { extraRows, homeDoor } from "../../../src/settings/row";

export const fixtureLinks = extraRows(5, [
  {
    key: "link.fixture",
    label: "Fixture link",
    hint: "A link only a test has.",
    section: "fixtureSection" as SectionId,
  },
]);
export const fixtureAfter = extraRows(
  1,
  [
    {
      key: "fixtureAfter",
      label: "Fixture after",
      hint: "Directly after the first setting of its section.",
      section: "fixtureSection" as SectionId,
    },
  ],
  "pageFixture",
);
export const fixtureDoor = homeDoor({
  id: "fixtureDoor",
  title: "Fixture door",
  hint: "A door only a test has.",
  before: "listening",
});
