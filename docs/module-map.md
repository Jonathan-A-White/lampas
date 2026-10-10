# Lampas module map

Written 2026-10-09 at base commit ae6cb9e (mw-vtjxh4.20). Docs only: no behaviour changed and no source file moved.

Why it exists. The Governor's rule (the vault's PWA best practices, "Modular Boundaries"): draw the boundaries so two stories can change two modules at once without touching each other, and keep refactoring toward that; put common code once in a shared library. The factory runs stories of one rig in series when they touch the same file, so a file every feature edits serialises the backlog. This map says where Lampas stands (216 TypeScript files, about 22,300 lines under `src/`), which files collide, which splits free the most parallel work, where the code breaks the rule, and what could live in a shared library.

How to read it: section 1 is the modules, section 2 the evidence of collisions, section 3 the proposed refactors (ranked), section 4 the rule breaks, section 5 the library candidates. A path in backticks exists in the repo at the base commit; a path written without backticks is proposed and does not exist yet. Check the backticked paths with:

```sh
awk '/^```/{f=!f; next} !f' docs/module-map.md | grep -o '`[^`]*`' | tr -d '`' \
  | grep -E '/|\.(tsx?|md|json|css|toml)$' | sort -u | while read -r p; do test -e "$p" || echo "missing: $p"; done
