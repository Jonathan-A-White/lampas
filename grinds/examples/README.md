# Grind examples

Each grind in `grinds/<kind>.json` keeps one or more scenarios, BDD-style, under
`grinds/examples/<kind>/<name>.json`. A scenario is what the reader does (the request, and
the recording for a grind that takes one) and what the answer must show (`expect`).
`mw grist smoke lampas` sends each request through the live grist and checks the answer
against `expect`; the unit test `tests/unit/grind-examples.test.ts` checks every scenario's
shape without a network.

```json
{
  "description": "One plain sentence: the situation and what must come back.",
  "schemaVersion": "1",
  "request": { "reference": "Romans 8:28", "target_text": "And we know ...", "lang": "en" },
  "photos": ["read-8-28-start-only.webm"],
  "expect": {
    "verdict": { "equals": "incomplete" },
    "focus_words.0": { "present": false }
  }
}
```

- `schemaVersion`: one of the grind's `versions`.
- `request`: the grind's input exactly as the app sends it; valid against
  `grinds/<kind>.input.schema.json`.
- `photos`: file names beside the scenario, as many as the grind's `attachments` allow, each
  of a type its `attachments.mime` lists. Lampas has no photo grind; the key is the one the
  sender knows, so `verse-read` keeps its recording here (`.webm`, a synthesized voice, made
  from `tests/fixtures/read-8-28.wav`). Public-safe only: no person, no personal data,
  under 200 KB. Scenarios may share a file.
- `expect`: answer path (a field name; dots for nested fields and a number for a place in a
  list, `settings_changes.0.key`) to checks. Every check given for a path must hold:
  - `equals`: the value is exactly this
  - `is_null`: `true` the value is null, `false` it is not
  - `one_of`: the value is one of these
  - `contains`: a string field includes this text
  - `matches`: a string field matches this regular expression, which the app's test (JavaScript) and the mill (Go's RE2) must both read:
    no `(?i)`, no lookaround (`(?=` `(?!` `(?<=` `(?<!`), no backreference (`\1`), no `[^]` (write `[\s\S]`); the unit test refuses them
  - `present`: `true` the field is in the answer, `false` it is left out

Every `expect` path must be a field of the grind's answer schema, and every `equals` or
`one_of` value one the schema allows. `feedback` forwards to the Mayor and has no answer
schema: its answer is the mill's `{"status":"sent"}`.

A story that changes a grind's behaviour (its instructions, schemas, or what the app sends)
updates or adds its scenarios in the same story. A new grind needs at least one scenario
and an input schema, or the unit test fails.
