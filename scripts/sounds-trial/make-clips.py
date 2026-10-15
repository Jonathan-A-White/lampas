#!/usr/bin/env python3
"""scripts/sounds-trial/make-clips.py: the clips of the letter-sounds listening page (public/sounds-trial.html, docs/research/letter-sounds.md,
mw-5r3p30.395): the same Greek vowels, one-letter words, letter names, letter sounds and whole words, made by each candidate voice, so they can be
heard side by side on a phone. Research tooling: not in the gate, and the app plays none of this.

    make-clips.py espeak piper coqui chatterbox encode     # one or more of the voices, then encode
    make-clips.py encode                                   # WAVs already in the work dir -> public/sounds-trial/<voice>/<name>.mp3

Each voice is a function below that writes WAVs to <work>/<voice>/ (default /tmp/sounds-trial-work); `encode` trims the silence, slows a bare
sound that came out shorter than MIN_SOUND_S (pitch kept), and writes small mono MP3s, as scripts/sounds-build.sh does for the app's own clips.

A VITS voice (Piper, Coqui) stretches a word said on its own to several seconds, so every item is said inside a carrier sentence and cut out by the
voice's own alignment (Piper gives one per phoneme; Coqui's model gives one per token). Chatterbox gives none, so its sounds are cut by the frames of
a phoneme recogniser (Meta's wav2vec2 espeak-phoneme model: the mill's scorer uses the same), with carriers whose neighbour is voiceless.

What each needs (all free; none is a dependency of the app):
  espeak      espeak-ng 1.52 on PATH (the Piper release tarball bundles one: set ESPEAK_DATA_PATH to its espeak-ng-data) and ffmpeg
  piper       pip install 'piper-tts[alignment]'; PIPER_VOICE=<path to el_GR-rapunzelina-low.onnx> (rhasspy/piper-voices on Hugging Face)
  coqui       pip install 'coqui-tts[codec]' 'transformers>=4.57,<5' (torch CPU is enough); espeak-ng on PATH; the model downloads itself
  chatterbox  pip install chatterbox-tts torch==2.6.0 torchaudio==2.6.0 phonemizer; the models download themselves (about 3 GB);
              CHATTERBOX_REF=<wav> clones that voice (a Greek reference: the default voice is an English speaker)
"""
import os
import subprocess
import sys
import wave

WORK = os.environ.get('SOUNDS_TRIAL_WORK', '/tmp/sounds-trial-work')
OUT = os.environ.get('SOUNDS_TRIAL_OUT', 'public/sounds-trial')
MIN_SOUND_S = 0.25

# The whole words (name, text): the three letter names of the drill, three words with those letters, the one-letter words in a phrase, the verse.
WORDS = [('name-vita', 'βήτα'), ('name-ghama', 'γάμα'), ('name-thita', 'θήτα'), ('word-vivlos', 'βίβλος'), ('word-agape', 'αγάπη'), ('word-theos', 'θεός'),
         ('word-o-logos', 'ο λόγος'), ('word-ee-zoe', 'η ζωή'), ('word-o-anthrope', 'ω άνθρωπε'), ('phrase-1jn', 'ο ην απ αρχής')]
# The bare sounds (name, carrier word, the phoneme to cut, carrier sentence): a stressed vowel inside a word, the unstressed article, a consonant.
CARRIER = 'Λέω τη λέξη {w} και πάλι.'
SOUNDS = [('a', 'άγιος', 'a', CARRIER), ('e', 'έργον', 'e', CARRIER), ('ee', 'ήλιος', 'i', CARRIER), ('o', 'όλος', 'o', CARRIER),
          ('o-article', 'ο λόγος', 'o', 'Είπε {w} αυτό.'), ('ee-article', 'η ζωή', 'i', 'Είπε {w} αυτό.'),
          ('v', 'βάση', 'v', CARRIER), ('gh', 'γάλα', 'ɣ', CARRIER), ('th', 'θέση', 'θ', CARRIER)]
