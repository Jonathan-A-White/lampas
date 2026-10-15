// src/review/ItemCard.tsx — draws one Review item: a renderer per kind, so a new kind adds its own here.
import type { ReactNode } from 'react';
import { Flashcard } from '../Flashcard';
import { GrammarCard } from '../GrammarCard';
import { SoundWordCard } from '../SoundWordCard';
import { DrillPlanCard } from './DrillPlanCard';
import { WordQuestion } from '../WordQuestion';
import type { ReviewItem } from './kinds';

export interface ItemCardProps {
  item: ReviewItem;
  /** its place in the round */
  index: number;
  /** what he tapped, or null while he has not answered */
  picked: string | null;
  onPick: (option: string) => void;
  /** Review only: opens the table of the ending just asked (GrammarCard's 'See the table'); a screen that cannot come back to its card leaves it out */
  onSeeTable?: (table: string) => void;
}

const RENDERERS: { [K in ReviewItem['kind']]: (props: ItemCardProps & { item: Extract<ReviewItem, { kind: K }> }) => ReactNode } = {
  word: ({ item, index, picked, onPick }) =>
    item.mode === 'flashcard' ? (
      <Flashcard key={index} question={item.question} picked={picked} onPick={onPick} />
    ) : (
      <WordQuestion question={item.question} index={index} picked={picked} onPick={onPick} />
    ),
  grammar: ({ item, index, picked, onPick, onSeeTable }) => (
    <GrammarCard key={index} question={item.question} mode={item.mode} picked={picked} onPick={onPick} onSeeTable={onSeeTable} />
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