```

## 1. Modules

Lampas has no `package.json` workspaces: a module is a folder under `src/` (or a group of files beside them). Only four folders have an entry file (`src/approaches/index.ts`, `src/resources/index.ts`, `src/data/repositories/index.ts`, `src/data/paradigms/index.ts`); every other module is imported file by file, so its API is whatever its files export. "Imports" lists the other Lampas modules a module reaches into (vendors in parentheses), counted over the import statements.

| Module | One responsibility | Entry and API | Imports |
|---|---|---|---|
| App shell: `src/main.tsx`, `src/App.tsx`, `src/ErrorBoundary.tsx`, `src/UpdateBanner.tsx`, `src/whatsNew/` (What's new: the banner's line, the sheet after an update, About's list), `src/sw.ts`, `src/precacheGuard.ts`, `src/dataCache.ts`, `src/reportError.ts`, `src/config.ts` | Start the app: scroll guard, gate, router, startup seeding, the service worker and its update flow | `src/App.tsx` exports `App({ newRandom })`; `src/config.ts` exports the issuer, collection, chain, door and storage names | gate, nav, data/repositories, appearance, speech, tips, every screen (workbox, virtual:pwa-register) |
| Reader and its sheets: `src/Reader.tsx` (449 lines, the composition; since R1 it draws with `src/reader/ChapterText.tsx`, `VerseText.tsx`, `ReaderHeader.tsx`, `ChapterFailed.tsx`, `LinkNotice.tsx` and reads through `src/reader/useReaderSettings.ts`, `useReaderTutor.ts`, `useChapter.ts`, `useWoven.ts`, `useReadFrom.ts`), `src/WordSheet.tsx`, `src/GrammarSheet.tsx`, `src/IdeaSheet.tsx`, `src/TeachSheet.tsx`, `src/ChapterPicker.tsx`, `src/ChapterNav.tsx`, `src/VerseView.tsx`, `src/ReadCheck.tsx`, `src/Ask.tsx`, `src/Talk.tsx`, `src/TutorLinks.tsx`, `src/AskTutor.tsx` | Show a chapter and everything opened from a word or a verse | `src/Reader.tsx` exports `Reader()`; the sheets export one component each | data, data/repositories, data/grammar, nav, speech, services, events, tips, ui, resources, review (dexie-react-hooks) |
| Study screens: `src/WordsScreen.tsx`, `src/ImportScreen.tsx`, `src/QuizScreen.tsx`, `src/ReviewScreen.tsx`, `src/DrillScreen.tsx`, `src/GoalScreen.tsx`, `src/PlacementScreen.tsx`, `src/ParadigmsScreen.tsx`, `src/StudyWayScreen.tsx`, `src/About.tsx` | One screen per route; each reads through repositories and the pure modules in data | each exports its screen component; `src/QuizScreen.tsx`, `src/ReviewScreen.tsx`, `src/DrillScreen.tsx`, `src/PlacementScreen.tsx` take `newRandom` | data, data/repositories, data/grammar, review, nav, ui, speech |
| Settings screen: `src/SettingsScreen.tsx` (916 lines) | Draw every Settings row with its control | exports `SettingsScreen()`; the private `CONTROLS` map names a control per row key | settings, data/repositories, speech, resources, approaches, appearance, script |
| Screen hooks: `src/useAsks.ts`, `src/useTalk.ts`, `src/useReadChecks.ts`, `src/useVoice.ts`, `src/useNewWords.ts`, `src/usePace.ts`, `src/useKnownTerms.ts`, `src/useGoalProgress.ts` | Keep state that outlives a sheet: questions in flight, the new-word list, the pace | `useAsks(book, chapter, title)`, `useTalk(...)`, `useReadChecks(...)`, `useVoice(onSend)`, `useGoalProgress()` | services, data, data/repositories, speech, settings |
| `src/data/` (content and pure logic) | The text and everything computed from it: chapters, lexicon, weave, quiz, drill, schedule, frontier, pace, passages | no entry file: `src/data/chapter.ts` (`loadChapter`, `loadIndex`), `src/data/lexicon.ts` (`lookupLemma`), `src/data/weave.ts` (`weaveVerse`), `src/data/quiz.ts`, `src/data/schedule.ts` (`nextReview`), `src/data/frontier.ts`, `src/data/passage.ts`, `src/data/books.ts` | data/repositories, data/grammar, services, settings (dexie only in `src/data/db.ts`) |
| `src/data/repositories/` | The only way UI reaches Dexie: one file per table family | `src/data/repositories/index.ts` re-exports about 140 names (functions and types); types come from `src/data/db.ts` (Dexie version 13) | data, speech, events, data/grammar, appearance, audio, approaches, layout, resources, script, settings |
| `src/data/grammar/` | The grammar ladder, goal needs, placement, question building, learner grammar | no entry file: `src/data/grammar/ladder.ts`, `src/data/grammar/needs.ts`, `src/data/grammar/placement.ts`, `src/data/grammar/questions.ts`, `src/data/grammar/learnerGrammar.ts` | data, approaches, data/repositories, speech |
| `src/data/paradigms/` | The paradigm tables as data | `src/data/paradigms/index.ts` (`PARADIGMS`) | data/grammar |
| `src/services/` | Everything that leaves the phone or holds the licence: the grist client and its request builders, device key, licence check and cache, push-to-talk dictation, app update | `src/services/tutor.ts` (`askGrind`, `askTutor`, `TutorError`), `src/services/talk.ts`, `src/services/reading.ts`, `src/services/feedback.ts`, `src/services/deviceKey.ts`, `src/services/licenceCheck.ts`, `src/services/listen.ts` (`startListening`), `src/services/appUpdate.ts` | data, audio, data/grammar, data/repositories, speech, settings, tutor (bsv-kit/bsv, bsv-kit/grist, @bsv/sdk) |
| `src/gate/` | Hold the app shut until the phone's key holds a licence (24 h offline grace) | `src/gate/Gate.tsx` (`Gate({ children, issuer, check, now, retryMs })`), `src/gate/Unlock.tsx` | config, services |
| `src/speech/` | Speak, and read aloud: voices, rates, pronunciation schemes, the read-aloud sequencer, the tutor's voice | no entry file: `src/speech/greek.ts` (`speak`, `speakPart`, `speakWord`, `hasVoice`, `warmVoices`), `src/speech/readAloud.ts` (`startReading`, `pauseReading`, `stopReading`, `useReading`), `src/speech/tutorVoice.ts` (`speakTutor`), `src/speech/languages.ts`, `src/speech/pronunciation.ts` | data, data/repositories, events, markdown, script, nav, services |
| `src/audio/` | Record and replay the reader's own voice | `src/audio/recorder.ts` (`ReadingRecorder`, `recorderSeam`), `src/audio/clip.ts` (`clipOf`, `blobOf`), `src/audio/clipPlayer.ts` (`ClipPlayer`) | none |
| `src/nav/` | The hash address, history, links in, reopen-where-I-left, scroll memory | no entry file: `src/nav/route.ts` (`navigate`, `openReader`, `openVerse`, `useAddress`), `src/nav/lastRoute.ts`, `src/nav/links.ts`, `src/nav/readerRequest.ts`, `src/nav/scrollMemory.ts` | data, events, services, data/paradigms, data/repositories |
| `src/events/` | The typed in-app bus screens talk through | `src/events/bus.ts` (`publish`, `subscribe`, `subscribeAll`, `latest`, `useEvent`, `useLatest`, `AppEvent` with 36 kinds; docs/events.md lists them) | type-only: data/repositories, data, script, speech, appearance, services |
| `src/settings/` | The talkable settings registry and the one list of Settings rows | `src/settings/registry.ts` (`SETTINGS`, `writeSetting`, `applyChanges`, `undoChange`, `currentSettings`), `src/settings/rows.ts` (`ROWS`, `SECTIONS`, `visibleRows`), `src/settings/grindText.ts` | data/repositories, speech, appearance, data, resources, approaches, layout, script, events |
| `src/tips/` | Usage counts, the tips grind and the one-time hints | `src/tips/offer.ts` (`offerTip`), `src/tips/usageLog.ts`, `src/tips/summary.ts`, `src/tips/hints.ts` (`HINTS`), `src/tips/HintCard.tsx` | data/repositories, nav, services, settings, speech, events (bsv-kit/tips) |
| `src/ui/` | Shared controls and gestures: hold bars, long press, sheet Back, scroll guard, searchable list | no entry file: `src/ui/HoldBar.tsx`, `src/ui/holdPress.ts`, `src/ui/longPress.ts`, `src/ui/sheetBack.ts`, `src/ui/scrollGuard.ts`, `src/ui/SearchableList.tsx` | review (one file) |
| `src/review/` | The review round: item kinds (grammar idea, word), drawing and grading a round | `src/review/kinds.ts` (`KINDS`), `src/review/round.ts` (`drawReviewRound`), `src/review/ItemCard.tsx` | data, data/grammar, data/repositories, settings, events, speech |
| `src/resources/` | Study resources (Strong's, Logos, Accordance): links out, no text | `src/resources/index.ts` (`RESOURCES`, `resourceOf`), `src/resources/tutorLinks.ts`, `src/resources/openApp.ts` | data, data/repositories, nav |
| `src/approaches/` | The grammar teaching approaches as data | `src/approaches/index.ts` (`APPROACHES`, `orderOf`, `lessonOf`, `nextLessonOf`) | data/grammar, data |
| `src/script/` | Other scripts the tutor writes (Hebrew): depth setting, spans, guide | `src/script/scripts.ts` (`SCRIPTS`, `splitScripts`), `src/script/HebrewGuide.tsx`, `src/script/HebrewWord.tsx` | speech, ui, data, data/repositories |
| `src/tutor/` | What the Ask-the-tutor button knows about the current screen | `src/tutor/screenContext.ts` (`useReportScreen`), `src/tutor/screen.ts` (`SCREEN_NAMES`, `suggestionsFor`) | nav |
| `src/appearance/` | Theme and text size reach the page | `src/appearance/appearanceSync.ts` (`startAppearanceSync`), `src/appearance/themes.ts`, `src/appearance/textSizes.ts` | data/repositories, events |
| `src/markdown/`, `src/layout/`, `src/verse/`, `src/images/` | Markdown for answers; reading layouts; the Verse view's actions; shrinking pictures before sending | `src/markdown/Markdown.tsx`, `src/layout/layouts.ts`, `src/verse/action.ts`, `src/images/shrink.ts` | script (markdown), data (layout) |

Observed dependency facts (from the import graph at the base commit):

- The files directly under `src/` (screens, sheets, hooks) import 23 other module folders: `src/data/` 81 times, `src/ui/` 46, `src/speech/` 43, `src/nav/` 36, `src/data/repositories/` 32. The screens are the wide fan-in; that is expected.
- Cycles at module level: `src/data/repositories/` imports `src/speech/` (4), `src/events/` (3), `src/appearance/`, `src/settings/`, `src/resources/` and `src/script/` for defaults and types, while `src/speech/`, `src/settings/`, `src/appearance/` and `src/tips/` import the repositories back. `src/events/bus.ts` imports types from the repositories and the repositories publish on the bus. These are default-value and type imports, but they are why a new setting touches five modules (see R2).
- `src/data/` is three things in one folder (31 files): bundled-content access (`src/data/chapter.ts`, `src/data/lexicon.ts`), pure learning logic (`src/data/quiz.ts`, `src/data/drill.ts`, `src/data/schedule.ts`) and small localStorage keepers (`src/data/roundKeep.ts`, `src/data/drillKeep.ts`, `src/data/placementKeep.ts`, `src/data/readerChapter.ts`).

## 2. Collisions

The 15 source files changed by the most commits, from `git log --since=30.days --name-only --format= -- src | sort | uniq -c | sort -rn | head -15` run at the base commit (378 commits in the window; the repo is two days old, so the window is its whole life). Lines are at the base commit.

| File | Commits | Lines | Why it collides |
|---|---|---|---|
| `src/Reader.tsx` | 48 | 1009 | Every Reader feature (Verse view, quiz, read aloud, links, tips, new words, goal strip, talk) wires itself in here: 25 `useState`/`useRef` calls, 25 effects, the header, the verse drawing and every tutor-asking callback |
| `src/data/repositories/index.ts` | 35 | 80 | Every new repository function is one more name in a re-export list |
| `src/events/bus.ts` | 28 | 166 | Every new event kind is a member of the `AppEvent` union (36 now) and a type import |
| `src/SettingsScreen.tsx` | 28 | 916 | Every new setting's control component is defined in it |
| `src/data/db.ts` | 26 | 351 | Every new table or index adds a Dexie `version()` block and a typed property |
| `src/data/repositories/settings.ts` | 18 | 330 | One get/set pair per setting (45 exported functions) |
| `src/App.tsx` | 18 | 83 | A route per screen, and the startup effects |
| `src/services/talk.ts` | 17 | 285 | Every "Ask the tutor about X" adds a focus type, a question builder and request fields |
| `src/nav/route.ts` | 17 | 212 | Every address form (verse, passage, paradigm, screen) |
| `src/Talk.tsx` | 17 | 446 | Every kind of answer card (changes, added words, study way, links) |
| `src/settings/registry.ts` | 15 | 592 | Every talkable setting is an entry, and its read/write/publish code |
| `src/WordSheet.tsx` | 15 | 397 | Every fact or action on a word |
| `src/ReadCheck.tsx` | 15 | 420 | The reading check's walk, result, playback and download |
| `src/useTalk.ts` | 12 | 125 | The talk's message flow and the answer's side effects |
| `src/WordsScreen.tsx` | 11 | 153 | The Words list |

Files changed together (commits that touched both, from the same log): `src/events/bus.ts` with `src/data/repositories/index.ts` in 15 commits, with `src/data/repositories/settings.ts` in 11, with `src/settings/registry.ts` in 8; `src/data/repositories/index.ts` with `src/settings/registry.ts` in 11 and with `src/SettingsScreen.tsx` in 9; `src/Reader.tsx` with `src/nav/route.ts`, `src/Talk.tsx`, `src/Ask.tsx` and `src/App.tsx` in 8 each, and with `src/SettingsScreen.tsx` and `src/ReadCheck.tsx` in 7 each. Read the first group as one cluster: a new setting edits `src/events/bus.ts`, `src/data/repositories/settings.ts`, `src/data/repositories/index.ts`, `src/settings/registry.ts` and `src/SettingsScreen.tsx` (and runs `npm run grind:build`). Five of the fifteen hot files are that one chore; two stories adding two settings cannot run in parallel today.

Files at or past the rule's ~500-line trigger: `src/Reader.tsx` (1009), `src/SettingsScreen.tsx` (916), `src/settings/registry.ts` (592). Close behind: `src/data/grammar-concepts.ts` (473, data only), `src/Talk.tsx` (446), `src/services/listen.ts` (435), `src/data/grammar/questions.ts` (425), `src/ReadCheck.tsx` (420).

## 3. Proposed refactors

Ranked by how much parallel work each frees. All are "no behaviour change": the existing unit, feature and e2e tests are the specification and must pass unchanged. Sizes: "one story" fits one Builder session; "n stories" says how to cut it, each landing green.

### R1. Split `src/Reader.tsx` into a reader module

Frees: every Reader feature (48 commits so far, the largest collision), and the stories that sit beside it (verse view, quiz, read aloud, tutor asks).

Responsibility to carve out: Reader.tsx does five jobs: (a) drawing verses and words (`Tap`, `SuppliedText`, `VerseText`, `VerseNumber`, `VerseLine`, `ParagraphView`, `SectionHeading`, `PassageText`: lines 87 to 400, about 320 lines, pure drawing); (b) reading the Reader's settings (nine `useLiveQuery` calls) and publishing them on the bus; (c) wiring the tutor: `holdTalk`, `helpWithWord`, `askAboutTerm`, `askAboutNewWord`, `openQuiz` and the meeting with a `reader-requested` request, where `helpWithWord`, `askAboutTerm` and `askAboutNewWord` are the same dozen lines with a different question builder; (d) the header and strips; (e) scroll and reading-position effects.

New module and API:

```ts
// src/reader/VerseText.tsx — moved as is from src/Reader.tsx (a)
export interface VerseTextProps { verse: Verse; view: ReaderView; woven: Woven; onLook: (lookup: Lookup) => void }
export function VerseText(props: VerseTextProps): ReactElement;
export interface ChapterTextProps { blocks: Block[]; view: ReaderView; wovenOf: (verse: Verse) => Woven; selected: number | null; reading: ReadingState; onSelect: (n: number) => void; onPlay: (n: number) => void; onLook: (lookup: Lookup) => void; talk: VerseTalk }
export function ChapterText(props: ChapterTextProps): ReactElement;

