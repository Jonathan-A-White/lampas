// src/services/formCommands.ts — Ask for another approach and Ask for more as commands (mw-o7cts8.3, the Governor's rule 'never make people fill out forms without an option
// for a tutor to handle the interaction for them'): `ask-for-approach` and `ask-for-more` are what a form's own Send and the tutor's Send (the button the panel 'Let the tutor
// do it' ends with, src/formHelper/FormHelper.tsx) both run, so the two paths are one. Each posts one 'feedback' grist through submitFeedback (src/services/feedback.ts), the
// one sender, with the body the builders give; a value over its limit is refused before anything is posted. The args are the form's fields (APPROACH_FORM,
// MORE_FORMS[kind]); ask-for-more also takes `kind`, so one name serves the three forms. The pictures are never the tutor's: the approach sheet hands its own through `pictures`.
import { checkArgs, type ArgsSchema, type Command } from 'voice-kit/talks';
import { APPROACH_FORM } from '../formHelper/approachForm';
import { formCommand, type FormArgs } from '../formHelper/formHelper';
import { MORE_FORMS } from '../formHelper/moreForms';
import type { MemorizingEvidence } from '../memorize/evidence';
import { buildFeedbackRequest, buildMoreRequest, MORE_KINDS, submitFeedback, type MoreKind } from './feedback';
import type { MillFile } from './mill';

/** What the sheet or form gives its command: what it holds beside the fields, and what it wants told. */
export interface SendHooks {
  /** called once the grist is out and the mill has answered */
  onSent?: () => void;
  /** the live signal of the sheet or form: aborted when it closes */
  signal?: () => AbortSignal;
}

export interface ApproachHooks extends SendHooks {
  /** the pictures the sheet holds, as files; the tutor never adds one */
  pictures?: () => Promise<MillFile[]>;
}

export interface MoreHooks extends SendHooks {
  /** his memorizing evidence, when he turned it on for this ask (mw-fu7dqf.12); none by default */
  memorizing?: () => Promise<MemorizingEvidence | undefined>;
}

/** Throws, before anything is posted, when `args` break the command's own schema (a value over its limit, a missing required field). */
function check(schema: ArgsSchema, args: FormArgs): void {
  const problem = checkArgs(schema, args);
  if (problem) throw new Error(`Not sent: ${problem}`);
}

export const SENT_LINE = 'Sent: the factory has it';

/** The ask-for-approach command, with the pictures and the signal of the sheet that runs it. */
export function approachCommand(hooks: ApproachHooks = {}): Command {
  const command = formCommand(APPROACH_FORM, {
    name: 'ask-for-approach',
    tell: 'asks the makers for another way to learn Greek, with who to credit',
    offer: (values) => `Send this approach${values.credit ? `, credit ${values.credit}` : ''}?`,
    async send(values) {
      check(command.args!, values);
      const files = (await hooks.pictures?.()) ?? [];
      await submitFeedback(buildFeedbackRequest(values.approach, values.credit, values.link), { files, signal: hooks.signal?.() });
      hooks.onSent?.();
      return { said: SENT_LINE };
    },
  });
  return command;
}

export const askForApproachCommand = approachCommand();

/** The ask-for-more command of one form (`kind`); `kind` is also among its args, so the registry and the tutor's Send name the form the same way. */
export function askForMoreCommand(kind: MoreKind, hooks: MoreHooks = {}): Command {
  const form = formCommand(MORE_FORMS[kind], {
    name: 'ask-for-more',
    tell: 'asks the makers for an approach or programme, a text or a translation Lampas does not have',
    async send(values) {
      const asked = MORE_KINDS.find((k) => k === values.kind) ?? kind;
      check(command.args!, values);
      const memorizing = await hooks.memorizing?.();
      await submitFeedback(buildMoreRequest(asked, values.name, values.why, values.link, memorizing), { signal: hooks.signal?.() });
      hooks.onSent?.();
      return { said: SENT_LINE };
    },
  });
  const args: ArgsSchema = {
    ...form.args,
    properties: {
      ...form.args?.properties,
      kind: {
        type: 'string',
        enum: [...MORE_KINDS],
        description: 'Which ask: an approach or programme, a text or a translation',
      },
    },
    required: [...(form.args?.required ?? []), 'kind'],
  };
  const command: Command = { ...form, args };
  return command;
}
