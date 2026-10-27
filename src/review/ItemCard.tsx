// src/review/ItemCard.tsx — draws one Review item: a renderer per kind, so a new kind adds its own here.
import type { ReactNode } from 'react';
import type { ParadigmAddress } from '../nav/route';
import type { ParseStep } from '../data/drill';
import { Flashcard } from '../Flashcard';
import { GrammarCard } from '../GrammarCard';
import { SoundWordCard } from '../SoundWordCard';
import { DrillPlanCard } from './DrillPlanCard';
import { WordQuestion } from '../WordQuestion';
import type { Grade } from '../data/schedule';
import type { ReviewItem } from './kinds';

export interface ItemCardProps {
  item: ReviewItem;
  /** its place in the round */
  index: number;
  /** what he tapped, or null while he has not answered */
  picked: string | null;
  onPick: (option: string) => void;
  /** Review only: a word's multiple choice asks how well he knew it after a right pick (WordQuestion's onGrade); the grade he tapped, or null */
  grade?: Grade | null;
  onGrade?: (grade: Grade) => void;
  /** Review only: opens the table of the ending just asked (GrammarCard's 'See the table'); a screen that cannot come back to its card leaves it out */
  onSeeTable?: (address: ParadigmAddress) => void;
  /** Review only: a step of a full parsing was answered (GrammarCard's `onStep`), to be written to the Parsing drill's answers */
  onStep?: (step: ParseStep, right: boolean) => void;
}

const RENDERERS: { [K in ReviewItem['kind']]: (props: ItemCardProps & { item: Extract<ReviewItem, { kind: K }> }) => ReactNode } = {
  word: ({ item, index, picked, onPick, grade, onGrade }) =>
    item.mode === 'flashcard' ? (
      <Flashcard key={index} question={item.question} picked={picked} onPick={onPick} />
    ) : (
      <WordQuestion question={item.question} index={index} picked={picked} onPick={onPick} grade={grade} onGrade={onGrade} />
    ),
  grammar: ({ item, index, picked, onPick, onSeeTable, onStep }) => (
    <GrammarCard key={index} question={item.question} mode={item.mode} picked={picked} onPick={onPick} onSeeTable={onSeeTable} onStep={onStep} />
  ),
  paradigm: ({ item, index, picked, onPick }) => <GrammarCard key={index} question={item.question} mode={item.mode} picked={picked} onPick={onPick} />,
  'drill-plan': ({ item, index, picked, onPick }) => <DrillPlanCard key={index} item={item} picked={picked} onPick={onPick} />,
  sound: ({ item, index, picked, onPick }) =>
    item.question ? (
      <GrammarCard key={index} question={item.question} mode={item.mode} picked={picked} onPick={onPick} />
    ) : (
      <SoundWordCard key={index} word={item.word ?? ''} picked={picked} onPick={onPick} />
    ),
};

export function ItemCard(props: ItemCardProps) {
  const render = RENDERERS[props.item.kind] as (p: ItemCardProps) => ReactNode;
  return <>{render(props)}</>;
}