// src/reader/useReaderSettings.ts — (b)
export interface ReaderSettings { view: ReaderView; weave: Weave; weaveGrammar: WeaveGrammar; layout: ReadingLayout; headings: SectionHeadings; readSpan: ReadSpan; solid: ReadonlySet<string>; learning: ReadonlySet<string>; levels: ReadonlyMap<string, GrammarLevel> }
export function useReaderSettings(): ReaderSettings | undefined; // undefined until every value has loaded

// src/reader/useReaderTutor.ts — (c); one helper replaces the three near-identical callbacks
export interface ReaderTutor {
  talkScope: TalkScope | null;
  helpWithWord(help: WordHelp): void;
  askAboutTerm(ask: TermAsk): void;
  askAboutNewWord(ask: NewWordAsk): void;
  openQuiz(): void;
  holdTalk(about: number | null): void;
}
export function useReaderTutor(open: OpenChapter, chapter: Chapter | null, talk: UseTalk, voice: Voice): ReaderTutor;

// src/reader/ReaderHeader.tsx — (d)
export function ReaderHeader(props: { title: string; view: ReaderView | undefined; chapterReading: boolean; reading: ReadingState; from: number | null; canRead: boolean; inert: boolean; onPick(): void; onRead(): void }): ReactElement; // as built in R1c: reading, from and canRead feed the Play button

