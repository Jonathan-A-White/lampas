// A definition that names a page other than the one its section is on (tests/unit/settings-gather.test.tsx): a mistake that throws, naming the setting.
import { defineSetting } from "../../../src/settings/define";

export const wrongPage = defineSetting<"a">({
  key: "wrongPageFixture",
  default: "a",
  allowed: { kind: "choice", values: [{ value: "a", label: "A" }] },
  section: "talk",
  page: "daily",
  label: "Wrong page",
  hint: "Says daily for a section on the tutor page.",
});
