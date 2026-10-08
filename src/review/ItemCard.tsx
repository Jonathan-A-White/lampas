// src/review/ItemCard.tsx — draws one Review item: a renderer per kind, so the course epic adds its own kinds here.
import type { ReactNode } from 'react';
import { Flashcard } from '../Flashcard';
import { WordQuestion } from '../WordQuestion';
import type { ReviewItem } from './kinds';

export interface ItemCardProps {
  item: ReviewItem;
  /** its place in the round */
  index: number;
  /** what he tapped, or null while he has not answered */
  picked: string | null;
  onPick: (option: string) => void;
}

const RENDERERS: { [K in ReviewItem['kind']]: (props: ItemCardProps & { item: Extract<ReviewItem, { kind: K }> }) => ReactNode } = {
  word: ({ item, index, picked, onPick }) =>
    item.mode === 'flashcard' ? (
      <Flashcard key={index} question={item.question} picked={picked} onPick={onPick} />
    ) : (
      <WordQuestion question={item.question} index={index} picked={picked} onPick={onPick} />
    ),
};

export function ItemCard(props: ItemCardProps) {
  const render = RENDERERS[props.item.kind] as (p: ItemCardProps) => ReactNode;
  return <>{render(props)}</>;
}
