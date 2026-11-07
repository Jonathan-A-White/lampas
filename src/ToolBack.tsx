// src/ToolBack.tsx — the back button of a tool's screen (Words, Review, Paradigms, Verse lists, Your Logos library; mw-5r3p30.754): from Tools it says ‹ Tools and steps Back to it, from anywhere
// else (the Reader, Today, a link) it is the button the screen always had.
import { backTo, type Route } from './nav/route';
import { HeaderButton } from './ScreenHeader';
import { cameFromTools } from './tools';

/** `fallback` and `label` are the screen's own back (‹ Reader to the Reader). */
export function ToolBack({ fallback, label }: { fallback: Route; label: string }) {
  const tools = cameFromTools();
  return <HeaderButton onClick={() => backTo(tools ? 'tools' : fallback)}>{tools ? '‹ Tools' : label}</HeaderButton>;
}
