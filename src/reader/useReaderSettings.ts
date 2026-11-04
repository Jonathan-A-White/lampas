// src/reader/useReaderSettings.ts — what the Reader reads from the settings (docs/module-map.md R1, part b): the view, the weave, its grammar
// dial and its order, the layout, the section headings, the read-aloud span, his solid and learning lemmas and the grammar levels, each a live query, so a change
// made in Settings or by the tutor reaches the open Reader. The value is undefined until every one has loaded, as the Reader waits today.
// The hook also tells the bus (docs/events.md): view-changed, the weave (announceSetting), layout-changed and headings-changed, each once its value
// is here and again when it changes. The address the Reader opened on wins over the saved view and weave at first (a reopen, Back to an earlier
// place): the settings follow the address, then the address follows the settings. The weave is switched in Settings, so a Reader reached by Back
// from there must not put an older address's weave back: once the bus has told a weave, the saved setting is the truth, and so it is when the page was loaded on another screen
// (Settings, reloaded there) and the Reader is reached by Back to an entry written before he chose the weave (mw-5r3p30.658).
// A database that has not answered by chapterWait.settingMs (an older Lampas tab holds it) does not block the chapter (mw-5r3p30.1042): the value is then the setting's default, drawn but never
// saved and never told to the bus (the effects below act only on a value that was read), and the saved value replaces it when it comes.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { chapterWait } from '../data/chapterWait';
import {
  getLayout,
  getPlainEnglishUnder,
  getReadSpan,
  getReaderView,
  getSectionHeadings,
  getWeave,
  getWeaveGrammar,
  listLearningLemmas,
  listLevels,
  listSolidLemmas,
  setReaderView,
  setWeave,
  type GrammarLevel,
  type PlayTo,
  type ReadingLayout,
  type ReaderView,
  type SectionHeadings,
  type Weave,
  type WeaveGrammar,
} from '../data/repositories';
import { latestSetting, publish } from '../events/bus';
import { openedOnReader, readerOf, routeOf } from '../nav/route';
import { weaveOrderSetting, weaveSetting } from '../settings/definitions';
import type { WeaveOrder } from '../settings/definitions/weaveOrder';
import { GREEK_VIEW_FROM, GREEK_WEAVE_FROM, greekLevelOf, viewAt, weaveAt, type GreekLevel } from '../settings/definitions/greekInterest';
import { levelOf, type InterestLang, type InterestLevels } from '../settings/definitions/interest';
import { greekInterestSetting, hebrewInterestSetting } from '../settings/definitions';
import { hebrewLevelOf } from '../settings/definitions/hebrewInterest';
import { DEFAULT_LAYOUT } from '../layout/layouts';
import { playToOf } from '../speech/readSpan';
import { announceSetting, toldSetting, useSetting } from '../settings/store';
import { useInterestLevels } from '../settings/useInterestLevels';

export interface ReaderSettings {
  /** the step of the dial of the chapter's language (Greek for a New Testament chapter, Hebrew for an Old Testament one, mw-gdcyf98.3), read in the same render as the view, so the English | Greek or English | Hebrew switch is there as soon as the verses are (mw-3ased2.2) */
  level: GreekLevel;
  view: ReaderView;
  weave: Weave;
  weaveGrammar: WeaveGrammar;
  /** the order the woven verse is laid out in (mw-5r3p30.250) */
  weaveOrder: WeaveOrder;
  /** the woven English is shown: the Weave is on and he has not chosen plain English under it (the switch's English | Weave | Greek, mw-5r3p30.651) */
  weaveShown: boolean;
  layout: ReadingLayout;
  headings: SectionHeadings;
  readSpan: PlayTo;
  solid: ReadonlySet<string>;
  learning: ReadonlySet<string>;
  levels: ReadonlyMap<string, GrammarLevel>;
}

export const DEFAULT_DIALS: InterestLevels = { grc: greekLevelOf(greekInterestSetting.default), he: hebrewLevelOf(hebrewInterestSetting.default) };
const DEFAULT_READ_SPAN = playToOf(undefined);
export const NO_LEMMAS: ReadonlySet<string> = new Set();
export const NO_LEVELS: ReadonlyMap<string, GrammarLevel> = new Map();

/** True once the settings database has taken chapterWait.settingMs (from the first draw) without every value of the Reader loading: the defaults are drawn from then on. `loaded` is true once they have. */
export function useSettingsLate(loaded: boolean): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (loaded || late) return;
    const timer = setTimeout(() => setLate(true), chapterWait.settingMs);
    return () => clearTimeout(timer);
  }, [loaded, late]);
  return late;
}

/** The Reader's settings for a chapter in `source`, or undefined until every value has loaded. `source` null is a chapter whose language is not known yet (an Old Testament book, Hebrew or, with the
 * Septuagint On, Greek, until its file has loaded): nothing is settled and no setting acts until it is. */
