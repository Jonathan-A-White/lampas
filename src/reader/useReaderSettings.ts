// src/reader/useReaderSettings.ts — what the Reader reads from the settings (docs/module-map.md R1, part b): the view, the weave and its grammar
// dial, the layout, the section headings, the read-aloud span, his solid and learning lemmas and the grammar levels, each a live query, so a change
// made in Settings or by the tutor reaches the open Reader. The value is undefined until every one has loaded, as the Reader waits today.
// The hook also tells the bus (docs/events.md): view-changed, the weave (announceSetting), layout-changed and headings-changed, each once its value
// is here and again when it changes. The address the Reader opened on wins over the saved view and weave at first (a reopen, Back to an earlier
// place): the settings follow the address, then the address follows the settings. The weave is switched in Settings, so a Reader reached by Back
// from there must not put an older address's weave back: once the bus has told a weave, the saved setting is the truth.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getLayout,
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
  type ReadSpan,
  type ReadingLayout,
  type ReaderView,
  type SectionHeadings,
  type Weave,
  type WeaveGrammar,
} from '../data/repositories';
import { publish } from '../events/bus';
import { readerOf } from '../nav/route';
import { weaveSetting } from '../settings/definitions';
import { announceSetting, toldSetting } from '../settings/store';

export interface ReaderSettings {
  view: ReaderView;
  weave: Weave;
  weaveGrammar: WeaveGrammar;
  layout: ReadingLayout;
  headings: SectionHeadings;
  readSpan: ReadSpan;
  solid: ReadonlySet<string>;
  learning: ReadonlySet<string>;
  levels: ReadonlyMap<string, GrammarLevel>;
}

/** The Reader's settings, or undefined until every value has loaded. */
export function useReaderSettings(): ReaderSettings | undefined {
  const view = useLiveQuery(getReaderView, []);
  const weave = useLiveQuery(getWeave, []);
  const weaveGrammar = useLiveQuery(getWeaveGrammar, []);
  const levels = useLiveQuery(listLevels, []);
  const solid = useLiveQuery(listSolidLemmas, []);
  const learning = useLiveQuery(listLearningLemmas, []);
  const layout = useLiveQuery(getLayout, []);
  const headings = useLiveQuery(getSectionHeadings, []);
  const readSpan = useLiveQuery(getReadSpan, []);
  // What the address said when the reader opened: the view and weave to put back in the settings.
  const [opened] = useState(() => readerOf(window.location.hash));
  const wantView = useRef(opened.view);
  const wantWeave = useRef(toldSetting(weaveSetting) !== undefined ? undefined : opened.weave);
  useEffect(() => {
    if (!view) return;
    if (wantView.current && wantView.current !== view) {
      void setReaderView(wantView.current);
      return;
    }
    wantView.current = undefined;
    publish({ kind: 'view-changed', view });
  }, [view]);
  useEffect(() => {
    if (!weave) return;
    if (wantWeave.current && wantWeave.current !== weave) {
      void setWeave(wantWeave.current);
      return;
    }
    wantWeave.current = undefined;
    announceSetting(weaveSetting, weave);
  }, [weave]);
  useEffect(() => {
    if (layout) publish({ kind: 'layout-changed', layout });
  }, [layout]);
  useEffect(() => {
    if (headings) publish({ kind: 'headings-changed', headings });
  }, [headings]);
  return useMemo(
    () =>
      view && weave && weaveGrammar && levels && solid && learning && layout && headings && readSpan
        ? { view, weave, weaveGrammar, layout, headings, readSpan, solid, learning, levels }
        : undefined,
    [view, weave, weaveGrammar, levels, solid, learning, layout, headings, readSpan],
  );
}
