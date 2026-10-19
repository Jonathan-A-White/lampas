// src/gate/GetLicence.tsx — Get a licence (mw-cvwm1u.4): an email and a phone (with its country code) -> Send codes, one code to each -> Confirm, and the
// backend has the site issuer license this phone's key ('Licensed. Tap Check again.'; Check again, on the Licence page below, then finds it on the chain).
// One screen, one step at a time. A refusal is the backend's own words (services/register.ts). The email and phone live in this component's state
// only, and are dropped once the licence is issued; nothing is stored.
import { useId, useState } from 'react';
import { confirmRegistration, RegisterError, startRegistration } from '../services/register';
import { LimitedInput } from '../ui/LimitedField';

type Step = 'details' | 'codes' | 'done';

const FIELD = 'min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg';
const PRIMARY = 'min-h-12 w-full rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg disabled:opacity-60';
const SECONDARY = 'min-h-12 w-full rounded-xl border border-line px-6 text-lg font-medium disabled:opacity-60';

/** A label over its field, and a hint under it that the field is described by (not part of the label's name). */
function Field({ label, hint, input }: { label: string; hint?: string; input: (props: { id: string; 'aria-describedby'?: string }) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 text-left">
      <label htmlFor={id} className="text-base font-medium">
        {label}
      </label>
      {input({ id, 'aria-describedby': hint ? `${id}-hint` : undefined })}
      {hint ? (
        <span id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

interface Props {
  /** This phone's public key (hex): the key the licence is issued to. */
  deviceKey: string;
  /** Leave Get a licence without finishing it. */
  onCancel: () => void;
}

export function GetLicence({ deviceKey, onCancel }: Props) {
  const [step, setStep] = useState<Step>('details');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  async function sendCodes(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem('');
    try {
      setRegistrationId(await startRegistration({ email: email.trim(), phone: phone.trim(), deviceKey }));
      setEmailCode('');
      setPhoneCode('');
      setStep('codes');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem('');
    try {
      await confirmRegistration({ registrationId, emailCode: emailCode.trim(), phoneCode: phoneCode.trim() });
      setEmail('');
      setPhone('');
      setEmailCode('');
      setPhoneCode('');
      setStep('done');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
      if (error instanceof RegisterError && error.startOver) setStep('details');
    } finally {
      setBusy(false);
    }
  }

  const alert = problem ? (
    <p role="alert" className="text-left text-base text-bad first-letter:uppercase">
      {problem}
    </p>
  ) : null;

  if (step === 'done') {
    return (
      <section aria-label="Get a licence" className="flex w-full max-w-sm flex-col gap-3">
        <p aria-live="polite" className="text-xl font-medium">
          Licensed. Tap Check again.
        </p>
      </section>
    );
  }

  if (step === 'codes') {
    return (
      <form aria-label="Get a licence" onSubmit={(e) => void confirm(e)} className="flex w-full max-w-sm flex-col gap-3">
        <p className="text-left text-base">We sent a code to your email and one to your phone. Type both.</p>
        <Field
          label="Email code"
          input={(field) => (
            <LimitedInput {...field} type="text" inputMode="numeric" autoComplete="off" maxLength={12} value={emailCode} onChange={(e) => setEmailCode(e.target.value)} className={FIELD} />
          )}
        />
        <Field
          label="Phone code"
          input={(field) => (
            <LimitedInput {...field} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={12} value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className={FIELD} />
          )}
        />
        {alert}
        <button type="submit" disabled={busy || !emailCode.trim() || !phoneCode.trim()} className={PRIMARY}>
          {busy ? 'Checking…' : 'Confirm'}
        </button>
        <button type="button" disabled={busy} onClick={() => { setProblem(''); setStep('details'); }} className={SECONDARY}>
          Change email or phone
        </button>
      </form>
    );
  }

  return (
    <form aria-label="Get a licence" onSubmit={(e) => void sendCodes(e)} className="flex w-full max-w-sm flex-col gap-3">
      <Field
        label="Email"
        input={(field) => (
          <input
            {...field}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
        )}
      />
      <Field
        label="Phone"
        hint="With its country code, like +1 415 555 0101."
        input={(field) => (
          <input {...field} type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="send" placeholder="+1" value={phone} onChange={(e) => setPhone(e.target.value)} className={FIELD} />
        )}
      />
      {alert}
      <button type="submit" disabled={busy || !email.trim() || !phone.trim()} className={PRIMARY}>
        {busy ? 'Sending…' : 'Send codes'}
      </button>
      <button type="button" disabled={busy} onClick={onCancel} className={SECONDARY}>
        Not now
      </button>
    </form>
  );
}
