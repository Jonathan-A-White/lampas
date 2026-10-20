// src/talk/Bars.tsx — Lampas's two uses of voice-kit/composer's one hold-to-talk bar (mw-06ggew.7; the look is the kit's, Postern's bar, set to Lampas's
// palette and size by `.lp-bar` in index.css, docs/pwa-best-practices.md section 12: every hold-to-talk control is this bar):
//   HeldTalkBar  the kit's TalkBar over a hold of useTalkHold: the Talk sheet's foot, the Reader's Talk bar, Welcome and the letter drill. With `onTap` a press
//                shorter than the hold's delay is a tap (the Reader's Talk bar opens the sheet); the click that ends a hold is not one.
//   RecordBar    the kit's HoldToTalkBar for a hold that records rather than listens (the reading check's Read buttons, the Try it step): a hold from the first
//                touch, or Space / Enter held, `onAbort` when the finger slides off the bar or the phone takes the touch.
// In a short window (a phone held sideways) a bar can be `compact` (a 56 px row, the icon beside the label) or `round` (a round mic button, the label hidden;
// its name stays) for a sheet that needs the height or the width for its text.
import { DEFAULT_TALK_LABELS, HoldToTalkBar, TalkBar, type TalkLabels } from 'voice-kit/composer';
import { tapWord, useTalkSettings } from '../talkSettings';
import type { TalkHold } from './useTalkHold';

export type BarFit = 'wide' | 'compact' | 'round';

/** The kit's bar in Lampas's size, and what it changes in a short window. */
const classOf = (fit: BarFit): string => (fit === 'round' ? 'lp-bar lp-bar-round' : fit === 'compact' ? 'lp-bar lp-bar-compact' : 'lp-bar');

export function HeldTalkBar({ hold, labels, disabled = false, fit = 'wide', onPress, onTap }: {
  hold: TalkHold;
  /** the words on the bar; the kit's are Hold to talk, Release to send, Starting the mic… */
  labels?: Partial<TalkLabels>;
  disabled?: boolean;
  fit?: BarFit;
  /** the finger is down (a tap or the start of a hold), before anything is known of it */
  onPress?: () => void;
  /** a press that is no hold (let go before the hold's delay) is this */
  onTap?: () => void;
}) {
  // with Talk set to Tap the bar's resting words say Tap (Hold to talk, Tap to talk); the Reader's bar says Talk and keeps it
  const asked = { hold: DEFAULT_TALK_LABELS.hold, tryAgain: DEFAULT_TALK_LABELS.tryAgain, ...labels };
  const words = { ...labels, hold: tapWord(asked.hold, hold.talk), tryAgain: tapWord(asked.tryAgain, hold.talk) };
  const bar = <TalkBar talk={hold} labels={words} disabled={disabled} className={classOf(fit)} />;
  if (!onTap && !onPress) return bar;
  // the press starts afresh: the click of a hold that went before is not this one's
  return (
    <div
      className="contents"
      onPointerDownCapture={() => {
        hold.pressBegan();
        onPress?.();
      }}
      onClick={() => {
        if (!hold.endsAHold()) onTap?.();
      }}
    >
      {bar}
    </div>
  );
}

export function RecordBar({ label, listening, disabled = false, fit = 'wide', onPress, onRelease, onAbort }: {
  label: string;
  /** a hold is going on: the bar is in the alert colour */
  listening: boolean;
  disabled?: boolean;
  fit?: BarFit;
  onPress: () => void;
  onRelease: () => void;
  onAbort: () => void;
}) {
  const settings = useTalkSettings();
  return <HoldToTalkBar label={tapWord(label, settings.talk)} listening={listening} disabled={disabled} onPress={onPress} onRelease={onRelease} onAbort={onAbort} dropOnSlideOff settings={settings} className={classOf(fit)} />;
}
