// A definition file as a story adds one with a page, a section and a place (tests/unit/settings-gather.test.tsx, mw-6ww.175.107): one file, and no edit to src/settings/rows.ts.
import { defineSetting, type SectionId } from "../../../src/settings/define";

export const pageSetting = defineSetting<"on" | "off">({
  key: "pageFixture",
  default: "off",
  allowed: {
    kind: "choice",
    values: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
  },
  // a section no page holds yet, brought with its page and its title (the id is a string the tests cast: SectionId lists the sections the app has)
  section: "fixtureSection" as SectionId,
  page: "tutor",
  sectionTitle: "The fixture section",
  sectionHint: "A section that only a test brings.",
  label: "Page fixture",
  hint: "A setting that only a test declares, on the tutor page.",
  ai: true,
  slot: 7,
});

/** A second setting of the same new section: it need not name the title again. */
export const secondSetting = defineSetting<"on" | "off">({
  key: "pageFixtureTwo",
  default: "on",
  allowed: {
    kind: "choice",
    values: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
  },
  section: "fixtureSection" as SectionId,
  page: "tutor",
  label: "Page fixture two",
  hint: "The second setting of the fixture section.",
  slot: 8,
});

/** A setting in a section an existing page holds: no page to name. */
export const oldSectionSetting = defineSetting<"on" | "off">({
  key: "pageFixtureOld",
  default: "on",
  allowed: {
    kind: "choice",
    values: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
  },
  section: "talk",
  label: "Page fixture old",
  hint: "A setting in the Talk section.",
  slot: 9,
});
