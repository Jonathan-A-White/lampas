# Tips: the data half

Lampas lets him start right away and helps him grow with it (his words, mw-5r3p30.69). A 'tips' grind looks at a short summary of
what he uses and offers one small tip. This file is the data half: the usage log, the summary and the grind. The tip card, its
setting (on by default, he can turn it off) and the schedule are a later story.

## The usage log (`src/tips/usageLog.ts`, Dexie `usage`, v12)

`startUsageLog()` (started by `App`) listens to every event on the bus (`subscribeAll` in `src/events/bus.ts`) and to the address, and
adds one to a row per local day and name: an event kind (`verse-selected`), `screen:<route>` (the screen he opens on and each he moves
to), and `chapter-changed` (a chapter opened after another, which is the picker or the chapter buttons, not a reopen). Only the name is
kept: never a verse, a word or a question.

## The summary (`src/tips/summary.ts`)

`usageSummary()` reads the log, the counts of what he has done (`src/data/repositories/usage.ts`) and the settings he has chosen, and
`summarize(facts, now)` (pure) makes:

| Field | Meaning |
| --- | --- |
| `days_used`, `days_used_last_7`, `first_used_days_ago` | days with anything logged; of the last seven days; whole days since the first |
| `screens_visited`, `screens_never` | the ids of `SCREENS` (the reader is always open and not listed) |
| `features_used`, `features_never` | the ids of `FEATURES`, each with its own evidence: a table count (Talk, Ask, Quick test ...), a log name (read aloud, long press, Review) or a setting (Weave, Goal, Study links) |
| `settings_changed`, `settings_never` | registry settings with a saved row (a row exists only once he chose) |
| `turned_off` | registry settings he saved as `off` |
| `counts` | words learning and solid, and the rows of the tutor, talk, quiz, drill, reading and grammar tables |

A new feature he can take up is one entry in `FEATURES` (and a line in `grinds/tips.instructions.md`, which a test keeps level); a new
screen is one entry in `SCREENS` (the answer schema's action enum follows it, and a test holds them equal).

## The grind (`grinds/tips.*`)

Kind `tips`, model haiku, effort low. Request `{summary, shown}` (`tips.input.schema.json`; `shown` are the ids already offered).
Answer `{tip: null}` or `{tip: {id, title, body, action?}}` (`tips.answer.schema.json`; `action` is `{label, screen}`, `screen` one of
`SCREENS`). `src/tips/tip.ts` has the types and `isTipAnswer`, the guard the phone will run. The mill must allow the `tips` kind.
