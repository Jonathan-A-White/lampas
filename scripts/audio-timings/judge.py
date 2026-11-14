#!/usr/bin/env python3
"""The judge of the recorded voice's verse cuts (mw-ar5k42b.1; docs/audio-judge.md).

For every verse of every chapter of a book it reads three things only: the recording (the publisher's chapter MP3), the timings file
(public/data/audio/msb-david/<book>.json) and the verse's text (the maker's own source and normaliser, align.chapter_text and align.words_of; never the maker's
alignment), and says of each edge of each verse whether the clip David's player would play holds MORE than the verse (head-extra, tail-extra: the last sound of
the verse before, the announcement, the next verse's first sound) or LESS (head-clipped, tail-clipped: its own first or last sound cut). A difference in the
middle of a verse (the narrator reads another word) is its own kind, text-differs, never an edge flag.

    python judge.py --book jhn                      # judges the book, writes scripts/audio-timings/judged/msb-david-jhn.json
    python judge.py --book jhn --timings <copy>     # judges another timings file of the same book (a copy, an old commit's)
    python judge.py --book jhn --prove              # the judge is judged: faults planted in a copy of the timings, the table of caught / planted

THE CLIP IS WHAT HE COULD HEAR, AT WORST. The player may start `lead` seconds early and stop `tail` seconds late (player-slop.json, the one file): extra is judged
on the clip at its longest, [start - lead, end + tail]; clipping on the clip at its shortest, [start + lead, end - tail].

THE EARS, cheap first:
  quiet    the recording's own level (RMS of 10 ms frames every 5 ms) against the chapter's speech level. The recording is gated: between phrases it is digital
           silence, so where a sound begins and where it has died is read to 5 ms.
  letters  a letter recogniser with no language model (wav2vec 2.0 BASE 960h, greedy CTC; NOT the maker's model, which is the LARGE LV-60k one) hears the whole
           chapter once. Its letters, paired with the text, say WHOSE each sound is: the verse's own, the next verse's, or nobody's (the announcement, a heading).
           The same model decodes the cut clip's edge for a flag's report.
  words    Whisper (tiny.en, through faster-whisper) hears the cut clip of a verse the cheap ears flag or cannot settle: the clip's first and last words against
           the verse's, and whether a word in the middle differs (heard a second time, told the verse's words, before it is called a difference).
From the quiet and the letters the judge measures, for each verse, four seconds: where the sound before it has died, where its own sound begins, where its own
sound has died, where the next sound begins. The flags are then arithmetic against the clip at its longest and at its shortest (flags_of).

What the ears heard of a recording is kept in the scratch folder (judge/heard, judge/clips), keyed by the MP3's sha256: judging other timings of the same
recording costs seconds. A finished chapter is kept in judge/done, keyed by the timings' sha256, the judge's version and the slops: a run stopped halfway is
taken up where it stopped. --fresh hears and judges everything again.

One process, one chapter at a time, 4 threads: `nice -n 10 ~/.cache/lampas-audio-timings/judge-venv/bin/python -I scripts/audio-timings/judge.py --book jhn`.
The pure parts are tested by test_judge.py (pytest, by hand in the venv; not in the gate).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # under `python -I` the script's own folder is not on the path

import align  # noqa: E402  the maker: its text source, its normaliser, its polite fetch and its decode; never its alignment

words_of = align.words_of

JUDGE_VERSION = '1'
REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
EDITION = align.EDITION
SLOP_PATH = HERE / 'player-slop.json'
SAMPLE_RATE = 16000
KINDS = ['head-extra', 'head-clipped', 'tail-extra', 'tail-clipped', 'text-differs']

# The quiet ear.
FRAME, HOP = 0.010, 0.005
SPEECH_REACH_DB = 35.0  # the chapter's speech level is the median level of the frames within this of its loudest twentieth
QUIET_BELOW_SPEECH = 42.0  # a frame this far below the speech level is quiet (John: speech about -17 dBFS, the gated silence about -90)
MIN_QUIET = 0.03  # a quiet is at least this long; a shorter dip is part of the sound
# The flag rules.
TOLERANCE = 0.02  # a part-sound shorter than this is the measure's own grain (10 ms frames, timings to 10 ms), not a fault
# The letters ear.
LETTERS_MODEL = 'WAV2VEC2_ASR_BASE_960H'
STRIDE = 320  # samples a frame of the letters model: 20 ms
WINDOW_SECONDS, CONTEXT_SECONDS = 20, 2
WORD_QUIET = 0.2  # the letters of one word are never this long a quiet apart: a longer one means the pairing took a look-alike letter from elsewhere
LETTERLESS = 0.4  # more sound than this between a verse's edge letter and its gap, with no letter heard in it, and the edge is not settled by the letters
BETWEEN_LETTERS = 4  # letters nobody owns between two verses are reported from this many: fewer is a word's first letter heard otherwise, not a heading read aloud
EDGE_SECONDS = 1.5  # the cut clip's edge the letters model decodes for a flag's report
# The words ear.
WORDS_MODEL = 'tiny.en'
WORDS_NAMED = 4  # the clip's first or last words a flag reports
# Time zero: the seconds by which this decode (ffmpeg) sits AFTER the browser's clock (Chromium's audio element, currentTime) for the same sound.
# Measured for John 2 (docs/audio-judge.md 'Time zero'); the decoded samples are shifted by it so second 0 here is the element's second 0.
TIME_ZERO = 0.0
EARS = {'letters': f'torchaudio {LETTERS_MODEL}, greedy', 'words': f'faster-whisper {WORDS_MODEL}', 'timeZero': TIME_ZERO}

# The planted faults (AC 3): (the flag it must raise, milliseconds).
PLANTS = [('tail-extra', 50), ('tail-extra', 100), ('tail-extra', 250), ('head-extra', 50), ('head-extra', 100), ('head-extra', 250),
          ('tail-clipped', 100), ('tail-clipped', 250), ('head-clipped', 100), ('head-clipped', 250)]
PLANT_WORDS = {
    'tail-extra': "the end moved to {ms} ms past the NEXT verse's first sound",
    'head-extra': "the start moved to {ms} ms before the end of the verse BEFORE's last sound",
    'tail-clipped': "the end moved {ms} ms before its own last word's end",
    'head-clipped': "the start moved {ms} ms after its own first word's onset",
}
PROVE_SEED = 20261114
PROVE_VERSES = 200


def log(*parts: object) -> None:
    print(*parts, flush=True)


def read_slop(path: Path = SLOP_PATH) -> dict:
    """The player's worst case, from the one file: {'lead': seconds it may start early or late, 'tail': seconds it may stop late or early}."""
    raw = json.loads(path.read_text(encoding='utf8'))
    return {'lead': float(raw['lead']), 'tail': float(raw['tail'])}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The quiet ear: the recording's level
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