// built in R1c to bring Reader.tsx under 450 lines: useChapter (the fetch), useWoven (the weave), useReadFrom (plan, readFrom, listenTo), ChapterFailed, LinkNotice, steps.ts (the Verse view's arrows)
```

Files it touches: `src/Reader.tsx` (shrinks to the composition, about 350 lines, still exporting `Reader()`), new files under src/reader/. No other file imports from `src/Reader.tsx` except `src/App.tsx`, so no caller changes.

Risk: medium. The effects share refs (`main`, `wantView`, `wantWeave`, `sayAbout`); (c) must receive them as arguments, not copy them. The e2e specs under `tests/e2e/` that scroll and the `features/` steps that render `Reader` are the safety net.

**Size:** three stories, in this order, each landing green: R1a move (a) as is (pure cut and paste, no logic); R1b extract (c) with the three callbacks folded into one; R1c extract (b) and (d). R1a can run beside any story that does not edit the drawing code.

### R2. Declare a setting once

Frees: every story that adds a setting. Today a setting is spread over five modules and two tests.

Responsibility to carve out: a setting's key, default, parser, section, hint, help, dependency and bus event, written once and read by the store, the registry, the grind text and the Settings screen.

New module and API (extends `src/settings/`):

```ts
// src/settings/define.ts
export interface SettingDef<T extends SettingValue> {
  key: string;
  default: T;
  parse(raw: unknown): T;            // the saved value, or the default when it is not one of the allowed values
  allowed: Allowed;                  // as src/settings/registry.ts Allowed today
  section: SectionId; label: string; hint: string; help?: string; dependsOn?: Dependency;
}
export function defineSetting<T extends SettingValue>(def: SettingDef<T>): SettingDef<T>;

// src/settings/store.ts — replaces the 45 get/set functions of src/data/repositories/settings.ts
export function getSetting<T extends SettingValue>(def: SettingDef<T>): Promise<T>;
export function setSetting<T extends SettingValue>(def: SettingDef<T>, value: T): Promise<void>; // saves, then publishes { kind: 'setting-changed', key, value }
export function useSetting<T extends SettingValue>(def: SettingDef<T>): T | undefined;

