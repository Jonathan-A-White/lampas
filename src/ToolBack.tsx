// src/ToolBack.tsx — the back button of a tool's screen (Words, Review, Paradigms, Verse lists, Your Logos library, Memorize; mw-5r3p30.754): from Tools it says ‹ Tools and steps Back to it, from anywhere
// else (the Reader, Today, a link) it is the button the screen always had.
import { backTo, type Route } from './nav/route';
import { HeaderButton } from './ScreenHeader';
import { cameFromTools } from './tools';

/** `fallback` and `label` are the screen's own back (‹ Reader to the Reader); `leave`, when given, is what that own back does (Memorize's closeMemorize) in place of opening `fallback`. */
export function ToolBack({ fallback, label, leave }: { fallback: Route; label: string; leave?: () => void }) {
  const tools = cameFromTools();
  const own = leave ?? (() => backTo(fallback));
  return <HeaderButton onClick={tools ? () => backTo('tools') : own}>{tools ? '‹ Tools' : label}</HeaderButton>;
}
