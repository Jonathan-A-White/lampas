# Tips

Lampas lets him start right away and helps him grow with it (his words, mw-5r3p30.69 and .70). A 'tips' grind looks at a short summary
of what he uses and offers one small tip. The first half of this file is the data half: the usage log, the summary and the grind. The
second is the screen half: the Tips setting, when a grist is sent, and the card.

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

## The screen half (mw-5r3p30.70)

**The Tips setting** (`tips` in `src/settings/registry.ts`, Settings > Tips, On | Off, On by default; `tips-changed` on the bus). Off sends
nothing and hides the card.

**When a grist is sent** (`src/tips/offer.ts`, started by `src/tips/TipsSitting.tsx`, rendered in `src/main.tsx` inside the licence gate, so
once at the start of each sitting). All of these must hold, checked in this order:

1. Tips is On.
2. No grist went out today: `localStorage` `lampas.tipsDay` is not today's local day. It is set before the send, so a second start cannot
   send again, and removed again when nothing went out (no licence, no network, refused), so a later start that day may try.
3. No tip is still up: a tip he has not answered keeps its card and no new grist is sent.
4. `navigator.onLine` is not false.

The grist is `askGrind('tips', {summary, shown})` as the tutor sends one; `shown` is every id in the `tips` table. An answer of `{tip: null}`
leaves no card; a tip whose id was shown before is dropped (the grind is told never to repeat).

**The card** (`src/tips/TipCard.tsx`, drawn by the Reader under the header's strips, after Due and Goal, not while a chapter is read aloud):
the title, the body and two buttons. **Show me** (only when the tip has an action; the action's `label` is not shown) opens the action's screen
and marks the tip `acted`; **Not now** marks it `dismissed` (a tip with no screen has **Got it** instead). Both keep the row, so the id is sent
as shown next time and never offered again.

**Dexie `tips`** (v13): `{id (key), title, body, action?, day, status 'open' | 'acted' | 'dismissed'}`; `src/data/repositories/tips.ts`.

**Tests**: `features/tips.feature` (a fake Postern whose mill answers with `TIP_ANSWER`), `tests/e2e/tips.spec.ts`. In e2e `openUnlocked(page)`
marks today as asked so no spec sends a tips grist by accident; `openUnlocked(page, { tips: true })` leaves the day free.

PROVISIONAL: once a day, the card's place under the header strips, haiku.