export function useReaderSettings(source: InterestLang | null = 'grc'): ReaderSettings | undefined {
  // the dial of the chapter's language (mw-3ased2.2, mw-gdcyf98.3): what it hides does not act, whatever is saved or an address asks for
  const savedDials = useInterestLevels();
  const savedView = useLiveQuery(getReaderView, []);
  const savedWeave = useLiveQuery(getWeave, []);
  const savedGrammar = useLiveQuery(getWeaveGrammar, []);
  const savedOrder = useSetting(weaveOrderSetting);
  const savedPlain = useLiveQuery(getPlainEnglishUnder, []);
  const savedLevels = useLiveQuery(listLevels, []);
  const savedSolid = useLiveQuery(listSolidLemmas, []);
  const savedLearning = useLiveQuery(listLearningLemmas, []);
  const savedLayout = useLiveQuery(getLayout, []);
  const savedHeadings = useLiveQuery(getSectionHeadings, []);
  const savedSpan = useLiveQuery(getReadSpan, []);
  const late = useSettingsLate(
    [savedDials, savedView, savedWeave, savedGrammar, savedOrder, savedPlain, savedLevels, savedSolid, savedLearning, savedLayout, savedHeadings, savedSpan].every((value) => value !== undefined),
  );
  // what is drawn: the saved value, or once the database is late its default; the effects below read only the saved ones
  const dials = savedDials ?? (late ? DEFAULT_DIALS : undefined);
  const level = dials && source ? levelOf(source, dials) : undefined;
  const shownView = savedView ?? (late ? 'english' : undefined);
  const shownWeave = savedWeave ?? (late ? 'off' : undefined);
  const view = shownView && level !== undefined ? viewAt(level, shownView) : undefined;
  const weave = shownWeave && level !== undefined ? weaveAt(level, shownWeave) : undefined;
  const weaveGrammar = savedGrammar ?? (late ? 'any' : undefined);
  const weaveOrder = savedOrder ?? (late ? weaveOrderSetting.default : undefined);
  const plainUnder = savedPlain !== undefined ? savedPlain : late ? null : undefined;
  const levels = savedLevels ?? (late ? NO_LEVELS : undefined);
  const solid = savedSolid ?? (late ? NO_LEMMAS : undefined);
  const learning = savedLearning ?? (late ? NO_LEMMAS : undefined);
  const layout = savedLayout ?? (late ? DEFAULT_LAYOUT : undefined);
  const headings = savedHeadings ?? (late ? 'on' : undefined);
  const readSpan = savedSpan ?? (late ? DEFAULT_READ_SPAN : undefined);
  // What the address said when the reader opened: the view and weave to put back in the settings.
  const [opened] = useState(() => readerOf(window.location.hash));
  // the Greek dial can set the view while he is in Settings (Reading in Greek opens the Reader in Greek): it tells the bus, and then the saved view is the truth, as the Weave's is
  const dialSetView = () => latestSetting('readerView') !== undefined;
  const wantView = useRef(dialSetView() ? undefined : opened.view);
  const wantWeave = useRef(toldSetting(weaveSetting) !== undefined || !openedOnReader() ? undefined : opened.weave);
  const viewSettled = useRef(false);
  useEffect(() => {
    if (!view || !savedView || level === undefined) return;
    // Until the saved view has been told to the bus, the address may have moved on since the Reader mounted (a link opened while the app was starting):
    // the view it names now is the one wanted, not the one it named at mount, which readerAddress would otherwise overwrite with the saved one.
    if (!viewSettled.current && !dialSetView() && routeOf(window.location.hash) === 'home') wantView.current = readerOf(window.location.hash).view;
    // an address that names the Greek view is followed only where the dial shows it
    if (wantView.current && level >= GREEK_VIEW_FROM && wantView.current !== savedView) {
      void setReaderView(wantView.current);
      return;
    }
    viewSettled.current = true;
    wantView.current = undefined;
    publish({ kind: 'view-changed', view });
  }, [view, savedView, level]);
  useEffect(() => {
    if (!weave || !savedWeave || level === undefined) return;
    if (wantWeave.current && level >= GREEK_WEAVE_FROM && wantWeave.current !== savedWeave) {
      void setWeave(wantWeave.current);
      return;
    }
    wantWeave.current = undefined;
    announceSetting(weaveSetting, weave);
  }, [weave, savedWeave, level]);
  useEffect(() => {
    if (savedLayout) publish({ kind: 'layout-changed', layout: savedLayout });
  }, [savedLayout]);
  useEffect(() => {
    if (savedHeadings) publish({ kind: 'headings-changed', headings: savedHeadings });
  }, [savedHeadings]);
  return useMemo(
    () =>
      level !== undefined && view && weave && weaveGrammar && weaveOrder && plainUnder !== undefined && levels && solid && learning && layout && headings && readSpan
        ? { level, view, weave, weaveGrammar, weaveOrder, weaveShown: weave !== 'off' && plainUnder !== weave, layout, headings, readSpan, solid, learning, levels }
        : undefined,
    [level, view, weave, weaveGrammar, weaveOrder, plainUnder, levels, solid, learning, layout, headings, readSpan],
  );
}
