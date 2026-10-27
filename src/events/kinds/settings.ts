// src/events/kinds/settings.ts — the event kinds of settings and appearance. bus.ts composes AppEvent from every kinds file; docs/events.md lists each kind.
import type { Immersive, ReaderView, ReadingLayout, ReadTutor, SectionHeadings, Tips, Weave, WeaveGrammar } from '../../data/repositories';
import type { Depth, TutorScript } from '../../script/scripts';
import type { PlayTo } from '../../speech/readSpan';
import type { Theme } from '../../appearance/themes';
import type { SettableLanguage, SpeechRates } from '../../speech/languages';
import type { GreekPronunciation } from '../../speech/pronunciation';
import type { SettingValue } from '../../settings/define';
import type { Goal } from '../../data/goal';

export type SettingsEvent =
  /** a setting declared once (src/settings/definitions/) now holds `value`: saved by src/settings/store.ts setSetting, or told once at
   * start by whoever loads it; read it with src/settings/store.ts onSetting / toldSetting, which parse it */
  | { kind: 'setting-changed'; key: string; value: SettingValue }
  | { kind: 'view-changed'; view: ReaderView }
  /** kept for the pilot (docs/module-map.md R2a): the registry still publishes it after setting-changed; listen to setting-changed */
  | { kind: 'weave-changed'; weave: Weave }
  /** the Weave's grammar dial: which forms of the woven words keep their Greek (Any | Solid | Solid and frontier) */
  | { kind: 'weave-grammar-changed'; grammar: WeaveGrammar }
  | { kind: 'layout-changed'; layout: ReadingLayout }
  | { kind: 'headings-changed'; headings: SectionHeadings }
  /** the Immersive reader choice: whether the Reader's top and Talk bar slide away while he reads */
  | { kind: 'immersive-changed'; immersive: Immersive }
  /** Play to: how far the header's Play goes (the end of the book or of the Bible) */
  | { kind: 'read-span-changed'; span: PlayTo }
  /** Read the tutor's responses aloud: whether a verdict or an answer is spoken the moment it arrives */
  | { kind: 'read-tutor-changed'; readTutor: ReadTutor }
  /** how deep into a language the tutor goes (Settings > Hebrew in the tutor): `script` is the language tag, 'he' */
  | { kind: 'script-depth-changed'; script: TutorScript['id']; depth: Depth }
  /** the Tips choice: whether the phone may send for a tip and show its card (kept for the pilot, as weave-changed) */
  | { kind: 'tips-changed'; tips: Tips }
  /** the voices he chose in Settings, one per language of src/speech/languages.ts, as the phone's voiceURI; null is the phone's default */
  | { kind: 'voices-changed'; voices: Record<SettableLanguage, string | null> }
  | { kind: 'pronunciation-changed'; pronunciation: GreekPronunciation }
  /** the Theme he chose in Settings (kept for the pilot, as weave-changed) */
  | { kind: 'theme-changed'; theme: Theme }
  /** the Text size he chose, as a percent of the phone's own (85 to 160) */
  | { kind: 'text-size-changed'; percent: number }
  /** how fast each language is spoken, 0.5 to 1.5, 1 normal */
  | { kind: 'rates-changed'; rates: SpeechRates }
  /** the reading goal he set in Settings or asked the tutor for; `goal` is null when he cleared it */
  | { kind: 'goal-changed'; goal: Goal | null }
  /** the grammar approach he chose in Settings or asked the tutor for; `approach` is its id in src/approaches/ */
  | { kind: 'approach-changed'; approach: string };
