// src/HebrewPlacement.tsx — Placement on the Hebrew ladder (mw-gdcyf98.10, PROVISIONAL, #/placement with Hebrew in hand). The Hebrew ladder has one idea so far, the alphabet,
// and it is the foundation a placement starts from, so the walk is over before it begins and there is nothing to ask: Start from the letters shows 'Where you are' (the same card
// as the Greek placement's end, from the same summarize) and Learn next on the Goal screen opens The Hebrew alphabet. Stories g and h add the ideas and so the questions.
// Also the screen at English only (no ladder is in hand: it says so and writes nothing) and while the languages are read.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { learnNext, levelsOf } from './data/grammar/goalProgress';
import { ladderFor } from './data/grammar/ladders';
import type { Level } from './data/grammar/needs';
import { startPlacement, summarize } from './data/grammar/placement';
import { listLevels } from './data/repositories';
import { approachOf, DEFAULT_APPROACH } from './approaches';
import { publish } from './events/bus';
import { backTo, navigate, placementOriginOf, useAddress } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { openSetting } from './settings/link';

const BUTTON = 'min-h-12 w-full rounded-xl text-lg font-medium';
const LEVEL_WORDS: Record<Level, string> = { solid: 'Solid', frontier: 'Frontier', notYet: 'Not yet' };

export function HebrewPlacement({ lang, segment }: { lang: 'hbo' | null | undefined; segment: ReactNode }) {
  const origin = placementOriginOf(useAddress());
  const ladder = ladderFor('hbo');
  const levels = useLiveQuery(async () => levelsOf(await listLevels()), []);
  const [over, setOver] = useState(false);
  const header = (
    <>
      <ScreenHeader title="Placement" back={<HeaderButton onClick={() => backTo(origin)}>{origin === 'goal' ? '‹ Goal' : '‹ Settings'}</HeaderButton>} />
      {segment}
    </>
  );
  if (lang === undefined || !levels) return <>{header}<main className="screen min-h-0 flex-1" aria-busy="true" /></>;
  if (lang === null) {
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p className="text-2xl font-semibold">No language chosen</p>
          <p className="mt-2 text-muted">The placement is for Greek or Hebrew. Choose one, and it asks what you know.</p>
          <button type="button" onClick={() => openSetting('languages')} className={`${BUTTON} mt-6 bg-accent text-accent-fg`}>
            Choose a language
          </button>
        </main>
      </>
    );
  }

  const state = { ...startPlacement(null, levels, ladder.ideas.map((i) => i.id), 0, new Map(), 'hbo'), done: 'finished' as const };
  const sum = summarize(state);
  const approach = approachOf(DEFAULT_APPROACH)!;
  const next = learnNext({ ideas: ladder.ideas.map((i) => ({ id: i.id, count: 0, example: { form: '', code: '', ref: '' } })) }, approach, levels, undefined, 'hbo');
  const have = state.ideas.filter((id) => levels.get(id) === 'solid').map((id) => ladder.ideaOf(id).title);
  const start = (): void => {
    publish({ kind: 'placement-done', goal: '', approach: 'hebrew', solid: sum.solid, frontier: sum.frontier, notYet: sum.notYet, untested: sum.untested });
    setOver(true);
  };

  if (!over) {
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p data-testid="placement-goal" className="text-2xl font-semibold">
            Placement: Hebrew
          </p>
          <p className="mt-2 text-muted">The Hebrew ladder starts with the alphabet, so there is no quiz yet: you start from the letters.</p>
          <div className="mt-6 grid grid-cols-1 gap-3">
            <button type="button" onClick={start} className={`${BUTTON} bg-accent text-accent-fg`}>
              Start from the letters
            </button>
            <button type="button" onClick={() => navigate(origin)} className={`${BUTTON} border border-line`}>
              {origin === 'goal' ? 'Back to the goal' : 'Back to Settings'}
            </button>
          </div>
        </main>
      </>
    );
  }
  const have3 = have.length > 0 ? `Already solid: ${have.join(', ')}. ` : '';
  return (
    <>
      {header}
      <main className="screen min-h-0 flex-1 px-4 pt-6">
        <h2 data-testid="placement-title" className="text-center text-2xl font-semibold">
          Where you are
        </h2>
        <p data-testid="where" className="mt-2 text-center text-lg">
          Where you are: solid {sum.solid}, frontier {sum.frontier}, not yet {sum.notYet}; untested {sum.untested}
        </p>
        <p data-testid="from-letters" className="mt-2 text-center text-lg">
          {next ? `${have3}Learn next on the Goal screen opens ${next.idea.title}.` : `${have3}Nothing is left for Learn next on the Goal screen.`}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <button type="button" onClick={() => navigate('goal')} className={`${BUTTON} bg-accent text-accent-fg`}>
            Back to the goal
          </button>
        </div>
        <div className="mt-6 space-y-4" data-testid="where-list">
          {sum.tiers.map((t) => (
            <section key={t.tier} aria-label={t.tier}>
              <h3 className="text-base font-medium capitalize">{t.tier}</h3>
              <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
                {t.ideas.map((i) => (
                  <li key={i.id} data-idea={i.id} data-level={i.level ?? 'untested'} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2 text-base">
                    <span className="min-w-0 break-words">{i.title}</span>
                    <span className="shrink-0 font-medium">{i.level === null ? 'Untested' : LEVEL_WORDS[i.level]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="pb-[var(--lp-end-inset)]" />
      </main>
    </>
  );
}
