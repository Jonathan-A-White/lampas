// A definition in a section no page holds that names no title (tests/unit/settings-gather.test.tsx): a mistake that throws, naming the setting.
import { defineSetting, type SectionId } from "../../../src/settings/define";

export const noTitle = defineSetting<"a">({
  key: "noTitleFixture",
  default: "a",
  allowed: { kind: "choice", values: [{ value: "a", label: "A" }] },
  section: "orphanSection" as SectionId,
  page: "daily",
  label: "No title",
  hint: "Brings a section and no title.",
});
