// src/speech/askTranscriber.ts — how the Ask the tutor composer (bsv-kit/composer) turns a hold into words: the browser's recogniser, as the Composer
// does by default, but a hold first takes the voice from the page: a Listen is paused (and goes on by itself when the hold is over, readAloud.ts
// interruptListen), any other reading is paused and waits for his Resume. Page audio can take the microphone from the recogniser, so nothing is read
// aloud while he talks (the same rule as src/useVoice.ts, which the Talk sheet's and the Talk bar's holds follow).
import { browserSpeech, type Transcriber } from 'bsv-kit/composer';
import { interruptListen, pauseReading } from './readAloud';

export const askTranscriber: Transcriber = {
  supported: browserSpeech.supported,
  start(options) {
    const resume = interruptListen();
    if (!resume) pauseReading();
    let given = false;
    const giveBack = (): void => {
      if (given) return;
      given = true;
      resume?.();
    };
    const started = browserSpeech.start(options);
    if (!started.ok) {
      giveBack();
      return started;
    }
    const { session } = started;
    return {
      ok: true,
      session: {
        get mode() {
          return session.mode;
        },
        async stop() {
          try {
            return await session.stop();
          } finally {
            giveBack();
          }
        },
        abort() {
          session.abort();
          giveBack();
        },
      },
    };
  },
};