SOUND_NAMES = {s[0] for s in SOUNDS}
# espeak-ng's phoneme input for each bare sound (Kirshenbaum: Q is ɣ, T is θ); the page plays eSpeak's vowel clips for the one-letter words, as the app does
ESPEAK_PHONEMES = {'a': 'a', 'e': 'e', 'ee': 'i', 'o': 'o', 'v': 'v', 'gh': 'Q', 'th': 'T'}
# the whole words eSpeak says on the page (the voice itself, for comparison); the drill's names and words are the phone's today, so eSpeak gives none
ESPEAK_WORDS = ['word-o-logos', 'word-ee-zoe', 'word-o-anthrope', 'phrase-1jn']
# Chatterbox: carriers whose neighbour is voiceless, so a recogniser's frames find the edge (name, word, class)
CHATTERBOX_CARRIERS = [('a', 'άσπρο', 'a'), ('e', 'έτσι', 'e'), ('ee', 'ήττα', 'i'), ('o', 'όσο', 'o'), ('o-article', 'ο θεός', 'o'), ('ee-article', 'η θύρα', 'i'),
                       ('v', 'βάση', 'v'), ('gh', 'γάλα', 'gh'), ('th', 'θέση', 'th')]


def work_dir(voice: str) -> str:
    path = os.path.join(WORK, voice)
    os.makedirs(path, exist_ok=True)
    return path


