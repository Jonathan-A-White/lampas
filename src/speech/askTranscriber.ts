// src/speech/askTranscriber.ts — how every hold-to-talk of Lampas turns a hold into words (Ask the tutor's composer, the Talk sheet's composer, and the Talk bar, Welcome and letter drill through
// src/talk/useTalkHold.ts; voice-kit/composer): the browser's recogniser, as the Composer
// does by default, but a hold first takes the voice from the page: a Listen is paused (and goes on by itself when the hold is over, readAloud.ts
// interruptListen), any other reading is paused and waits for his Resume. Page audio can take the microphone from the recogniser, so nothing is read
// aloud while he talks (one rule for every bar): a word or a letter said alone has no bar to come back to, so it ends (mw-06ggew.15).
import { browserSpeech, type Transcriber } from 'voice-kit/composer';
import { getSpeech } from 'voice-kit/speech';
import { isWordSpeech, stopLetterClip, stopSpeaking } from './greek';
import { interruptListen, pauseReading } from './readAloud';
import { noteSpoken } from './spoken';

export const askTranscriber: Transcriber = {
  supported: browserSpeech.supported,
  start(options) {
    const resume = interruptListen();
    if (!resume) pauseReading();
    // a word, a letter or a clip said alone has no bar and would come back mid-sentence: it ends
    if (getSpeech().status !== 'idle' && isWordSpeech(getSpeech().key)) stopSpeaking();
    stopLetterClip();
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
