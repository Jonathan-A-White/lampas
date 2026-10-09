// src/tutor/ReportScreen.tsx — a screen (or a part of one) that has no hook of its own to call leaves its facts for the Ask the tutor control by
// drawing this: <ReportScreen name="Goal" facts={[…]} />. It draws nothing. See src/tutor/screenContext.ts.
import { useReportScreen } from './screenContext';
import type { ScreenFact } from './screen';

export function ReportScreen({ name, facts }: { name: string; facts: ScreenFact[] }) {
  useReportScreen({ name, facts });
  return null;
}
