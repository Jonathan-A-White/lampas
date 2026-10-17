// src/speech/askTranscriber.ts — how the Ask the tutor composer (voice-kit/composer) turns a hold into words: the browser's recogniser, as the Composer
// does by default, but a hold first takes the voice from the page: a Listen is paused (and goes on by itself when the hold is over, readAloud.ts
// interruptListen), any other reading is paused and waits for his Resume. Page audio can take the microphone from the recogniser, so nothing is read
// aloud while he talks (the same rule as src/useVoice.ts, which the Talk sheet's and the Talk bar's holds follow).
import { browserSpeech, type Transcriber } from 'voice-kit/composer';
import { interruptListen, pauseReading } from './readAloud';
import { noteSpoken } from './spoken';

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
    // the words so far: a hold that ends without sending (a slide off the bar, the app hidden) leaves exactly these in the field
    let heard = '';
    const started = browserSpeech.start({
      ...options,
      onInterim: (text) => {
        if (text.trim()) heard = text;
        options.onInterim?.(text);
      },
    });
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
            const result = await session.stop();
            // the words went by voice: the question made of them is sent as spoken (src/speech/spoken.ts)
            const words = result.text.trim() ? result.text : heard;
            if (words.trim()) noteSpoken(words);
            return result;
          } finally {
            giveBack();
          }
        },
        abort() {
          session.abort();
          // the composer keeps these words in its field unsent: they are still words he spoke, so Send of them unedited goes marked spoken
          if (heard.trim()) noteSpoken(heard);
          giveBack();
        },
      },
    };
  },
};