// src/settings/definitions/<key>.ts — one file per setting, listed by one line in src/settings/definitions/index.ts
```

A new setting then adds one definition file and one `CONTROLS` entry (R3 makes that its own file too); `SETTINGS` and `ROWS` are derived from the definitions list; `src/events/bus.ts` gets one generic `setting-changed` kind instead of one kind per setting.

Files it touches: `src/settings/registry.ts`, `src/settings/rows.ts`, `src/data/repositories/settings.ts`, `src/data/repositories/index.ts`, `src/events/bus.ts`, `docs/events.md`, `src/appearance/appearanceSync.ts` and `src/speech/settingsSync.ts` (they listen to per-setting events), and every caller of a `getX`/`setX` pair.

Risk: high for the bus change (twenty files import the bus and several listen to per-setting kinds; `tests/unit/bus.test.ts` lists every kind) and for `npm run grind:build` output, which must come out byte-identical (`tests/unit/bible-talk-grind.test.ts` guards it). The old `getX`/`setX` names stay as one-line wrappers over the new store until their callers move, so the migration can be batched.

**Size:** does not fit one story. R2a: define.ts and store.ts plus migrating three settings as a pilot (theme, weave, tips); R2b to R2d: the rest in batches of about eight, each batch deleting its old pairs and bus kinds; R2e: remove the wrappers. R2a must land before R2b, but R2b to R2d touch disjoint settings and can run in parallel.

### R3. Move the Settings controls out of `src/SettingsScreen.tsx`

Frees: every story that adds or changes a Settings control; also lets a story that changes one control run beside one that changes another.

Responsibility to carve out: the controls themselves. `src/SettingsScreen.tsx` already has the right shape: a `CONTROLS` map from a row key to a component (line 837) and about 40 small components and controls above it. It needs only to be cut by section.

New module and API:

```ts
// src/settings/controls/types.ts
export type Control = (props: { row: SettingsRow }) => ReactElement | null;
// src/settings/controls/index.ts
export const CONTROLS: Readonly<Record<string, Control>>;   // built from the section files below, plus the resource.* / link.* / script depth spreads
// one file per section, each exporting the controls of its rows:
//   appearance.tsx (theme, text size, layout, headings), weave.tsx, newWords.tsx, goal.tsx (GoalPickers),
//   approach.tsx (ApproachPicker, CreditLine, AskApproach), voice.tsx (VoicePicker, SpeedSlider, PronunciationList),
//   resources.tsx (ResourceRow, LogosBiblePicker, ChoiceList), tutor.tsx (tips, readTutor, script depth), developer.tsx
// src/settings/controls/SettingRow.tsx — SettingRow, Section, MoreHelp, ChipRow, OnOff (shared pieces)
```

Files it touches: `src/SettingsScreen.tsx` (shrinks to the search field, the section loop and `ROWS`, about 120 lines), new files under src/settings/controls/. `tests/unit/settings-rows.test.tsx` keeps passing: it asks the screen to draw every row.

Risk: low; it is a cut along existing function boundaries with no logic change.

**Size:** one story. It is independent of R2 (R2 changes how the row and its value are declared; R3 where its control lives) and can land first.

### R4. One grist client with a default key, and one in-flight tracker

Frees: every story that adds a tutor feature (a new question kind, a new grind). Today each repeats the licence key, the abort handling, the sending/waiting/failed state and the error mapping.

Responsibility to carve out: calling a grind and tracking it while it is in flight.

Evidence: `getDeviceKeyBytes()` is called from five places (`src/useTalk.ts`, `src/useAsks.ts`, `src/useReadChecks.ts`, `src/AskApproachSheet.tsx`, `src/tips/offer.ts`); `src/useAsks.ts` and `src/useReadChecks.ts` carry the same `try { ... onSent: set waiting ... } catch { TutorError -> failure }` block; `src/useTalk.ts` has a third copy; the `AskState` type lives in `src/useAsks.ts` and `src/Talk.tsx`, `src/Ask.tsx` and `src/useTalk.ts` import it from there. `askGrind` lives in `src/services/tutor.ts` next to the verse-ask request, though it is the client for every grind kind.

New module and API:

```ts
// src/grind/client.ts — askGrind, GrindError (was TutorError), FAILURE_TITLES, tutorTimings move here
export interface GrindOptions { key?: Uint8Array /* default: the device key */; signal?: AbortSignal; onSent?: () => void; files?: Blob[] }
export function askGrind<Answer>(kind: string, request: object, isAnswer: (value: unknown) => value is Answer, options?: GrindOptions): Promise<Answer>;