def save_wav(path: str, samples, sr: int) -> None:
    import numpy as np
    a = np.asarray(samples)
    if a.dtype != np.int16:
        a = (np.clip(a.astype(np.float32), -1, 1) * 32767).astype(np.int16)
    a = a.astype(np.float32)
    fade = int(sr * 0.008)
    if len(a) > 2 * fade:
        a[:fade] *= np.linspace(0, 1, fade)
        a[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(a.astype(np.int16).tobytes())
    print(f'{os.path.basename(path):22s} {len(a) / sr:5.2f}s')


def find(seq, sub) -> int:
    for i in range(len(seq) - len(sub) + 1):
        if seq[i:i + len(sub)] == sub:
            return i
    return -1


# ---------------------------------------------------------------- eSpeak NG: a sound from its phoneme input, a word from its text, as the app's clips
def make_espeak() -> None:
    out = work_dir('espeak')
    for name, ph in ESPEAK_PHONEMES.items():
        subprocess.run(['espeak-ng', '-v', 'el', '-s', '110', '-w', f'{out}/{name}.wav', f'[[{ph}]]'], check=True)
    for name, text in WORDS:
        if name in ESPEAK_WORDS:
            subprocess.run(['espeak-ng', '-v', 'el', '-s', '110', '-w', f'{out}/{name}.wav', text], check=True)
    print('espeak: done')


# ---------------------------------------------------------------- Piper: carrier sentences cut by its phoneme alignment
def make_piper() -> None:
    import numpy as np
    from piper import PiperVoice
    from piper.config import SynthesisConfig
    v = PiperVoice.load(os.environ['PIPER_VOICE'], include_alignments=True)
    sr = v.config.sample_rate
    out = work_dir('piper')

    def synth(text, ls=1.0):
        audio, aligns = [], []
        for chunk in v.synthesize(text, SynthesisConfig(length_scale=ls), include_alignments=True):
            audio.append(chunk.audio_int16_array)
            aligns.extend(chunk.phoneme_alignments or [])
        return np.concatenate(audio), aligns

    def cut(name, word, carrier, inner=None, ls=1.0):
        a, al = synth(carrier.format(w=word), ls)
        if carrier == '{w}':  # the whole utterance (a phrase of four words paces itself)
            save_wav(f'{out}/{name}.wav', a, sr)
            return
        phones = [x.phoneme for x in al]
        target = [p for p in v.phonemize(word)[0] if p != '̧']  # a combining cedilla espeak writes for ç is not in the voice's map
        i = find(phones, target)
        if i < 0:
            print('NOT FOUND', name, target, phones)
            return
        starts = np.cumsum([0] + [x.num_samples for x in al])
        if inner is None:
            save_wav(f'{out}/{name}.wav', a[starts[i]:starts[i + len(target)]], sr)
            return
        for j in range(i, i + len(target)):
            if phones[j] != inner:
                continue
            s = j - 1 if j > i and phones[j - 1] == 'ˈ' else j  # the stress mark before a vowel holds part of it
            e = j + 1
            # a vowel at a word's edge: the alignment pushes part of it into the gap beside it, so take the gap too
            if s == i and s > 0 and phones[s - 1] == ' ':
                s -= 1
            if j == i + len(target) - 1 and e < len(phones) and phones[e] == ' ':
                e += 1
            save_wav(f'{out}/{name}.wav', a[starts[s]:starts[e]], sr)
            return
        print('INNER NOT FOUND', name)

    for name, text in WORDS:
        # the verse's 'αρχής' has a sound (ç) the voice's map lacks, and then the alignment comes back empty: the phrase is said whole
        cut(name, text, '{w}' if name == 'phrase-1jn' else CARRIER)
    for name, word, ph, carrier in SOUNDS:
        cut(name, word, carrier, inner=ph, ls=2.2)  # slow, careful speech for a sound taught on its own
    print('piper: done')


# ---------------------------------------------------------------- Coqui el/cv/vits: through its synthesizer, the model's token durations captured
def make_coqui() -> None:
    import numpy as np
    from TTS.api import TTS
    tts = TTS('tts_models/el/cv/vits', progress_bar=False)
    syn = tts.synthesizer
    model, tok, cfg = syn.tts_model, syn.tts_model.tokenizer, syn.tts_config
    sr = syn.output_sample_rate
    hop = cfg.audio['hop_length'] if isinstance(cfg.audio, dict) else cfg.audio.hop_length
    blank = tok.characters.blank_id if getattr(tok, 'add_blank', False) else -1
    captured = {}
    real = model.inference

    def spy(x, aux_input=None):
        o = real(x, aux_input=aux_input)
        captured.update(ids=x.squeeze().tolist(), dur=o['durations'].squeeze().numpy().copy(), wav=o['model_outputs'].squeeze().numpy().copy())
        return o

    model.inference = spy
    out = work_dir('coqui')

    def run(text, ls):
        model.length_scale = ls
        tts.tts(text=text)
        return captured['ids'], captured['wav'], captured['dur']

    def cut(name, word, carrier, inner=None, ls=1.0):
        ids, wav, dur = run(carrier.format(w=word), ls)
        starts = np.cumsum([0] + [int(d) * hop for d in dur])
        core = [t for t in tok.text_to_ids(word) if t != blank]
        nb = [(k, t) for k, t in enumerate(ids) if t != blank]
        nbt = [t for _, t in nb]
        i = find(nbt, core)
        if i < 0:
            print('NOT FOUND', name, tok.ids_to_text(core), '|', tok.ids_to_text(nbt))
            return
        if inner is None:
            save_wav(f'{out}/{name}.wav', wav[starts[nb[i][0]]:starts[nb[i + len(core) - 1][0] + 1]], sr)
            return
        ph = [t for t in tok.text_to_ids(inner) if t != blank][0]
        for k in range(i, i + len(core)):
            if nbt[k] != ph:
                continue
            pos = nb[k][0]
            s = nb[k - 1][0] if k - 1 >= i and tok.ids_to_text([nbt[k - 1]]) == 'ˈ' else pos
            if s > 0 and ids[s - 1] == blank:  # the blank tokens on each side carry part of the sound
                s -= 1
            e = nb[k + 1][0] if k + 1 < len(nb) else len(ids)
            save_wav(f'{out}/{name}.wav', wav[starts[s]:starts[e]], sr)
            return
        print('INNER NOT FOUND', name)

    for name, text in WORDS:
        cut(name, text, 'Λέω: {w}, και πάλι.' if name == 'phrase-1jn' else CARRIER)
    for name, word, ph, carrier in SOUNDS:
        cut(name, word, carrier, inner=ph, ls=2.0)
    print('coqui: done')


# ---------------------------------------------------------------- Chatterbox Multilingual: whole items by text, the sounds cut by a recogniser's spikes
def make_chatterbox() -> None:
    import numpy as np
    import torch
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from transformers import AutoProcessor, Wav2Vec2ForCTC
    model = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    sr = model.sr
    out = work_dir('chatterbox')
    ref = os.environ.get('CHATTERBOX_REF')

    def say(text):
        # three takes, the shortest kept: a take that hallucinates (a word said twice, a tail of babble) is the longer one
        takes = []
        for _ in range(3):
            kwargs = dict(language_id='el')
            if ref:
                kwargs['audio_prompt_path'] = ref
            takes.append(model.generate(text, **kwargs)[0].numpy())
        return min(takes, key=len)

    for name, text in WORDS:
        save_wav(f'{out}/{name}.wav', say(text), sr)

    # The recogniser's CTC output is peaky: a phone shows as one or two frames, the rest is blank. So a sound's span runs from its own spike to the
    # next phone's spike; a consonant at a word's start runs from a little before its spike to the first vowel's.
    ctc = 'facebook/wav2vec2-lv-60-espeak-cv-ft'
    proc, rec = AutoProcessor.from_pretrained(ctc), Wav2Vec2ForCTC.from_pretrained(ctc).eval()
    vocab = {v: k for k, v in proc.tokenizer.get_vocab().items()}
    classes = {'a': {'a', 'aː', 'ɑ', 'ɑː', 'ɐ', 'æ', 'ʌ'}, 'e': {'e', 'eː', 'ɛ', 'ɛː', 'ə'}, 'i': {'i', 'iː', 'ɪ', 'y', 'ɨ'}, 'o': {'o', 'oː', 'ɔ', 'ɔː', 'ʊ', 'ɒ', 'ɑ', 'ɑː'},
               'v': {'v', 'f', 'β', 'w'}, 'gh': {'ɣ', 'ɡ', 'g', 'x', 'ʁ', 'ɰ', 'j', 'ʝ', 'ɢ', 'h'}, 'th': {'θ', 'ð', 's', 'f', 'ʃ', 'ç'}}
    vowels = classes['a'] | classes['e'] | classes['i'] | classes['o'] | {'u', 'uː', 'ɯ'}
    for name, word, cls in CHATTERBOX_CARRIERS:
        wav = say(word)
        w16 = ta.functional.resample(torch.from_numpy(wav).unsqueeze(0), sr, 16000)[0].numpy()
        with torch.no_grad():
            frames = [vocab.get(i, '') for i in rec(proc(w16, sampling_rate=16000, return_tensors='pt').input_values).logits[0].argmax(-1).tolist()]
        hop = len(w16) / len(frames)
        spikes = [(k, f) for k, f in enumerate(frames) if f not in ('<pad>', '')]
        want = classes[cls]
        span = None
        if cls in ('a', 'e', 'i', 'o'):
            for n, (k, f) in enumerate(spikes):
                if f in want:
                    span = (k, next((k2 for k2, f2 in spikes[n + 1:] if f2 not in want), len(frames)))
                    break
        else:
            first = next((k for k, f in spikes if f in want), None)
            first_vowel = next((k for k, f in spikes if f in vowels), None)
            if first is not None:
                span = (max(0, first - 3), first_vowel if first_vowel is not None and first_vowel > first else min(len(frames), first + 12))
        heard = ' '.join(f for _, f in spikes)
        if span is None:
            print(f'{name}: NOT FOUND ({cls}) in [{heard}]')
            continue
        a = max(0, span[0] * hop - 0.02 * 16000) * sr / 16000
        b = min(len(w16), span[1] * hop - 0.01 * 16000) * sr / 16000
        save_wav(f'{out}/{name}.wav', wav[int(a):int(b)], sr)
    print('chatterbox: done')


# ---------------------------------------------------------------- encode: trim, slow a too-short sound, small mono MP3s
def duration_of(path: str) -> float:
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


def encode() -> None:
    for voice in sorted(os.listdir(WORK)):
        src = os.path.join(WORK, voice)
        if not os.path.isdir(src):
            continue
        dst = os.path.join(OUT, voice)
        os.makedirs(dst, exist_ok=True)
        for file in sorted(os.listdir(src)):
            if not file.endswith('.wav'):
                continue
            name = file[:-4]
            # a sound cut out of a sentence by an alignment has no silence to trim, and a quiet fricative (θ) would be trimmed away as if it were
            seconds = duration_of(os.path.join(src, file))
            filters = [] if name in SOUND_NAMES and voice != 'espeak' else ['silenceremove=start_periods=1:start_threshold=-50dB', 'areverse', 'silenceremove=start_periods=1:start_threshold=-50dB', 'areverse']
            if name in SOUND_NAMES and 0 < seconds < MIN_SOUND_S:
                tempo = seconds / MIN_SOUND_S  # under 1 slows it; atempo takes 0.5 at the least, so chain two for more
                while tempo < 0.5:
                    filters.append('atempo=0.5')
                    tempo /= 0.5
                filters.append(f'atempo={tempo:.3f}')
            filters.append('apad=pad_dur=0.05')
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', os.path.join(src, file), '-af', ','.join(filters),
                            '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '48k', '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '0',
                            os.path.join(dst, f'{name}.mp3')], check=True)
        print(f'encode: {voice} -> {dst}')


if __name__ == '__main__':
    steps = {'espeak': make_espeak, 'piper': make_piper, 'coqui': make_coqui, 'chatterbox': make_chatterbox, 'encode': encode}
    for arg in sys.argv[1:] or ['encode']:
        steps[arg]()
