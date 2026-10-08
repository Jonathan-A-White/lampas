# Events

Screens do not call each other. They talk through one typed bus, `src/events/bus.ts`:

```ts
publish({ kind: 'verse-selected', chapter: 8, verse: 28 });
const off = subscribe('verse-selected', (event) => { /* … */ }); // later: off()
latest('verse-selected');            // the last one published, or undefined
useEvent('view-changed', (event) => { /* … */ }); // React: subscribed while mounted
useLatest('verse-selected');         // React: the last one, re-rendering when another comes
```

- Listeners are called in the order they subscribed. A listener that throws is logged (`console.error`) and the others still hear the event.
- A listener hears only events published after it subscribed. A screen that mounts late reads `latest(kind)` (or `useLatest`) for the current state.
- `AppEvent` in `bus.ts` is the list of kinds; add a kind there and in the table below (`tests/unit/bus.test.ts` fails if this file does not name every kind).
- Tests call `clearBus()` to forget listeners and kept events.

## Kinds

| Kind | Payload | Published by | Listened to by |
| --- | --- | --- | --- |
| `verse-selected` | `{ chapter, verse }`; `verse` is `null` when no verse is selected (the same verse tapped again, or the reader left) | Reader: tapping a verse number; and `null` when the Reader unmounts | Reader (the highlight and where the Ask box sits, through `useLatest`); Ask box (`AskBox` reads which verse to ask about); `src/nav/readerAddress.ts` (writes `v` and `c` into the address) |
| `view-changed` | `{ view: 'english' \| 'greek' }` | Reader: whenever the saved view changes, and once when it first loads | `src/nav/readerAddress.ts` (writes `view` into the address) |
| `weave-changed` | `{ weave: 'off' \| 'solid' }` | Reader: whenever the saved weave changes, and once when it first loads; Settings (where the weave is switched) | `src/nav/readerAddress.ts` (writes `weave` into the address) |
| `layout-changed` | `{ layout: 'verse' \| 'paragraph' }` (an id of `src/layout/layouts.ts`) | Settings (the Layout choice); Reader: whenever the saved layout changes, and once when it first loads | nobody yet |
| `headings-changed` | `{ headings: 'on' \| 'off' }` | Settings (the Section headings choice); Reader: whenever the saved choice changes, and once when it first loads | nobody yet |
| `voices-changed` | `{ english, greek }`: the voiceURI of the voice he chose for each language, or `null` for the phone's default | Settings (a voice picker changes); `src/speech/settingsSync.ts` (once at start, from the saved choice) | `src/speech/settingsSync.ts` (hands each voice to `src/speech/greek.ts`, so the speaker buttons use it) |
| `pronunciation-changed` | `{ pronunciation: 'modern' }` (an id of `src/speech/pronunciation.ts`) | Settings (the Greek pronunciation list); `src/speech/settingsSync.ts` (once at start) | `src/speech/settingsSync.ts` (hands it to `src/speech/greek.ts`: the language tag of every utterance); `src/WordSheet.tsx` (the respelling under the Greek) |
| `theme-changed` | `{ theme: 'phone' \| 'light' \| 'dark' }` (an id of `src/appearance/themes.ts`) | Settings (the Theme choice); `src/appearance/appearanceSync.ts` (once at start, from the saved choice) | `src/appearance/appearanceSync.ts` (html `data-theme` and the browser bar's colour) |
| `text-size-changed` | `{ percent }`: the Text size as a percent of the phone's own, 85 to 160 | Settings (the Text size choice); `src/appearance/appearanceSync.ts` (once at start) | `src/appearance/appearanceSync.ts` (html `--lp-scale`, which the root font size follows) |
| `rates-changed` | `{ rates }`: how fast each language is spoken, `{ english, greek }`, each 0.5 to 1.5, 1 normal (the languages of `src/speech/languages.ts`) | Settings (a speed slider); `src/speech/settingsSync.ts` (once at start) | `src/speech/settingsSync.ts` (hands each to `src/speech/greek.ts`: the rate of every utterance in that language) |
| `verse-reading` | `{ chapter, verse }` | `src/speech/readAloud.ts`: as each verse starts being read aloud (a verse's play button, or Read from the top / Read from here); again when Resume reads a verse from its start | nobody yet (the Reader highlights from `useReading()` of the same module) |
| `reading-stopped` | none | `src/speech/readAloud.ts`: a reading ended (the last verse was read) or was stopped (Stop, or leaving the reader); not on Pause | nobody yet |
| `word-spoken` | `{ text, language, verse }`: the word said (a Greek word, or an English chunk), its language (`'greek'` \| `'english'`, an id of `src/speech/languages.ts`) and the verse it stands in | Reader: a long press (500 ms, under 10 px of movement) on a word, once the phone has been asked to speak it | nobody yet |
| `reader-requested` | `{ id, action: 'ask', chapter, verse, question }` or `{ id, action: 'talk', chapter, verse }`: another screen (the Parsing drill) asks the Reader, as it opens on that verse, for the Ask box holding `question`, or for the Talk sheet. `id` counts up; the Reader takes a request once (`src/nav/readerRequest.ts`) | `src/nav/readerRequest.ts` (`askInReader`, `talkInReader`, which also open the Reader on the verse) | Reader (when it opens, through `pendingRequest`) |
| `word-tapped` | `{ strongs, verse }` | nobody yet (a later story) | nobody yet |

The reader also reads its own state back from the address when it opens (a reopen, Back): `src/nav/route.ts` `readerOf`, and the reader publishes the verse the address names. The address is `#/?c=8&view=greek&weave=off&v=28` (docs: `src/nav/lastRoute.ts`).

The view and the weave themselves still live in the settings store (`src/data/repositories/settings.ts`); the bus only tells others when they change.
