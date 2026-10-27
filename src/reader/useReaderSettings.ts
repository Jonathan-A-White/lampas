// src/reader/useReaderSettings.ts — what the Reader reads from the settings (docs/module-map.md R1, part b): the view, the weave, its grammar
// dial and its order, the layout, the section headings, the read-aloud span, his solid and learning lemmas and the grammar levels, each a live query, so a change
// made in Settings or by the tutor reaches the open Reader. The value is undefined until every one has loaded, as the Reader waits today.
// The hook also tells the bus (docs/events.md): view-changed, the weave (announceSetting), layout-changed and headings-changed, each once its value
// is here and again when it changes. The address the Reader opened on wins over the saved view and weave at first (a reopen, Back to an earlier
// place): the settings follow the address, then the address follows the settings. The weave is switched in Settings, so a Reader reached by Back
// from there must not put an older address's weave back: once the bus has told a weave, the saved setting is the truth, and so it is when the page was loaded on another screen
// (Settings, reloaded there) and the Reader is reached by Back to an entry written before he chose the weave (mw-5r3p30.658).
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { GREEK_VIEW_FROM, GREEK_WEAVE_FROM, viewAt, weaveAt, type GreekLevel } from '../settings/definitions/greekInterest';
import { levelOf, type InterestLang } from '../settings/definitions/interest';
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

/** The Reader's settings for a chapter in `source`, or undefined until every value has loaded. */
export function useReaderSettings(source: InterestLang = 'grc'): ReaderSettings | undefined {
  // the dial of the chapter's language (mw-3ased2.2, mw-gdcyf98.3): what it hides does not act, whatever is saved or an address asks for
  const dials = useInterestLevels();
  const level = dials && levelOf(source, dials);
  const savedView = useLiveQuery(getReaderView, []);
  const savedWeave = useLiveQuery(getWeave, []);
  const view = savedView && level !== undefined ? viewAt(level, savedView) : undefined;
  const weave = savedWeave && level !== undefined ? weaveAt(level, savedWeave) : undefined;
  const weaveGrammar = useLiveQuery(getWeaveGrammar, []);
  const weaveOrder = useSetting(weaveOrderSetting);
  const plainUnder = useLiveQuery(getPlainEnglishUnder, []);
  const levels = useLiveQuery(listLevels, []);
  const solid = useLiveQuery(listSolidLemmas, []);
  const learning = useLiveQuery(listLearningLemmas, []);
  const layout = useLiveQuery(getLayout, []);
  const headings = useLiveQuery(getSectionHeadings, []);
  const readSpan = useLiveQuery(getReadSpan, []);
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
    if (layout) publish({ kind: 'layout-changed', layout });
  }, [layout]);
  useEffect(() => {
    if (headings) publish({ kind: 'headings-changed', headings });
  }, [headings]);
  return useMemo(
    () =>
      level !== undefined && view && weave && weaveGrammar && weaveOrder && plainUnder !== undefined && levels && solid && learning && layout && headings && readSpan
        ? { level, view, weave, weaveGrammar, weaveOrder, weaveShown: weave !== 'off' && plainUnder !== weave, layout, headings, readSpan, solid, learning, levels }
        : undefined,
    [level, view, weave, weaveGrammar, weaveOrder, plainUnder, levels, solid, learning, layout, headings, readSpan],
  );
}
