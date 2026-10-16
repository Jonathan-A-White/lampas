// src/handwriting/useHandwriting.ts — whether Write it is offered now (mw-86e9r1.51): Handwriting drills On, or Automatic with a pen seen, following both.
import { useLiveQuery } from 'dexie-react-hooks';
import { getPenSeen, handwritingOn } from '../data/repositories';

/** True when Write it is offered; undefined until it is read. */
export const useHandwritingOn = (): boolean | undefined => useLiveQuery(handwritingOn, []);

/** Whether a pen has touched this phone; undefined until it is read. */
export const usePenSeen = (): boolean | undefined => useLiveQuery(getPenSeen, []);