class Sound:
    """The level of a chapter's recording: its speech level, its quiets (where the sound has died, where it begins again), and the level of any span."""

    def __init__(self, wave) -> None:
        import numpy as np

        self.np = np
        size, hop = int(FRAME * SAMPLE_RATE), int(HOP * SAMPLE_RATE)
        self.duration = len(wave) / SAMPLE_RATE
        starts = np.arange(0, max(len(wave) - size + 1, 1), hop)
        squares = np.concatenate(([0.0], np.cumsum(wave.astype('float64') ** 2)))
        self.levels = 10 * np.log10((squares[np.minimum(starts + size, len(wave))] - squares[starts]) / size + 1e-12)
        loudest = float(np.percentile(self.levels, 95))
        self.speech = float(np.median(self.levels[self.levels > loudest - SPEECH_REACH_DB]))
        self.floor = self.speech - QUIET_BELOW_SPEECH
        loud = self.levels >= self.floor
        self.loud_before = np.concatenate(([0], np.cumsum(loud)))
        self.quiets: list[tuple[float, float]] = []
        k, count = 0, len(loud)
        while k < count:
            if loud[k]:
                k += 1
                continue
            j = k
            while j < count and not loud[j]:
                j += 1
            # the sound has died by the first quiet frame's start; it begins no earlier than the last quiet frame's end (the maker's gap pass reads it the same way)
            a = 0.0 if k == 0 else k * HOP
            b = self.duration if j == count else (j - 1) * HOP + FRAME
            if b - a >= MIN_QUIET - 1e-9:
                self.quiets.append((round(a, 3), round(b, 3)))
            k = j

    def frames(self, a: float, b: float) -> tuple[int, int]:
        """The frames whose middles lie in a..b: (first, one past the last)."""
        first = max(0, math.ceil((a - FRAME / 2) / HOP - 1e-9))
        last = min(len(self.levels) - 1, math.floor((b - FRAME / 2) / HOP + 1e-9))
        return first, max(first, last + 1)

    def level(self, a: float, b: float) -> float:
        """The loudest frame wholly inside a..b, in dB against the speech level (0 is speech; the gated silence is about -70)."""
        first = max(0, math.ceil(a / HOP - 1e-9))
        last = min(len(self.levels) - 1, math.floor((b - FRAME) / HOP + 1e-9))
        if last < first:
            first = last = min(len(self.levels) - 1, max(0, int(round(((a + b) / 2 - FRAME / 2) / HOP))))
        return float(self.levels[first:last + 1].max() - self.speech)

    def sound_seconds(self, a: float, b: float) -> float:
        """How many seconds of a..b are sound (not quiet)."""
        if b <= a:
            return 0.0
        first, end = self.frames(a, b)
        return float(self.loud_before[end] - self.loud_before[first]) * HOP

    def has_sound(self, a: float, b: float) -> bool:
        return self.sound_seconds(a, b) > 0

    def quiets_between(self, a: float, b: float) -> list[tuple[float, float]]:
        return [q for q in self.quiets if q[0] < b and q[1] > a] if a < b else []

    def quiet_within(self, a: float, b: float) -> float:
        """The longest stretch of quiet inside a..b, in seconds. (A letter may be heard a moment before its sound: a word's first B in the silence of its
        closure. So a quiet is measured between the two seconds asked about, not by the whole quiet that reaches into them.)"""
        return max((min(q[1], b) - max(q[0], a) for q in self.quiets_between(a, b)), default=0.0)

    def quiet_between(self, a: float, b: float, longer_than: float | None = None) -> bool:
        """Is there a quiet between a and b: of MIN_QUIET or more, or longer than `longer_than`."""
        within = self.quiet_within(a, b)
        return within > longer_than if longer_than is not None else within >= MIN_QUIET - 1e-9

    def longest_quiet(self, a: float, b: float) -> tuple[float, float] | None:
        found = self.quiets_between(a, b)
        return max(found, key=lambda q: (q[1] - q[0], -q[0])) if found else None

    def quietest(self, a: float, b: float) -> float:
        """The second of the lowest level between a and b: where a narrator who reads on is most nearly between two words."""
        if b <= a:
            return round((a + b) / 2, 3)
        first, end = self.frames(a, b)
        if end <= first:
            return round((a + b) / 2, 3)
        k = first + int(self.np.argmin(self.levels[first:end]))
        return round(k * HOP + FRAME / 2, 3)


def sound_of(wave) -> Sound:
    return Sound(wave)


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The text: the letters heard paired with the letters of the verses
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def pair_letters(expected: str, heard: str) -> list[int | None]:
    """For each letter heard, the index of the letter of the text it is (the same letter, in order), or None when it is no letter of the text. The pairing
    has the most letters paired and, among those, the most paired side by side (a word's letters together rather than look-alikes taken from here and there)."""
    import numpy as np

    n, m = len(expected), len(heard)
    if m == 0:
        return []
    if n == 0:
        return [None] * m
    letters = np.frombuffer(heard.encode('ascii', 'replace'), dtype=np.uint8)
    kind = np.int16 if 3 * min(n, m) < 30000 else np.int32
    never = -30000 if kind is np.int16 else -(1 << 30)
    # paired[i][j]: the best score of the first i letters of the text against the first j heard, ending with letter i paired with heard letter j (2 a pair, 1 more
    # when the pair before it is the letter before of both); best[i][j]: the best score however it ends.
    paired = [np.full(m + 1, never, dtype=kind)]
    best = [np.zeros(m + 1, dtype=kind)]
    row = np.empty(m + 1, dtype=np.int64)
    for i in range(1, n + 1):
        before_paired, before_best = paired[-1].astype(np.int64), best[-1].astype(np.int64)
        row[0] = never
        row[1:] = np.where(letters == ord(expected[i - 1]), np.maximum(before_paired[:-1] + 3, before_best[:-1] + 2), never)
        paired.append(row.astype(kind))
        best.append(np.maximum.accumulate(np.maximum(row, before_best)).astype(kind))
    pairs: list[int | None] = [None] * m
    i, j = n, m
    in_pair = False
    while i > 0 and j > 0:
        if not in_pair:
            if paired[i][j] == best[i][j]:
                in_pair = True
            elif best[i][j] == best[i][j - 1]:
                j -= 1
            else:
                i -= 1
            continue
        pairs[j - 1] = i - 1
        in_pair = bool(paired[i][j] == paired[i - 1][j - 1] + 3)
        i, j = i - 1, j - 1
    return pairs


def text_of(items: list[list]) -> str:
    """Letters and word marks as text: 'AND|SAID' -> 'AND SAID'."""
    return ' '.join(''.join(' ' if item[0] == '|' else item[0] for item in items).split())