// src/grind/useGrind.ts — the sending / waiting / failed state, keyed by whatever the caller keys on
export type GrindState = { phase: 'sending' | 'waiting'; startedAt: number } | { phase: 'failed'; failure: GrindFailure; detail: string };
export interface GrindTracker<Key extends string> {
  states: Readonly<Record<Key, GrindState | undefined>>;
  run<Answer>(key: Key, send: (o: { signal: AbortSignal; onSent: () => void }) => Promise<Answer>, onAnswer: (a: Answer) => Promise<void>): void;
}
export function useGrindTracker<Key extends string>(): GrindTracker<Key>; // aborts all on unmount
```

Files it touches: `src/services/tutor.ts` (keeps `buildRequest`, `askTutor`, `isVerseAnswer`, and re-exports the moved names until callers move), `src/services/talk.ts`, `src/services/reading.ts`, `src/services/feedback.ts`, `src/useAsks.ts`, `src/useTalk.ts`, `src/useReadChecks.ts`, `src/AskApproachSheet.tsx`, `src/tips/offer.ts`, and the tests that import `TutorError`.

Risk: medium. The three hooks differ in small ways (the reading check also keeps a `tap` and a `short` phase and a recording for Retry; the talk keeps history), so the tracker must carry only the common part and let each hook add its own phases.

**Size:** two stories. R4a: src/grind/client.ts with the default key (pure move plus one default; callers may stop passing a key); R4b: `useGrindTracker`, adopted by `src/useAsks.ts` first, then `src/useTalk.ts` and `src/useReadChecks.ts` in a story each.

### R5. Talk topics as plug-ins: `src/services/talk.ts` and `src/Talk.tsx` by topic

Frees: every "Ask the tutor about X" story (word, grammar term, paradigm, quiz, new word, screen, Hebrew) and every new answer card.

Responsibility to carve out: what a topic is (its focus, its first question) and what an answer card is. Today the focus union (`WordFocus | TermFocus | ParadigmFocus | QuizFocus`, `src/services/talk.ts` line 107), the question builders (`helpQuestion`, `termQuestion`, `paradigmQuestion`, `quizQuestion`, `newWordQuestion`, `quizMeQuestion`) and the request fields are all in one file, and the answer cards (`ChangeRow`, `AddWord`, `WordsLine`, `StudyWayProposal`, `TutorLinks`) are all inside `src/Talk.tsx`'s `Turn`.

New module and API:

```ts
// src/talk/topic.ts
export interface TalkTopic<Focus extends { kind: string }> {
  kind: Focus['kind'];
  question(focus: Focus, reference: string): string;
  isFocus(value: unknown): value is Focus;
}
export const TOPICS: readonly TalkTopic<TalkFocus>[]; // one line per topic file in src/talk/topics/

