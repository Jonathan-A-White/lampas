// src/ui/Waiting.tsx — the line under a question the tutor has not answered yet: Sending…, then Waiting for the tutor… and the seconds (the Talk sheet's, src/Talk.tsx).
import type { AskState } from '../pending/pendingAsks';
import { useElapsed } from './useElapsed';

export function Waiting({ state }: { state: Extract<AskState, { phase: 'sending' | 'waiting' }> }) {
  const seconds = useElapsed(state.startedAt);
  return (
    <p role="status" className="text-base text-muted">
      {state.phase === 'sending' ? 'Sending…' : `Waiting for the tutor… ${seconds} s`}
    </p>
  );
}