def text_between(heard: list[list], a: float | None, b: float | None) -> str:
    """What the letters ear heard with its middle in a..b."""
    if a is None or b is None or b < a:
        return ''
    return text_of([h for h in heard if a <= (h[1] + h[2]) / 2 <= b])


def measure(verses: list[dict], heard: list[list], sound: Sound) -> dict:
    """Where each verse's own sound begins and has died, and the sound either side of it, from the letters heard (whose is each sound) and the quiets (where it
    begins and dies). `verses` are {'n', 'words'}; `heard` is the letters ear's hearing of the chapter, [label, start, end] with '|' between words.

    Gives {'verses': [{'n', 'before', 'onset', 'end', 'after', 'headReadsOn', 'tailReadsOn', 'headWeak', 'tailWeak', 'suspect'}], 'announcement', 'between',
    'closing'}: `before` is the second the sound before the verse (not its own) has died, None when there is none; `onset` the second its own sound begins; `end`
    the second its own sound has died; `after` the second the next sound begins, None when there is none. Where the narrator reads on with no quiet, the two
    seconds of that edge are one: the quietest instant between the two words. An edge is weak when the letters did not hear its word: its seconds are a guess."""
    letters = [h for h in heard if h[0] != '|']
    expected: list[str] = []
    where: list[tuple[int, int]] = []
    for vi, verse in enumerate(verses):
        for wi, word in enumerate(verse['words']):
            for c in word.upper():
                expected.append(c)
                where.append((vi, wi))
    pairs = pair_letters(''.join(expected), ''.join(h[0] for h in letters))
    matched: dict[tuple[int, int], list[int]] = {}
    for k, e in enumerate(pairs):
        if e is not None:
            matched.setdefault(where[e], []).append(k)

    # A word is heard when enough of its letters were, together: the pairing may take a look-alike letter from elsewhere, which is left out.
    own: list[int | None] = [None] * len(letters)
    heard_words: set[tuple[int, int]] = set()
    for (vi, wi), got in matched.items():
        word = verses[vi]['words'][wi]
        clusters: list[list[int]] = [[got[0]]]
        for a, b in zip(got, got[1:]):
            if b - a > 3 or sound.quiet_between(letters[a][2], letters[b][1], WORD_QUIET):
                clusters.append([])
            clusters[-1].append(b)
        best = max(clusters, key=len)
        if len(best) >= (len(word) if len(word) <= 3 else math.ceil(0.6 * len(word))):
            heard_words.add((vi, wi))
            for k in best:
                own[k] = vi
    spans: dict[int, list[int]] = {}
    for k, vi in enumerate(own):
        if vi is not None:
            spans.setdefault(vi, [k, k])[1] = k
    added: dict[int, list[str]] = {}
    for vi, (first, last) in spans.items():
        run: list[int] = []
        for k in range(first, last + 2):
            if k <= last and own[k] is None:
                run.append(k)
                own[k] = vi  # a letter between a verse's own letters is the verse's: a word heard otherwise, or a word the narrator adds
                continue
            if len(run) >= 3:
                added.setdefault(vi, []).append('+' + ''.join(letters[r][0] for r in run))
            run = []
    # A letter nobody owns that follows a verse's last letter with no quiet between is that verse's (a word's ending heard otherwise); then the same before a first letter.
    for vi in sorted(spans):
        k = spans[vi][1] + 1
        while k < len(letters) and own[k] is None and not sound.quiet_between(letters[k - 1][2], letters[k][1]):
            own[k] = vi
            spans[vi][1] = k
            k += 1
    for vi in sorted(spans):
        k = spans[vi][0] - 1
        while k >= 0 and own[k] is None and not sound.quiet_between(letters[k][2], letters[k + 1][1]):
            own[k] = vi
            spans[vi][0] = k
            k -= 1

    def near(a: float, b: float) -> bool:
        return sound.sound_seconds(a, b) <= LETTERLESS

    out = []
    for vi, verse in enumerate(verses):
        count = len(verse['words'])
        suspect = [w for wi, w in enumerate(verse['words']) if (vi, wi) not in heard_words] + added.get(vi, [])
        row = {'n': verse['n'], 'before': None, 'onset': None, 'end': None, 'after': None, 'headReadsOn': False, 'tailReadsOn': False,
               'headWeak': count == 0 or (vi, 0) not in heard_words, 'tailWeak': count == 0 or (vi, count - 1) not in heard_words, 'suspect': suspect}
        out.append(row)
        if vi not in spans:
            row['headWeak'] = row['tailWeak'] = True
            continue
        first, last = spans[vi]
        t_first, t_last = letters[first][1], letters[last][2]
        if first > 0:
            t_before = letters[first - 1][2]
            gap = sound.longest_quiet(t_before, t_first)
            if gap is None:
                row['before'] = row['onset'] = sound.quietest(t_before, t_first)
                row['headReadsOn'] = True
            else:
                row['before'], row['onset'] = gap
                row['headWeak'] = row['headWeak'] or not near(t_before, gap[0]) or not near(gap[1], t_first)
        else:
            gaps = [q for q in sound.quiets if q[0] < t_first]
            if gaps:
                row['onset'] = gaps[-1][1]
                row['before'] = gaps[-1][0] if sound.has_sound(0.0, gaps[-1][0]) else None
            else:
                row['onset'] = 0.0
            row['headWeak'] = row['headWeak'] or not near(row['onset'], t_first)
        if last + 1 < len(letters):
            t_after = letters[last + 1][1]
            gap = sound.longest_quiet(t_last, t_after)
            if gap is None:
                row['end'] = row['after'] = sound.quietest(t_last, t_after)
                row['tailReadsOn'] = True
            else:
                row['end'], row['after'] = gap
                row['tailWeak'] = row['tailWeak'] or not near(t_last, gap[0]) or not near(gap[1], t_after)
        else:
            closing = sound.quiets[-1] if sound.quiets and sound.quiets[-1][1] >= sound.duration - 0.002 and sound.quiets[-1][1] > t_last else None
            row['end'] = closing[0] if closing else round(sound.duration, 3)
            row['tailWeak'] = row['tailWeak'] or not near(t_last, row['end'])

    with_letters = sorted(spans)
    position = {id(h): k for k, h in enumerate(letters)}
    marks = [position.get(id(h)) for h in heard]  # each heard item's letter index, None for a word mark

    def loose_text(a: int, b: int) -> str:
        """The text of the letters a..b-1 nobody owns, with the word marks between them."""
        items = []
        index = -1
        for h, k in zip(heard, marks):
            if k is not None:
                index = k
                if a <= k < b and own[k] is None:
                    items.append(h)
            elif a <= index + 1 < b and items:
                items.append(h)
        return text_of(items)

    announcement = loose_text(0, spans[with_letters[0]][0]) if with_letters else text_of(heard)
    between = []
    for vi, vj in zip(with_letters, with_letters[1:]):
        text = loose_text(spans[vi][1] + 1, spans[vj][0])
        if len(text.replace(' ', '')) >= BETWEEN_LETTERS:
            between.append({'after': verses[vi]['n'], 'letters': text})
    closing_text = loose_text(spans[with_letters[-1]][1] + 1, len(letters)) if with_letters else ''
    return {'verses': out, 'announcement': announcement, 'between': between, 'closing': closing_text}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The flag rules
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def flags_of(edges: dict, start: float, end: float, slop: dict, sound: Sound | None = None) -> list[dict]:
    """The faults of one verse's cut against its measured sound: the clip at its longest (start - lead to end + tail) must hold nothing of the sound before or
    after the verse, the clip at its shortest (start + lead to end - tail) must lose nothing of the verse's own. `by` is the seconds of it; with the recording's
    level (`sound`) it is the seconds of SOUND in that stretch, so a click of a few frames with silence after it is not counted as the whole stretch. A part-sound
    up to TOLERANCE is not a fault."""
    flags = []

    def flag(kind: str, a: float, b: float, reads_on: bool) -> None:
        by = b - a
        if by > TOLERANCE + 1e-9 and sound is not None:
            by = min(by, sound.sound_seconds(a, b))
        if by > TOLERANCE + 1e-9:
            flags.append({'kind': kind, 'by': round(by, 3), **({'readsOn': True} if reads_on else {})})

    if edges.get('before') is not None:
        flag('head-extra', start - slop['lead'], edges['before'], edges['headReadsOn'])
    if edges.get('onset') is not None:
        flag('head-clipped', edges['onset'], start + slop['lead'], edges['headReadsOn'])
    if edges.get('after') is not None:
        flag('tail-extra', edges['after'], end + slop['tail'], edges['tailReadsOn'])
    if edges.get('end') is not None:
        flag('tail-clipped', end - slop['tail'], edges['end'], edges['tailReadsOn'])
    return flags


