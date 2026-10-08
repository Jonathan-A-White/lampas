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
| `verse-selected` | `{ chapter, verse }`; `verse` is `null` when no verse is selected (the same verse tapped again, or the reader left) | Reader: tapping a verse number; and `null` when the Reader unmounts | Reader (the highlight and where the Ask box sits, through `useLatest`); Ask box (`AskBox` reads which verse to ask about) |
| `view-changed` | `{ view: 'english' \| 'greek' }` | Reader: whenever the saved view changes, and once when it first loads | nobody yet |
| `weave-changed` | `{ weave: 'off' \| 'solid' }` | Reader: whenever the saved weave changes, and once when it first loads | nobody yet |
| `verse-reading` | `{ chapter, verse }` | nobody yet (read aloud, a later story: the verse being spoken now) | nobody yet |
| `reading-stopped` | none | nobody yet (read aloud, a later story: speech ended or was stopped) | nobody yet |
| `word-tapped` | `{ strongs, verse }` | nobody yet (a later story) | nobody yet |

The view and the weave themselves still live in the settings store (`src/data/repositories/settings.ts`); the bus only tells others when they change.