// src/talk/cards.ts — an answer card is a component that decides itself whether it has anything to show
export interface AnswerCard { id: string; show(turn: TalkTurn): boolean; Card: (props: { turn: TalkTurn; scope: TalkScope }) => ReactElement }
export const CARDS: readonly AnswerCard[]; // changes, added words, study way, links
```

Files it touches: `src/services/talk.ts` (keeps the request, answer, scope and `askTalk`), `src/Talk.tsx` (keeps `TalkSheet`, `TalkBar`, `Turn` as a loop over `CARDS`), `src/useTalk.ts`, `grinds/bible-talk.input.schema.json` unchanged, new files under src/talk/. Callers in `src/Reader.tsx`, `src/QuizScreen.tsx`, `src/ParadigmsScreen.tsx` import the same names from the same place via re-exports.

Risk: medium; `tests/unit` greps the grind's text and the request fields (`REQUEST_FIELDS` in `features/steps/quiz-me.steps.tsx`), which must stay equal. 

**Size:** two stories: R5a topics out of `src/services/talk.ts`; R5b cards out of `src/Talk.tsx`. They touch different files and can run in parallel.

### R6. One entry file per repository, not one name per function

Frees: every story that adds a repository function or a table (35 and 26 commits on `src/data/repositories/index.ts` and `src/data/db.ts`).

Responsibility to carve out: the barrel's list of names. A repository file already exports its own API; the barrel lists each function again, so every addition edits the same file.

New module and API:

```ts
// src/data/repositories/index.ts becomes one line per repository file
export * from './words';
export * from './reviews';
export * from './talks';
// ... (one line per repository, 15). A repository file exports only its public API; helpers are not exported.
```

and the Dexie versions move out of `src/data/db.ts` into src/data/schema/v11.ts, v12.ts, v13.ts and so on, each exporting its `stores` map and its `upgrade` step; `src/data/db.ts` imports the list `SCHEMA_VERSIONS` and loops. A table story then adds one schema file and one line in the list, and the typed property in `src/data/db.ts`.

Files it touches: `src/data/repositories/index.ts` and the fifteen repository files (to make exports match what the barrel exposed), `src/data/db.ts`, `tests/unit/db.test.ts`.

Risk: low to medium; `export *` can leak helpers, so each file's exports are checked against the barrel's current list by a unit test. The Dexie rule (never edit an old `version()`) is kept because each old version's file is moved verbatim and then not touched.

**Size:** two stories: R6a the barrel; R6b the schema files. Independent.

### R7. A speech engine that is not named for Greek

Frees: a new spoken language and any speech story. `src/speech/greek.ts` (249 lines) is the engine for every language: `speak(text, key, onFail, language)` serves English, Greek and Hebrew, and it holds the voices, the rates and the Greek pronunciation. A new language needs edits in `src/speech/languages.ts`, `src/speech/greek.ts` (a `lang` lookup with a Hebrew special case) and `src/script/hebrewSpeech.ts`.

New module and API:

```ts
// src/speech/synth.ts — greek.ts renamed, with Greek's pronunciation moved behind the language registry
export interface SpokenLanguage { id: string; label: string; lang: () => string /* BCP 47 tag, e.g. from the chosen pronunciation */; settable: boolean }
export function speak(text: string, key: string, onFail?: () => void, language?: string): SpeakOutcome;
export function speakWord(text: string, language: string, slow?: boolean): boolean;
export function hasVoice(language: string): boolean | 'unknown';
```

`SpeechLanguage` (today the closed union `'english' | 'greek' | 'hebrew'` in `src/speech/languages.ts`) becomes a registry lookup; `src/speech/greek.ts` stays as a one-line re-export so imports can move in batches.

Files it touches: `src/speech/greek.ts`, `src/speech/languages.ts`, `src/script/hebrewSpeech.ts`, `src/speech/readAloud.ts`, `src/speech/SpeakButton.tsx`, and the 22 places in the screens that pass `'greek'`.

Risk: medium (speech is hard to test; the recording fake `tests/support/fake-speech.ts` and the features under `features/steps/greek-audio.steps.tsx` cover it).

**Size:** two stories: R7a rename and re-export; R7b the language registry replaces the union.

## 4. Rule breaks

Where a module breaks a rule of the vault's "Modular Boundaries" (27) page. Each is a fact at the base commit.

1. **A screen file every feature edits** (rule: draw boundaries so two stories can change two modules at once). `src/Reader.tsx` 1009 lines, `src/SettingsScreen.tsx` 916, `src/settings/registry.ts` 592: past the ~500-line trigger. Third-story-in-a-row signals are in section 2. Fix: R1, R3, R2.
2. **A setting is not one thing** (rule: a feature is mostly a new file plugged into a seam). A new setting edits five hot files (section 2). Fix: R2.
3. **Screens and hooks handle the licence key** (rule: the gate behind one call; AI behind one client). `src/useTalk.ts`, `src/useAsks.ts`, `src/useReadChecks.ts`, `src/AskApproachSheet.tsx` call `getDeviceKeyBytes()` and pass the key to the client; the grind name and the request live in a service but the key and the failure mapping live in the screen. Fix: R4.
4. **Duplicates of bsv-kit code** (rule: look in bsv-kit first; never a local copy). `src/services/listen.ts` is a trimmed port of Postern's listen.ts, and bsv-kit now has packages/composer/src/listen.ts (572 lines). `src/audio/recorder.ts`, `src/ui/holdPress.ts` and `src/ui/HoldBar.tsx` have counterparts there (recorder.ts, useHold.ts, HoldToTalkBar.tsx). Lampas pins bsv-kit at 1422ec3, which predates the composer, so the move needs a re-pin first. See L1 in section 5.
5. **Byte-identical copies of another app's files.** `src/precacheGuard.ts`, `src/services/appUpdate.ts`, `src/ui/scrollGuard.ts`, `src/ui/focus.ts` and `build-version.ts` are identical to Postern's (`diff` prints nothing); trade-tracker's src/services/app-update.ts is a variant of the same file. Rule: common code once, in a shared library. See L2.
6. **A constant language** (rule: language, book, voice and model are data or settings). `src/speech/greek.ts` is named for one language and serves three; `SpeechLanguage` is a closed union (`'english' | 'greek' | 'hebrew'`) in `src/speech/languages.ts`; 22 lines in screen files and 8 lines in other TypeScript files outside speech and settings pass the literal `'greek'`; `src/useVoice.ts` line 69 passes `lang: 'en-US'` directly. Several files default the book with `?? 'rom'` (`src/nav/route.ts`, `src/Reader.tsx`, `src/data/quiz.ts`, `src/DrillScreen.tsx`) and `src/data/readerChapter.ts` has `DEFAULT_CHAPTER` Romans 8; the Reader's default chapter is a product choice, but the scattered `'rom'` is a constant book. Fix: R7 for speech; book defaults should come from one `DEFAULT_CHAPTER` import (a small story, not in the ranked list).
7. **Owner data in the build** (rule: keep the owner's own data out of the code). `src/config.ts` holds the Governor's issuer key as `DEFAULT_ISSUER` (overridable by `VITE_LAMPAS_ISSUER`), his Postern address `POSTERN_DOOR` and his host `LINK_ORIGIN`; `src/data/seed-words.ts` is generated from his own word list (`docs/example-words.md`, public as an example). All are public by design today, but a library or another deployment must not inherit them: they are the app's configuration, kept in `src/config.ts` and nowhere else, which holds. Noted, no fix proposed.
8. **A vendor reached from a screen:** none found. `speechSynthesis` and `SpeechRecognition` appear only in `src/speech/greek.ts` and `src/services/listen.ts`; `MediaRecorder` only in `src/audio/recorder.ts`; bsv-kit only in `src/services/`, `src/config.ts` and `src/tips/` (`src/tips/hints.ts` and `src/tips/HintCard.tsx` import the tips entry point of bsv-kit, which has no screen code); `fetch` only in `src/data/chapter.ts`, `src/data/lexicon.ts`, `src/data/frequency.ts` and `src/precacheGuard.ts`; Dexie tables only in `src/data/repositories/` (screens use `useLiveQuery` with repository functions). The seams hold; the weakness is the width of the files, not the direction of the imports.
9. **Cycles between modules** (rule: modules tell each other things on the bus, not by importing each other's state). `src/data/repositories/` and `src/speech/`, `src/settings/`, `src/appearance/` import each other (section 1). They are default and type imports; moving each setting's default into its definition (R2) removes most of them.
10. **Three persistence styles for the same kind of thing.** Small state lives in Dexie (`src/data/repositories/settings.ts`), in localStorage keepers (`src/data/roundKeep.ts`, `src/data/drillKeep.ts`, `src/data/placementKeep.ts`, `src/nav/lastRoute.ts`, `src/tips/hints.ts`) and in the settings table as JSON (the study way's list). Not a boundary break, but a story that adds "keep this" has three patterns to choose from. Proposal for a later pass: one src/data/keep.ts (`keepJson<T>(key, parse)` returning `{ get, set, clear }`) used by the localStorage keepers.

## 5. Library candidates

Rules used: the second copy is the signal, but a plainly shareable piece is lifted now (library best practices 01); a library is a public repo, nothing personal, semver from 0.1.0 with a CHANGELOG, tests in CI, an MIT licence (01, 03, 04, 07, 09); pin by tag once there is one, by full SHA until then; the app deletes its copy in the same story that adopts the library (08). Checked on 2026-10-09: bsv-kit has no git tag, so any adoption below pins by SHA until it cuts one, and every bsv-kit change in this section needs the tag first.

**L1. Push-to-talk, recording and the hold bar: already in bsv-kit, adopt it.** bsv-kit has a fourth package, composer (commit bec7dd5 and after; package @bsv-kit/composer 0.1.0, CHANGELOG present), lifted from Postern. It holds `startListening`, `useHold`, `HoldToTalkBar`, `VoiceRecorder` and `micInput`. Lampas's `src/services/listen.ts` (435 lines), `src/audio/recorder.ts` (115), `src/ui/holdPress.ts` (110) and `src/ui/HoldBar.tsx` (67) are the copies. Library: the existing bsv-kit/composer entry point; its public API (as exported today) is `startListening(options): ListenSession`, `useHold(options)`, `HoldToTalkBar(props)`, `VoiceRecorder`, `canRecord()`, `pickMime()`. Versioning: Lampas must re-pin from 1422ec3 to a SHA at or after bec7dd5 (the lift; the newest on the Laptop's checkout is 5d07d09); the story states that, bumps `allowScripts` and the lockfile's integrity in the same commit (library best practices 04), and adds a contract test that a hold of 500 ms starts the recogniser and a slide-off drops it. What does not move: Lampas's 60 s cap and `recorderSeam` are app policy and stay as a thin wrapper. Size: one story per file pair, listen first. Check the API differences before deleting (Lampas's `ReadingRecorder` has `HoldRecorder`; composer's is `VoiceRecorder`).

**L2. A PWA shell library (NEW public repo, proposed name pwa-kit).** Code that is already byte-identical in two apps and near-identical in a third: `src/precacheGuard.ts` (65 lines, identical to Postern's), `src/services/appUpdate.ts` (146, identical to Postern's; trade-tracker's src/services/app-update.ts is the same idea, 146 lines, 88 lines of diff), `src/ui/scrollGuard.ts` (identical), `src/ui/focus.ts` (identical), `build-version.ts` (identical), and `src/speech/wakeLock.ts` (Postern's wakeLock.ts differs by about 90 lines). Proposed entry points and API:

```ts
// pwa-kit/update
export function startAppUpdates(deps: { container: UpdateContainer; registration: UpdateRegistration; reload: () => void }): AppUpdates;
export function useUpdateState(): 'none' | 'ready' | 'updating';
export function applyUpdate(): void;
// pwa-kit/precache
export function isGuardedAsset(pathname: string): boolean;
export function healPrecache(storage: CacheStorage): Promise<void>;
export function serveAsset(request: Request, storage: CacheStorage): Promise<Response>;
// pwa-kit/scroll
export function installScrollGuard(): () => void;
export function focusQuietly(el: HTMLElement | null | undefined): void;
// pwa-kit/build — node side, for vite.config
export function buildVersion(version: string, when: Date, commit: string): string;
```

Versioning: start at 0.1.0 with a CHANGELOG; the service-worker contract (`SKIP_WAITING` message, the cache names) is a wire format between a page and its worker, so a change to it is a breaking change called out in the CHANGELOG with the migration, and the library keeps the old message for one minor version (library best practices 05). A smoke test installs the library into a scratch consumer. Order: lift from Postern (the app with the oldest copy), then move Lampas, then trade-tracker, one story per app, each deleting its copy.

**L3. A speech wrapper (NEW public package; could be a second entry point of pwa-kit, or its own repo, speech-kit).** Three apps wrap `speechSynthesis`: Lampas `src/speech/greek.ts`, Postern src/services/speech.ts, SpellForge src/audio/speech.ts (found by grep on 2026-10-09; their APIs were not compared, so the lift starts with a comparison). Lampas's piece to lift is the engine in R7, not the Greek pronunciation schemes. Proposed API: `speak(text, key, onFail, language)`, `speakWord(text, language, slow)`, `hasVoice(language)`, `warmVoices()`, `setVoice(language, voiceURI)`, `setSpeechRate(language, rate)`, `useVoices()`, with the language registry an argument (no Greek built in). Versioning: 0.1.0; a language added to the registry is a minor change, a changed `speak` signature is breaking. Do R7 first: the lift of a Greek-named, three-language file is wrong; lift the language-neutral one.

**L4. Markdown for answers and for speech (NEW, or an entry point of an existing UI library).** Postern has src/markdown/plain.ts (49 lines) and src/markdown/Markdown.tsx (77); Lampas has `src/markdown/plain.ts` (52) and `src/markdown/Markdown.tsx` (38). They have drifted (60 and 101 lines of diff), which is the signal that it should be one thing. Proposed API: `markdownToSpeech(text): string` and `Markdown({ text, plugins })` with the remark plugins (Lampas's `src/markdown/scriptRuns.ts` for Hebrew) passed in. Versioning: 0.1.0; the drifted behaviour is reconciled in the CHANGELOG as the first release's notes, because the two apps do not read the same way today. Lowest priority of the four: lift when a third app wants it.

**Kept in Lampas, on purpose** (rule: the library is for code a second app has or will need; nothing else has these): the back-off schedule `src/data/schedule.ts` (no other app has spaced repetition, checked by grep in Postern, SpellForge and trade-tracker), the weave, the grammar ladder and everything in `src/data/grammar/`, the pronunciation schemes, `src/images/shrink.ts` (no other app shrinks a picture), and the licence gate `src/gate/` (a thin layer over bsv-kit/bsv; another app's gate has different screens). Revisit when a second app asks.