def zone_flags(side: str, sound: Sound, edge: float, slop: float) -> list[dict]:
    """An edge the letters could not settle, by the quiet alone: sound anywhere the player may start or stop (edge - slop to edge + slop) is a part-sound in the
    clip or cut from it. Its kind is read from where the sound lies: running on into the clip's inside is the verse's own sound cut, otherwise it is extra."""
    lo, hi = edge - slop, edge + slop
    seconds = sound.sound_seconds(lo, hi)
    if seconds <= TOLERANCE + 1e-9:
        return []
    if side == 'head':
        kind = 'head-clipped' if sound.has_sound(hi, hi + MIN_QUIET) else 'head-extra'
    else:
        kind = 'tail-clipped' if sound.has_sound(lo - MIN_QUIET, lo) else 'tail-extra'
    return [{'kind': kind, 'by': round(seconds, 3), 'ear': 'quiet'}]


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The words ear's comparison
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def edit_distance(a: str, b: str) -> int:
    row = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        new = [i]
        for j, cb in enumerate(b, 1):
            new.append(min(row[j] + 1, new[j - 1] + 1, row[j - 1] + (ca != cb)))
        row = new
    return row[-1]


def close(a: str, b: str) -> bool:
    """The same word, or a spelling of it a recogniser might choose (Cana, Kana): a short word must be the same."""
    if a == b:
        return True
    least = min(len(a), len(b))
    return least > 3 and edit_distance(a, b) <= max(1, least // 4)


def squeezed(letters: str) -> str:
    """The letters with a doubled letter written once."""
    return ''.join(c for k, c in enumerate(letters) if k == 0 or c != letters[k - 1])


def compare_words(expected: list[str], heard: list[str]) -> dict:
    """The words heard in a clip against the verse's words: {'headExtra', 'headMissing', 'tailExtra', 'tailMissing'} are words only added or only lacking at an
    edge; 'middle' is every other difference as [the verse's words, the words heard] (a word replaced at an edge is a difference of text, not a cut)."""
    n, m = len(expected), len(heard)
    cost = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        cost[i][0] = i
    for j in range(m + 1):
        cost[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost[i][j] = min(cost[i - 1][j] + 1, cost[i][j - 1] + 1, cost[i - 1][j - 1] + (0 if close(expected[i - 1], heard[j - 1]) else 1))
    steps = []  # (the verse's word or None, the word heard or None, the same?)
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and close(expected[i - 1], heard[j - 1]) and cost[i][j] == cost[i - 1][j - 1]:
            steps.append((expected[i - 1], heard[j - 1], True))
            i, j = i - 1, j - 1
        elif i > 0 and j > 0 and cost[i][j] == cost[i - 1][j - 1] + 1:
            steps.append((expected[i - 1], heard[j - 1], False))
            i, j = i - 1, j - 1
        elif j > 0 and cost[i][j] == cost[i][j - 1] + 1:
            steps.append((None, heard[j - 1], False))
            j -= 1
        else:
            steps.append((expected[i - 1], None, False))
            i -= 1
    steps.reverse()
    result: dict = {'headExtra': [], 'headMissing': [], 'tailExtra': [], 'tailMissing': [], 'middle': []}
    k = 0
    while k < len(steps):
        if steps[k][2]:
            k += 1
            continue
        e = k
        while e < len(steps) and not steps[e][2]:
            e += 1
        theirs = [s[0] for s in steps[k:e] if s[0] is not None]
        ours = [s[1] for s in steps[k:e] if s[1] is not None]
        at_head, at_tail = k == 0, e == len(steps)
        around = (steps[k - 1] if k else ('', '', True), steps[e] if e < len(steps) else ('', '', True))
        k = e
        if theirs and ours and close(''.join(theirs), ''.join(ours)):
            continue  # one word written as two, or two as one
        if squeezed(around[0][0] + ''.join(theirs) + around[1][0]) == squeezed(around[0][1] + ''.join(ours) + around[1][1]):
            continue  # a sound two words share, written once: 'its sound' heard 'it sound'
        if at_head and not theirs:
            result['headExtra'] = ours
        elif at_tail and not theirs:
            result['tailExtra'] = ours
        elif not ours and (at_head or at_tail):
            if at_head:
                result['headMissing'] = theirs
            if at_tail:
                result['tailMissing'] = theirs
        elif at_head and (cut := next((c for c in range(1, len(ours)) if close(''.join(theirs), ''.join(ours[c:]))), None)) is not None:
            result['headExtra'] = ours[:cut]  # words before the verse's first word, which was heard after them
        elif at_tail and (cut := next((c for c in range(len(ours) - 1, 0, -1) if close(''.join(theirs), ''.join(ours[:c]))), None)) is not None:
            result['tailExtra'] = ours[cut:]
        else:
            result['middle'].append([theirs, ours])
    return result


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# One verse, one chapter
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def judge_verse(verse: dict, triple: list, edges: dict, heard: list[list], sound: Sound, slop: dict, ears) -> dict:
    """One verse's verdict: {'n', 'verdict': 'ok'} or {'n', 'verdict': 'flagged', 'flags': [...]}, with `sound` (the four measured seconds) either way."""
    n, start, end = triple
    long_start, long_end = max(0.0, start - slop['lead']), min(sound.duration, end + slop['tail'])
    short_start, short_end = start + slop['lead'], end - slop['tail']
    flags = []
    for found in flags_of(edges, start, end, slop, sound):
        if not edges['headWeak' if found['kind'].startswith('head') else 'tailWeak']:
            found['level'] = round({
                'head-extra': lambda: sound.level(long_start, edges['before']),
                'head-clipped': lambda: sound.level(edges['onset'], short_start),
                'tail-extra': lambda: sound.level(edges['after'], long_end),
                'tail-clipped': lambda: sound.level(short_end, edges['end']),
            }[found['kind']](), 1)
            flags.append(found)
    if edges['headWeak']:
        flags += zone_flags('head', sound, start, slop['lead'])
    if edges['tailWeak']:
        flags += zone_flags('tail', sound, end, slop['tail'])
    words = None
    if flags or edges['headWeak'] or edges['tailWeak'] or edges['suspect']:
        words = ears.words(long_start, long_end)
        differs = compare_words(verse['words'], words)
        have = {f['kind'] for f in flags}
        for weak, extra, missing, side in ((edges['headWeak'], differs['headExtra'], differs['headMissing'], 'head'),
                                           (edges['tailWeak'], differs['tailExtra'], differs['tailMissing'], 'tail')):
            if weak and extra and f'{side}-extra' not in have:
                flags.append({'kind': f'{side}-extra', 'ear': 'words'})
            if weak and missing and f'{side}-clipped' not in have:
                flags.append({'kind': f'{side}-clipped', 'ear': 'words'})
        # a difference in the middle is one BOTH ears heard at the same words: a word the letters did not hear, or letters they heard that the text has not
        added = any(s.startswith('+') for s in edges['suspect'])
        def both_ears(middle: list) -> list:
            return [[theirs, ours] for theirs, ours in middle if any(w in edges['suspect'] for w in theirs) or (not theirs and added)]

        both = both_ears(differs['middle'])
        if both:
            # ... and it is heard again TOLD the verse's words: a hard word both ears stumble on (John 19:39 'myrrh', heard 'MUR' and 'muh') is then heard as
            # written, while a word that really is another is still heard as it was said (John 3:16 told 'church' still gives 'world')
            both = both_ears(compare_words(verse['words'], ears.words(long_start, long_end, ' '.join(verse['words'])))['middle'])
        if both:
            flags.append({'kind': 'text-differs', 'heard': {'expected': ' … '.join(' '.join(theirs) for theirs, _ in both),
                                                            'words': ' … '.join(' '.join(ours) for _, ours in both)}})
    # a measured clipping is reported from the clip at its SHORTEST (what is left of the verse), everything else from the clip at its longest
    cut_short = any(f['kind'].endswith('clipped') and 'ear' not in f for f in flags) and short_end > short_start
    words_short = ears.words(short_start, short_end) if cut_short else None
    for found in flags:
        kind = found['kind']
        if kind == 'text-differs':
            continue
        told: dict = {}
        measured = 'ear' not in found
        if kind == 'head-extra' and measured:
            told['extra'] = text_between(heard, long_start, edges['before'])
            told['before'] = (text_between(heard, edges['before'] - 1.0, edges['before']).split() or [''])[-1]
        if kind == 'tail-extra' and measured:
            told['extra'] = text_between(heard, edges['after'], long_end)
            told['next'] = (text_between(heard, edges['after'], edges['after'] + 1.0).split() or [''])[0]
        if kind == 'head-clipped' and measured:
            told['lost'] = text_between(heard, edges['onset'], short_start)
        if kind == 'tail-clipped' and measured:
            told['lost'] = text_between(heard, short_end, edges['end'])
        head = kind.startswith('head')
        told = {key: value for key, value in told.items() if value}
        shortest = cut_short and measured and kind.endswith('clipped')
        a, b, said = (short_start, short_end, words_short) if shortest else (long_start, long_end, words)
        told['letters'] = ears.letters(a, min(b, a + EDGE_SECONDS)) if head else ears.letters(max(a, b - EDGE_SECONDS), b)
        told['words'] = ' '.join((said or [])[:WORDS_NAMED] if head else (said or [])[-WORDS_NAMED:])
        found['heard'] = told
    flags.sort(key=lambda f: KINDS.index(f['kind']))
    measured_seconds = [None if edges[k] is None else round(edges[k], 3) for k in ('before', 'onset', 'end', 'after')]
    if not flags:
        return {'n': n, 'verdict': 'ok', 'sound': measured_seconds}
    return {'n': n, 'verdict': 'flagged', 'flags': flags, 'sound': measured_seconds}


def judge_chapter(verses: list[dict], triples: list[list], sound: Sound, heard: list[list], slop: dict, ears) -> dict:
    """A chapter's verdicts: {'announcement', 'between', 'closing', 'speech', 'verses': [...]}."""
    measured = measure(verses, heard, sound)
    numbers = [v['n'] for v in verses]
    if [t[0] for t in triples] != numbers:
        raise align.Stop(f'the timings have verses {[t[0] for t in triples][:5]}... and the text {numbers[:5]}...: not the same verses')
    return {
        'announcement': measured['announcement'], 'between': measured['between'], 'closing': measured['closing'], 'speech': round(sound.speech, 1),
        'verses': [judge_verse(verse, triple, edges, heard, sound, slop, ears) for verse, triple, edges in zip(verses, triples, measured['verses'])],
    }


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The report
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def compact(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def build_report(book: str, edition: str, raw: bytes, slop: dict, chapters: dict[str, dict], source: str | None = None) -> dict:
    verses = [v for chapter in chapters.values() for v in chapter['verses']]
    flags = {kind: 0 for kind in KINDS}
    for verse in verses:
        for found in verse.get('flags', []):
            flags[found['kind']] += 1
    ok = sum(v['verdict'] == 'ok' for v in verses)
    return {
        'v': 1, 'judge': JUDGE_VERSION, 'edition': edition, 'book': book,
        'timings': {**({'file': source} if source else {}), 'sha256': hashlib.sha256(raw).hexdigest()},
        'slop': slop, 'tolerance': TOLERANCE, 'ears': EARS,
        'summary': {'verses': len(verses), 'ok': ok, 'flagged': len(verses) - ok, 'flags': flags},
        'chapters': chapters,
    }


def dumps(report: dict) -> str:
    """The report as JSON with one verse to a line, so a change of one verdict is one line of a diff."""
    lines = ['{']
    for key, value in report.items():
        if key != 'chapters':
            lines.append(f' {compact(key)}:{compact(value)},')
    lines.append(' "chapters":{')
    chapters = list(report['chapters'].items())
    for ci, (name, chapter) in enumerate(chapters):
        rest = ''.join(f'{compact(key)}:{compact(value)},' for key, value in chapter.items() if key != 'verses')
        lines.append(f'  {compact(name)}:{{{rest}"verses":[')
        for vi, verse in enumerate(chapter['verses']):
            lines.append('   ' + compact(verse) + (',' if vi + 1 < len(chapter['verses']) else ''))
        lines.append('  ]}' + (',' if ci + 1 < len(chapters) else ''))
    lines += [' }', '}']
    return '\n'.join(lines) + '\n'


def run_key(raw: bytes, slop: dict) -> str:
    return hashlib.sha256(raw + compact([JUDGE_VERSION, slop, TOLERANCE, EARS]).encode()).hexdigest()[:16]


def run_book(book: str, raw: bytes, slop: dict, judge_one, out: Path, work: Path, source: str | None = None, fresh: bool = False, only: list[int] | None = None) -> dict | None:
    """Judges every chapter of the timings (`raw`, the file's bytes) with judge_one(chapter, triples) and writes the report. A finished chapter is kept in
    `work`, under a key of the timings' bytes, the judge's version and the slops, and is not judged again; the report is written only when every chapter is done."""
    timings = json.loads(raw)
    folder = work / run_key(raw, slop)
    folder.mkdir(parents=True, exist_ok=True)
    chapters: dict[str, dict] = {}
    names = sorted(timings['chapters'], key=int)
    for name in names:
        done = folder / f'{name}.json'
        if done.exists() and not fresh:
            chapters[name] = json.loads(done.read_text(encoding='utf8'))
            continue
        if only is not None and int(name) not in only:
            continue
        result = judge_one(int(name), timings['chapters'][name]['verses'])
        part = done.with_suffix('.part')
        part.write_text(compact(result), encoding='utf8')
        part.replace(done)
        chapters[name] = json.loads(done.read_text(encoding='utf8'))
    if len(chapters) != len(names):
        return None
    report = build_report(book, timings.get('edition', EDITION), raw, slop, chapters, source)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(dumps(report), encoding='utf8')
    return report


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The planted faults
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def plant(triples: list[list], gaps: dict[int, tuple[float, float]], n: int, kind: str, ms: int) -> list | None:
    """Verse n's triple with a fault planted, or None where the gap it needs was not measured. `gaps` is the MAKER's measure (scripts/audio-timings/quiet/), read
    for planting only: verse -> (the second its last sound died, the second the next verse's first sound begins)."""
    at = next(i for i, t in enumerate(triples) if t[0] == n)
    _, start, end = triples[at]
    before = gaps.get(triples[at - 1][0]) if at > 0 else None
    after = gaps.get(n) if at + 1 < len(triples) else None
    by = ms / 1000
    if kind == 'tail-extra':
        return None if after is None else [n, start, round(after[1] + by, 3)]
    if kind == 'tail-clipped':
        return None if after is None else [n, start, round(after[0] - by, 3)]
    if kind == 'head-extra':
        return None if before is None else [n, round(before[0] - by, 3), end]
    if kind == 'head-clipped':
        return None if before is None else [n, round(before[1] + by, 3), end]
    raise ValueError(kind)


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The real ears (models; nothing below is run by test_judge.py)
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def file_sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            digest.update(block)
    return digest.hexdigest()


def load_wave(path: Path):
    """The MP3 as 16 kHz mono samples whose second 0 is the browser's (TIME_ZERO)."""
    import numpy as np

    wave = align.decode(path)
    shift = int(round(TIME_ZERO * SAMPLE_RATE))
    if shift > 0:
        return wave[shift:].copy()
    if shift < 0:
        return np.concatenate((np.zeros(-shift, dtype=wave.dtype), wave))
    return wave


class Models:
    """The two recognisers, loaded when first asked."""

    def __init__(self, scratch: Path, threads: int) -> None:
        self.scratch, self.threads = scratch, threads
        self.ctc = self.labels = self.torch = self.whisper = None
        self.seconds = {'letters': 0.0, 'words': 0.0}

    def emissions(self, wave):
        """The letters model's class of each 20 ms frame, made in windows so a long chapter fits in memory."""
        if self.ctc is None:
            import torch
            import torchaudio

            torch.set_num_threads(self.threads)
            torch.hub.set_dir(str(self.scratch / 'torch' / 'hub'))
            bundle = getattr(torchaudio.pipelines, LETTERS_MODEL)
            self.torch, self.ctc, self.labels = torch, bundle.get_model().eval(), bundle.get_labels()
        torch = self.torch
        core, context = WINDOW_SECONDS * SAMPLE_RATE, CONTEXT_SECONDS * SAMPLE_RATE
        started = time.monotonic()
        pieces = []
        with torch.inference_mode():
            for start in range(0, len(wave), core):
                a, b = max(0, start - context), min(len(wave), start + core + context)
                out, _ = self.ctc(torch.from_numpy(wave[a:b])[None])
                lead = (start - a) // STRIDE
                pieces.append(out[0][lead:] if start + core >= len(wave) else out[0][lead:lead + core // STRIDE])
        self.seconds['letters'] += time.monotonic() - started
        return torch.cat(pieces, dim=0).argmax(dim=-1).tolist()

    def letters(self, wave) -> list[list]:
        """What the letters model hears: [label, start, end] of each run of one letter (or '|', a word mark), greedy, no language model."""
        if len(wave) < 2 * STRIDE:
            return []
        ids = self.emissions(wave)
        heard = []
        run_start = 0
        for f in range(1, len(ids) + 1):
            if f == len(ids) or ids[f] != ids[run_start]:
                if ids[run_start] != 0:
                    heard.append([self.labels[ids[run_start]], round(run_start * STRIDE / SAMPLE_RATE, 3), round(f * STRIDE / SAMPLE_RATE, 3)])
                run_start = f
        return heard

    def words(self, wave, hint: str | None = None) -> list[str]:
        """What Whisper hears in a clip, as the maker's normaliser's words; `hint` is text it is told came before (the verse's own words, for a second hearing)."""
        if self.whisper is None:
            from faster_whisper import WhisperModel

            self.whisper = WhisperModel(WORDS_MODEL, device='cpu', compute_type='int8', cpu_threads=self.threads, download_root=str(self.scratch / 'whisper'))
        started = time.monotonic()
        segments, _ = self.whisper.transcribe(wave, language='en', beam_size=1, temperature=0.0, condition_on_previous_text=False, without_timestamps=True,
                                               initial_prompt=hint)
        text = ' '.join(segment.text.strip() for segment in segments)
        self.seconds['words'] += time.monotonic() - started
        return words_of(text)[0]


class ClipEars:
    """The ears on cut clips of one chapter's recording; what they heard is kept by the clip's seconds."""

    def __init__(self, models: Models, wave, path: Path, fresh: bool) -> None:
        self.models, self.wave, self.path = models, wave, path
        self.before = json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
        self.kept = {} if fresh else dict(self.before)  # a fresh run reads nothing kept; what it does not hear again is still kept for other timings
        self.changed = False
        self.asked = 0

    def cut(self, a: float, b: float):
        return self.wave[max(0, int(round(a * SAMPLE_RATE))):max(0, int(round(b * SAMPLE_RATE)))]

    def words(self, a: float, b: float, hint: str | None = None) -> list[str]:
        self.asked += 1
        key = f'w {a:.3f} {b:.3f}' + (f' told {hashlib.sha256(hint.encode()).hexdigest()[:12]}' if hint else '')
        if key not in self.kept:
            self.kept[key] = self.models.words(self.cut(a, b), hint)
            self.changed = True
        return self.kept[key]

    def letters(self, a: float, b: float) -> str:
        import numpy as np

        key = f'l {a:.3f} {b:.3f}'
        if key not in self.kept:
            quiet = np.zeros(SAMPLE_RATE // 4, dtype='float32')  # a quarter second of silence either side: the clip as it would be heard, cut
            self.kept[key] = text_of(self.models.letters(np.concatenate((quiet, self.cut(a, b), quiet))))
            self.changed = True
        return self.kept[key]

    def save(self) -> None:
        if self.changed:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            part = self.path.with_suffix('.part')
            part.write_text(compact({**self.before, **self.kept}), encoding='utf8')
            part.replace(self.path)
            self.changed = False


class Recording:
    """One chapter's recording, heard: its samples, its level, what the letters ear heard of the whole of it, and ears for its clips."""

    def __init__(self, book: str, chapter: int, scratch: Path, models: Models, fetcher, fresh: bool) -> None:
        url = align.audio_url(book, chapter)
        mp3 = fetcher.get(url, scratch / 'mp3' / Path(url).name)
        sha = file_sha(mp3)[:16]
        self.wave = load_wave(mp3)
        self.sound = sound_of(self.wave)
        kept = scratch / 'judge' / 'heard' / f'{mp3.stem}.{sha}.{LETTERS_MODEL}.json'
        if kept.exists() and not fresh:
            self.heard = json.loads(kept.read_text(encoding='utf8'))
        else:
            self.heard = models.letters(self.wave)
            kept.parent.mkdir(parents=True, exist_ok=True)
            part = kept.with_suffix('.part')
            part.write_text(compact(self.heard), encoding='utf8')
            part.replace(kept)
        self.ears = ClipEars(models, self.wave, scratch / 'judge' / 'clips' / f'{mp3.stem}.{sha}.json', fresh)
        self.verses = [{'n': v['n'], 'words': v['words']} for v in align.chapter_text(book, chapter)]


def maker_gaps(book: str, chapter: int) -> dict[int, tuple[float, float]]:
    """The maker's measure of each gap of a chapter (scripts/audio-timings/quiet/): verse -> (its last sound died, the next verse's first sound). For planting only."""
    rows = json.loads(align.quiet_path(book).read_text(encoding='utf8'))['chapters'][str(chapter)]
    return {row[0]: (row[1], row[2]) for row in rows if row[1] is not None}


def prove(book: str, raw: bytes, slop: dict, scratch: Path, models: Models, fetcher, seed: int, count: int, fresh: bool) -> dict:
    """The judge is judged. On `count` verses drawn by `seed` from those with a measured gap either side, each fault of PLANTS is planted in a copy of the
    verse's timings and the verse judged again: caught when the verdict has the planted kind. The same verses unplanted are judged too (the false alarms).
    Also, for verse 1 of every chapter: the start moved before the end of the announcement's last sound (found by the maker's own quiet_of)."""
    timings = json.loads(raw)['chapters']
    eligible = []
    for name in sorted(timings, key=int):
        gaps = maker_gaps(book, int(name))
        triples = timings[name]['verses']
        eligible += [(int(name), t[0]) for i, t in enumerate(triples) if 0 < i < len(triples) - 1 and triples[i - 1][0] in gaps and t[0] in gaps]
    chosen = sorted(random.Random(seed).sample(eligible, min(count, len(eligible))))
    rows = {f'{kind} {ms}': {'planted': 0, 'caught': 0, 'missed': []} for kind, ms in PLANTS}
    rows.update({f'announcement {ms}': {'planted': 0, 'caught': 0, 'missed': []} for ms in (50, 100, 250)})
    unplanted = []
    for name in sorted(timings, key=int):
        chapter = int(name)
        triples = timings[name]['verses']
        mine = [n for c, n in chosen if c == chapter]
        recording = Recording(book, chapter, scratch, models, fetcher, fresh)
        measured = measure(recording.verses, recording.heard, recording.sound)
        gaps = maker_gaps(book, chapter)

        def verdict(index: int, triple: list) -> dict:
            return judge_verse(recording.verses[index], triple, measured['verses'][index], recording.heard, recording.sound, slop, recording.ears)

        for n in mine:
            index = next(i for i, t in enumerate(triples) if t[0] == n)
            plain = verdict(index, triples[index])
            if plain['verdict'] != 'ok':
                unplanted.append({'verse': f'{chapter}:{n}', 'timing': triples[index], **plain})
            for kind, ms in PLANTS:
                planted = plant(triples, gaps, n, kind, ms)
                row = rows[f'{kind} {ms}']
                row['planted'] += 1
                result = verdict(index, planted)
                if kind in [f['kind'] for f in result.get('flags', [])]:
                    row['caught'] += 1
                else:
                    row['missed'].append({'verse': f'{chapter}:{n}', 'planted': planted, 'was': triples[index], 'maker': [gaps[triples[index - 1][0]], gaps[n]], **result})
        first = triples[0]
        found = None
        for back in (1.5, 3.0, 6.0):  # the maker's own reading of the quiet verse 1's start lies in: its search is widened until it holds the announcement's end
            found = align.quiet_of(recording.wave, max(0.0, first[1] - back), first[1], 0.0, first[2])
            if found is not None and found[0] <= first[1] + 0.2 and found[1] >= first[1] - 0.2:
                break
            found = None
        if found is not None:
            for ms in (50, 100, 250):
                row = rows[f'announcement {ms}']
                row['planted'] += 1
                planted = [first[0], round(found[0] - ms / 1000, 3), first[2]]
                result = verdict(0, planted)
                if 'head-extra' in [f['kind'] for f in result.get('flags', [])]:
                    row['caught'] += 1
                else:
                    row['missed'].append({'verse': f'{chapter}:{first[0]}', 'planted': planted, 'was': first, 'maker': list(found), **result})
        recording.ears.save()
        log(f'chapter {chapter:2d}: {len(mine):3d} verses, words ear asked {recording.ears.asked} times')
    return {'seed': seed, 'verses': len(chosen), 'chosen': [f'{c}:{n}' for c, n in chosen], 'rows': rows, 'unplanted': unplanted}


def print_proof(proof: dict) -> None:
    log(f'\nplanted faults: {proof["verses"]} verses drawn by seed {proof["seed"]}')
    log(f'{"the fault planted":<78s} caught / planted')
    for name, row in proof['rows'].items():
        kind, ms = name.rsplit(' ', 1)
        words = PLANT_WORDS[kind].format(ms=ms) if kind in PLANT_WORDS else f"verse 1's start moved to {ms} ms before the end of the announcement's last sound"
        log(f'{words:<78s} {row["caught"]:4d} / {row["planted"]:<4d} {100 * row["caught"] / max(1, row["planted"]):6.1f}%')
        for miss in row['missed']:
            log(f'    MISSED {miss["verse"]}: planted {miss["planted"]} (was {miss["was"]}); the maker {miss["maker"]}; the judge heard {miss.get("sound")}, said {[f["kind"] for f in miss.get("flags", [])] or "ok"}')
    log(f'the same {proof["verses"]} verses unplanted: {len(proof["unplanted"])} flagged')
    for verse in proof['unplanted']:
        log(f'    {verse["verse"]} {verse["timing"]} sound {verse["sound"]}: ' + '; '.join(compact(f) for f in verse['flags']))


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Judges every verse of a book's timings of the recorded voice against the recording.")
    parser.add_argument('--book', required=True, choices=sorted(align.BOOKS))
    parser.add_argument('--timings', type=Path, help='the timings file to judge (default: public/data/audio/<edition>/<book>.json)')
    parser.add_argument('--out', type=Path, help='the report (default: scripts/audio-timings/judged/<edition>-<book>.json)')
    parser.add_argument('--scratch', type=Path, default=align.SCRATCH_DEFAULT, help='the folder of the MP3s, the weights and what the ears heard, outside the repo')
    parser.add_argument('--chapters', help='comma-separated chapters to judge now (the report is written once every chapter of the timings is done)')
    parser.add_argument('--fresh', action='store_true', help='hear and judge everything again: nothing kept from an earlier run is read')
    parser.add_argument('--threads', type=int, default=4)
    parser.add_argument('--prove', action='store_true', help='plant faults in a copy of the timings and print caught / planted')
    parser.add_argument('--seed', type=int, default=PROVE_SEED)
    parser.add_argument('--verses', type=int, default=PROVE_VERSES)
    parser.add_argument('--proof-out', type=Path, help='with --prove: write the whole proof (misses, unplanted flags) as JSON here')
    args = parser.parse_args()
    scratch = args.scratch.expanduser().resolve()
    if REPO in scratch.parents or scratch == REPO:
        log('STOP: the scratch folder must be outside the repo')
        return 2
    (scratch / 'mp3').mkdir(parents=True, exist_ok=True)
    source = args.timings or REPO / 'public' / 'data' / 'audio' / EDITION / f'{args.book}.json'
    out = args.out or HERE / 'judged' / f'{EDITION}-{args.book}.json'
    raw = source.read_bytes()
    slop = read_slop()
    models = Models(scratch, args.threads)
    fetcher = align.Fetcher()
    started = time.monotonic()
    audio = {'seconds': 0.0, 'asked': 0}
    try:
        if args.prove:
            proof = prove(args.book, raw, slop, scratch, models, fetcher, args.seed, args.verses, args.fresh)
            print_proof(proof)
            if args.proof_out:
                args.proof_out.write_text(json.dumps(proof, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
            log(f'whole proof {time.monotonic() - started:.0f} s (letters model {models.seconds["letters"]:.0f} s, words model {models.seconds["words"]:.0f} s)')
            return 0

        def judge_one(chapter: int, triples: list[list]) -> dict:
            t0 = time.monotonic()
            recording = Recording(args.book, chapter, scratch, models, fetcher, args.fresh)
            result = judge_chapter(recording.verses, triples, recording.sound, recording.heard, slop, recording.ears)
            recording.ears.save()
            audio['seconds'] += recording.sound.duration
            audio['asked'] += recording.ears.asked
            flagged = [f'{v["n"]} {"+".join(f["kind"] for f in v["flags"])}' for v in result['verses'] if v['verdict'] != 'ok']
            log(f'chapter {chapter:2d}: {len(triples):3d} verses, {recording.sound.duration:6.1f} s of audio, speech {recording.sound.speech:5.1f} dBFS, '
                f'words ear asked {recording.ears.asked:3d} times, {time.monotonic() - t0:5.1f} s; announcement {result["announcement"]!r}; flagged: {", ".join(flagged) or "none"}')
            return result

        try:
            shown = str(source.resolve().relative_to(REPO))
        except ValueError:
            shown = source.name
        report = run_book(args.book, raw, slop, judge_one, out, scratch / 'judge' / 'done' / f'{EDITION}-{args.book}', shown, args.fresh,
                          [int(c) for c in args.chapters.split(',')] if args.chapters else None)
        wall = time.monotonic() - started
        if audio['seconds']:
            log(f'judged {audio["seconds"] / 60:.1f} minutes of audio in {wall:.0f} s: {wall / (audio["seconds"] / 60):.2f} wall seconds a minute of audio '
                f'(letters model {models.seconds["letters"]:.0f} s, words model {models.seconds["words"]:.0f} s, words ear asked {audio["asked"]} times)')
        if report is None:
            log('not every chapter is judged yet: no report written')
            return 0
        summary = report['summary']
        log(f'{args.book}: {summary["verses"]} verses judged, {summary["ok"]} ok, {summary["flagged"]} flagged; ' + ', '.join(f'{k} {v}' for k, v in summary['flags'].items()))
        log(f'timings sha256 {report["timings"]["sha256"]}; report {out}')
        return 0
    except align.Stop as stop:
        log(f'STOP: {stop}')
        return 2


if __name__ == '__main__':
    sys.exit(main())
