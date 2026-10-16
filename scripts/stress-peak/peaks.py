"""scripts/stress-peak/peaks.py: the pitch of each vowel of Greek text as eSpeak NG's Greek voice says it (mw-5r3p30.357, docs/pronunciation.md 'A word
said alone'). Research tooling, not in the gate: it chose the form a word said alone is handed to the voice in (src/speech/schemes/modern.ts wordFormModern).

It synthesises each text with libespeak-ng (voice el), takes the phoneme times from the library's own events, tracks the pitch with Praat (through
Parselmouth) and prints, per vowel, its span and its highest and mean pitch; with --contour, the pitch every 20 ms beside the phoneme sounding.

    pip install --target /tmp/stress-peak/py praat-parselmouth numpy
    STRESS_PEAK_PY=/tmp/stress-peak/py ESPEAK_LIB=/usr/lib/x86_64-linux-gnu python3 scripts/stress-peak/peaks.py 'πατήρ' 'πατήρ!' 'ἀγάπη!'

ESPEAK_LIB is the directory holding libespeak-ng.so.1 and espeak-ng-data (the Ubuntu packages espeak-ng, libespeak-ng1 and espeak-ng-data; unpacked with
dpkg-deb -x they need no root, with LD_LIBRARY_PATH pointing at their libraries).
"""
import ctypes
import os
import sys

sys.path.insert(0, os.environ.get('STRESS_PEAK_PY', ''))
import numpy as np  # noqa: E402
import parselmouth  # noqa: E402

LIB = os.environ.get('ESPEAK_LIB', '/usr/lib/x86_64-linux-gnu')
VOWELS = set('aeiouɐəɛɔɪʊ')
AUDIO_OUTPUT_SYNCHRONOUS = 2
PHONEME_EVENTS = 0x0003  # espeakINITIALIZE_PHONEME_EVENTS | espeakINITIALIZE_PHONEME_IPA
EVENT_PHONEME = 7
CHARS_UTF8 = 1


class EventId(ctypes.Union):
    _fields_ = [('number', ctypes.c_int), ('name', ctypes.c_char_p), ('string', ctypes.c_char * 8)]


class Event(ctypes.Structure):
    _fields_ = [('type', ctypes.c_int), ('unique_identifier', ctypes.c_uint), ('text_position', ctypes.c_int), ('length', ctypes.c_int),
                ('audio_position', ctypes.c_int), ('sample', ctypes.c_int), ('user_data', ctypes.c_void_p), ('id', EventId)]


Callback = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.POINTER(Event))
lib = ctypes.CDLL(os.path.join(LIB, 'libespeak-ng.so.1'))
rate = lib.espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, LIB.encode(), PHONEME_EVENTS)
lib.espeak_SetVoiceByName(b'el')


def synthesise(text):
    """The samples and the phonemes [(start in seconds, IPA)] of `text` said by the el voice."""
    samples, phonemes = [], []

    def heard(wav, n, events):
        if n > 0:
            samples.extend(wav[:n])
        i = 0
        while events[i].type != 0:
            if events[i].type == EVENT_PHONEME:
                phonemes.append((events[i].audio_position / 1000.0, events[i].id.string.decode('utf-8', 'replace')))
            i += 1
        return 0

    keep = Callback(heard)
    lib.espeak_SetSynthCallback(keep)
    data = text.encode('utf-8') + b'\0'
    lib.espeak_Synth(data, len(data), 0, 1, 0, CHARS_UTF8, None, None)
    lib.espeak_Synchronize()
    return np.array(samples, dtype=np.float64) / 32768.0, phonemes


def report(text, contour):
    samples, phonemes = synthesise(text)
    pitch = parselmouth.Sound(samples, sampling_frequency=rate).to_pitch(time_step=0.005, pitch_floor=50, pitch_ceiling=400)
    end = len(samples) / rate
    print(repr(text), ' '.join(p for _, p in phonemes))
    if contour:
        row = []
        for t in np.arange(0, end, 0.02):
            sounding = [p for s, p in phonemes if s <= t][-1:] or ['']
            f0 = pitch.get_value_at_time(t)
            row.append(f'{sounding[0]}:{f0:.0f}' if f0 == f0 else f'{sounding[0]}:-')
        print('  ', ' '.join(row))
        return
    for i, (start, phoneme) in enumerate(phonemes):
        stop = phonemes[i + 1][0] if i + 1 < len(phonemes) else end
        core = phoneme.replace('ˈ', '').replace('ˌ', '').replace('ː', '')
        if not core or core[0] not in VOWELS:
            continue
        f0 = [f for f in (pitch.get_value_at_time(t) for t in np.arange(start, stop, 0.005)) if f == f]
        if f0:
            print(f'   {phoneme:6s} {start:5.2f}-{stop:5.2f}s  max {max(f0):6.1f} Hz  mean {sum(f0) / len(f0):6.1f} Hz')


if __name__ == '__main__':
    args = sys.argv[1:]
    contour = '--contour' in args
    for text in [a for a in args if a != '--contour']:
        report(text, contour)
