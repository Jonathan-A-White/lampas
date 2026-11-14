#!/usr/bin/env python3
"""The timing maker of the recorded voice (mw-82lb97i.2; docs/data.md 'Recorded audio timings').

Fetches each chapter MP3 of a book from the publisher, aligns it to Lampas's MSB verse text (public/data/<book>/<n>.json) with an English wav2vec2 CTC model
(torchaudio.functional.forced_align), and writes when each verse starts and ends to public/data/audio/msb-david/<book>.json (and the book into index.json).
Any of the 66 books of BOOKS. A run that stops part way is started again with the same command: a chapter already in the book file is skipped unless --redo.
The MP3s stay in a scratch folder OUTSIDE the repo (default ~/.cache/lampas-audio-timings/mp3) and are never committed, copied to our server or put under public/.

    python align.py --book jhn [--chapters 3,4] [--scratch <dir>] [--allow-flagged 3:5,7:12] [--redo]
    python align.py --book jhn --check          # the sanity check: 20 verses decoded back from the audio between their start and end
    python align.py --book jhn --gaps           # the gap pass alone, on the timings already written: no model, no alignment (a minute for John)

WHAT ALLOWS THE DOWNLOAD (the Mayor's reading, 2026-11-11): the publisher offers these files as public downloads ('Audio Downloads' at
https://openbible.com/audio.htm: per-chapter files and a zip of all chapters); the site has no robots.txt rules; the MSB text is public domain
(https://berean.bible/terms.htm: 'All uses are freely permitted'). The fetch is polite: ONE sequential request per chapter file, 2 s between files, a generic
User-Agent ('lampas-audio-timings/1'; no name, no email), a file already whole in the scratch folder is never fetched again, at most 2 retries a file with a
growing wait (only for a lost connection), and a 4xx or 5xx stops the run rather than hammering.

THE WEIGHTS: torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H, wav2vec 2.0 large (LV-60k, fine-tuned on 960 h of LibriSpeech), English letters. Its licence is quoted at
https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H.html: 'Originally published by the authors of wav2vec 2.0
[Baevski et al., 2020] under MIT License and redistributed with the same license.' (Not the MMS forced-aligner weights, which are CC-BY-NC.)
The method is that of https://github.com/BSB-publishing/bsb-align (MIT); none of its timing data is used.

THE GAP PASS (mw-82lb97i.27): the narrator's recording is gated, so between two verses it is digital silence (about -90 dBFS; speech is above -45). After the
alignment, and alone under --gaps, each verse's END is moved by the recording's energy (RMS of 10 ms frames, read only around the gap, no word aligned again) to
END_AFTER_SOUND seconds after the verse's last sound has died away: the start of the quiet, so a player that stops late has the whole of the quiet before the next
verse's first sound, never less than MIN_BEFORE_ONSET. What was measured of each gap (where the quiet starts, where the next verse's sound begins) is written to
scripts/audio-timings/quiet/<edition>-<book>.json, which tests/unit/audio-timings-data.test.ts holds the timings to. Starts are not moved.

One process, one chapter at a time, torch on 4 threads: start it as `nice -n 10 ~/.cache/lampas-audio-timings/venv/bin/python scripts/audio-timings/align.py --book jhn`.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from http.client import IncompleteRead
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EDITION = 'msb-david'
VOICE = 'David'
USER_AGENT = 'lampas-audio-timings/1'
FETCH_GAP_SECONDS = 2.0
MAX_RETRIES = 2
RETRY_WAIT_SECONDS = (10.0, 30.0)
SAMPLE_RATE = 16000
STRIDE = 320  # samples a frame of the model: 20 ms
WINDOW_SECONDS = 20  # emissions are made in windows of this core length ...
CONTEXT_SECONDS = 2  # ... with this much audio on each side that the frames of are dropped
TORCH_THREADS = 4
# A CTC model puts a letter at the middle of its sound, so a word's aligned span starts a little late and ends a little early (a verse's first word was heard
# clipped in 9 of John 3's 36 verses, its last word in 5). Each verse is widened by these seconds into the gap around it, never past the middle of the gap.
PAD_START, PAD_END = 0.15, 0.25
# The gap pass: a frame of FRAME_SECONDS every HOP_SECONDS is quiet below QUIET_DB (dBFS of its RMS); a quiet of the gap is at least MIN_QUIET long and is looked for
# from REACH before the aligned end to REACH after the aligned next start, inside the two verses.
FRAME_SECONDS, HOP_SECONDS = 0.010, 0.005
QUIET_DB = -60.0
MIN_QUIET = 0.06
REACH = 0.75
END_AFTER_SOUND = 0.05  # a verse ends this long after its last sound died: the player stops in the 50 ms before the end (src/speech/recordedVoice.ts END_SLACK)
MIN_BEFORE_ONSET = 0.05  # and never nearer than this to the next verse's first sound
SPW_MIN, SPW_MAX = 0.12, 1.5  # seconds a word of a verse: outside this the chapter is left out
CHECK_VERSES = 20
CHECK_PASS = 18
CHECK_SEED = 20261111
SCRATCH_DEFAULT = Path.home() / '.cache' / 'lampas-audio-timings'

# Lampas's book code -> (the publisher's two-digit book number, its three-letter code), the parts of a chapter file's name MSB_<nn>_<Abc>_<ccc>_D.mp3. Read 2026-11-13 from the
# publisher's own list of the chapter files (https://openbible.com/audio/msb/: 1,189 files, 66 books, each book's chapters as Lampas's) and checked by one HEAD request of
# chapter 1 of each book (all 66 answered 200 audio/mpeg). Note Titus: the publisher's code is Tts, not Tit. docs/data.md 'The book table'.
BOOKS = {
    'gen': (1, 'Gen'), 'exo': (2, 'Exo'), 'lev': (3, 'Lev'), 'num': (4, 'Num'),
    'deu': (5, 'Deu'), 'jos': (6, 'Jos'), 'jdg': (7, 'Jdg'), 'rut': (8, 'Rut'),
    '1sa': (9, '1Sa'), '2sa': (10, '2Sa'), '1ki': (11, '1Ki'), '2ki': (12, '2Ki'),
    '1ch': (13, '1Ch'), '2ch': (14, '2Ch'), 'ezr': (15, 'Ezr'), 'neh': (16, 'Neh'),
    'est': (17, 'Est'), 'job': (18, 'Job'), 'psa': (19, 'Psa'), 'pro': (20, 'Pro'),
    'ecc': (21, 'Ecc'), 'sng': (22, 'Sng'), 'isa': (23, 'Isa'), 'jer': (24, 'Jer'),
    'lam': (25, 'Lam'), 'ezk': (26, 'Ezk'), 'dan': (27, 'Dan'), 'hos': (28, 'Hos'),
    'jol': (29, 'Jol'), 'amo': (30, 'Amo'), 'oba': (31, 'Oba'), 'jon': (32, 'Jon'),
    'mic': (33, 'Mic'), 'nam': (34, 'Nam'), 'hab': (35, 'Hab'), 'zep': (36, 'Zep'),
    'hag': (37, 'Hag'), 'zec': (38, 'Zec'), 'mal': (39, 'Mal'), 'mat': (40, 'Mat'),
    'mrk': (41, 'Mrk'), 'luk': (42, 'Luk'), 'jhn': (43, 'Jhn'), 'act': (44, 'Act'),
    'rom': (45, 'Rom'), '1co': (46, '1Co'), '2co': (47, '2Co'), 'gal': (48, 'Gal'),
    'eph': (49, 'Eph'), 'php': (50, 'Php'), 'col': (51, 'Col'), '1th': (52, '1Th'),
    '2th': (53, '2Th'), '1ti': (54, '1Ti'), '2ti': (55, '2Ti'), 'tit': (56, 'Tts'),
    'phm': (57, 'Phm'), 'heb': (58, 'Heb'), 'jas': (59, 'Jas'), '1pe': (60, '1Pe'),
    '2pe': (61, '2Pe'), '1jn': (62, '1Jn'), '2jn': (63, '2Jn'), '3jn': (64, '3Jn'),
    'jud': (65, 'Jud'), 'rev': (66, 'Rev'),
}

# Punctuation a verse's text may carry, dropped without a word. Any other character that is not a letter is printed.
KNOWN_PUNCTUATION = set('.,;:!?"“”„‘’\'()[]{}—–-…')
SPLITTERS = re.compile(r'[\s—–\-…/]+')


def log(*parts: object) -> None:
    print(*parts, flush=True)


class Stop(Exception):
    """The run stops (a refusal by the server, a missing file), not retried."""


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The text: a verse as the model's letters
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
        'sixteen', 'seventeen', 'eighteen', 'nineteen']
TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def spell(n: int) -> list[str]:
    """A whole number as English words ('153' -> one hundred fifty three)."""
    if n < 20:
        return [ONES[n]]
    if n < 100:
        return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000:
        return [ONES[n // 100], 'hundred'] + (spell(n % 100) if n % 100 else [])
    if n < 1_000_000:
        return spell(n // 1000) + ['thousand'] + (spell(n % 1000) if n % 1000 else [])
    if n < 1_000_000_000:
        return spell(n // 1_000_000) + ['million'] + (spell(n % 1_000_000) if n % 1_000_000 else [])
    raise ValueError(n)


def words_of(text: str) -> tuple[list[str], list[str]]:
    """The words of a verse's English as the model's letters (a-z and the apostrophe), and the tokens it could not turn into letters."""
    decomposed = unicodedata.normalize('NFKD', text)
    decomposed = ''.join(c for c in decomposed if not unicodedata.combining(c))
    decomposed = decomposed.replace('’', "'").replace('‘', "'").replace('ʼ', "'")
    words: list[str] = []
    unconverted: list[str] = []
    for token in SPLITTERS.split(decomposed):
        if token == '':
            continue
        if any(c.isdigit() for c in token):
            bare = token.strip('.,;:!?"“”\'()[]')
            if re.fullmatch(r'\d{1,3}(,\d{3})+|\d+', bare):
                words.extend(spell(int(bare.replace(',', ''))))
            else:
                unconverted.append(token)
            continue
        kept = ''.join(c for c in token.lower() if ('a' <= c <= 'z') or c == "'")
        odd = [c for c in token if not (c.isalpha() and c.isascii()) and c != "'" and c not in KNOWN_PUNCTUATION]
        if odd or (kept.strip("'") == '' and any(c.isalpha() for c in token)):
            unconverted.append(token)
        kept = kept.strip("'")
        if kept:
            words.append(kept)
    return words, unconverted


SOF_PASUQ = '\u05c3'  # the mark that ends a Hebrew verse, at the end of the last Hebrew word of it


def title_chunks(book: str, verses: list[dict]) -> int:
    """How many of the leading English chunks of the chapter's first verse are a Psalm's title (its superscription), as stored in public/data/psa/<n>.json.

    The text holds the title INSIDE verse 1 (English numbering: 'A Psalm of David, when he fled from his son Absalom.' then 'O LORD, how my foes have increased!'),
    with the section heading in `h`, so nothing marks where the title ends. The Hebrew words `g` do: the Hebrew Psalm has one verse more than the English for a title of one
    verse (Psalm 3) and two more for a title of two (Psalm 51), each Hebrew verse ending in a sof pasuq. The title is the chunks whose Hebrew words lie in those first
    verses. Only Psalms (no other book keeps a title in a verse's text); 62 of the 150 have one."""
    if book != 'psa' or not verses:
        return 0
    hebrew = sum(SOF_PASUQ in w['t'] for v in verses for w in v['g'])
    extra = hebrew - len(verses)
    if extra <= 0:
        return 0
    last, seen = None, 0
    for i, w in enumerate(verses[0]['g']):
        if SOF_PASUQ in w['t']:
            seen += 1
            if seen == extra:
                last = i
                break
    if last is None:
        return 0
    chunks = 0
    for chunk in verses[0]['e']:
        if any(i > last for i in chunk.get('g', [])):
            break
        chunks += 1
    return chunks if chunks < len(verses[0]['e']) else 0  # a title with no verse after it is not a title


def chapter_text(book: str, chapter: int) -> list[dict]:
    """The verses of public/data/<book>/<chapter>.json: {n, heading, words, unconverted, text, title_words}. `title_words` is how many of the first words of
    the chapter's first verse are a Psalm's title (0 for any other verse): they stay in `words`, because the narrator reads the title as the start of verse 1."""
    data = json.loads((REPO / 'public' / 'data' / book / f'{chapter}.json').read_text(encoding='utf8'))
    titled = title_chunks(book, data['verses'])
    verses = []
    for k, v in enumerate(data['verses']):
        text = ' '.join(chunk['t'] for chunk in v['e'])
        words, unconverted = words_of(text)
        title_words = len(words_of(' '.join(chunk['t'] for chunk in v['e'][:titled]))[0]) if k == 0 and titled else 0
        verses.append({'n': v['n'], 'heading': bool(v.get('h')), 'words': words, 'unconverted': unconverted, 'text': text, 'title_words': title_words})
    return verses


def build_items(verses: list[dict], skip_title: bool = False) -> list[dict]:
    """The sequence the aligner is given: a wildcard (the narrator's 'Audio Bible, Psalm three'), then each verse's words, with a wildcard before a verse that has a heading
    (read or not) and one after the last verse. A Psalm's title is read as the start of verse 1 (the title's words are aligned and verse 1 begins at its first word); under
    `skip_title` (the retry of a Psalm whose first try failed its checks, because the narrator did not read the title) the title is treated like a heading instead: the
    opening wildcard takes it and verse 1 begins at the first word after it."""
    items: list[dict] = [{'star': True}]
    for v in verses:
        if v['heading'] and v['n'] != verses[0]['n']:
            items.append({'star': True})  # a section heading read before this verse
        words = v['words'][v['title_words']:] if skip_title else v['words']
        for i, w in enumerate(words):
            items.append({'word': w, 'verse': v['n'], 'first': i == 0, 'last': i == len(words) - 1})
    items.append({'star': True})  # a closing line
    return items


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The audio: a polite fetch and a decode
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def audio_url(book: str, chapter: int) -> str:
    nn, abc = BOOKS[book]
    return f'https://openbible.com/audio/msb/MSB_{nn:02d}_{abc}_{chapter:03d}_D.mp3'


def looks_like_mp3(path: Path) -> bool:
    with path.open('rb') as f:
        head = f.read(3)
    return head == b'ID3' or (len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)


class Fetcher:
    """One sequential request per file, FETCH_GAP_SECONDS between files, never a file already whole in the scratch folder."""

    def __init__(self) -> None:
        self.last_end = 0.0
        self.fetched = 0
        self.requests = 0

    def get(self, url: str, dest: Path) -> Path:
        if dest.exists() and dest.stat().st_size > 0 and looks_like_mp3(dest):
            log(f'have    {dest.name} ({dest.stat().st_size} bytes): not fetched again')
            return dest
        part = dest.with_suffix(dest.suffix + '.part')
        for attempt in range(MAX_RETRIES + 1):
            wait = FETCH_GAP_SECONDS - (time.monotonic() - self.last_end)
            if self.last_end and wait > 0:
                time.sleep(wait)
            self.requests += 1
            log(f'request {self.requests}: GET {url}' + (f' (retry {attempt})' if attempt else ''))
            try:
                request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
                with urllib.request.urlopen(request, timeout=60) as response:
                    expected = response.headers.get('Content-Length')
                    size = 0
                    with part.open('wb') as out:
                        while True:
                            block = response.read(1 << 16)
                            if not block:
                                break
                            out.write(block)
                            size += len(block)
                if expected is not None and size != int(expected):
                    raise IncompleteRead(b'', int(expected) - size)
                if not looks_like_mp3(part):
                    raise Stop(f'{url} answered with something that is not an MP3 ({size} bytes)')
                part.replace(dest)
                self.last_end = time.monotonic()
                self.fetched += 1
                log(f'fetched {dest.name} ({size} bytes)')
                return dest
            except urllib.error.HTTPError as error:
                self.last_end = time.monotonic()
                raise Stop(f'{url}: HTTP {error.code} {error.reason}: stopping, not retrying') from error
            except (urllib.error.URLError, TimeoutError, OSError, IncompleteRead) as error:
                self.last_end = time.monotonic()
                part.unlink(missing_ok=True)
                if attempt == MAX_RETRIES:
                    raise Stop(f'{url}: {error!r} after {MAX_RETRIES} retries') from error
                pause = RETRY_WAIT_SECONDS[min(attempt, len(RETRY_WAIT_SECONDS) - 1)]
                log(f'lost    {url}: {error!r}; waiting {pause:.0f} s')
                time.sleep(pause)
        raise Stop(url)


def decode(path: Path):
    """The MP3 as 16 kHz mono float32 samples (ffmpeg)."""
    import numpy as np

    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SAMPLE_RATE), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(result.stdout, dtype='<f4').copy()


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The model: emissions in windows, forced alignment with a wildcard
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

class Model:
    def __init__(self, scratch: Path) -> None:
        import torch
        import torchaudio

        torch.set_num_threads(TORCH_THREADS)
        torch.hub.set_dir(str(scratch / 'torch' / 'hub'))  # the weights are kept in the scratch folder, not in ~/.cache/torch
        self.torch = torch
        self.F = torchaudio.functional
        bundle = torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H
        if bundle.sample_rate != SAMPLE_RATE:
            raise Stop('the model is not 16 kHz')
        self.model = bundle.get_model().eval()  # downloads the weights into torch's hub cache (TORCH_HOME) the first time
        self.labels = bundle.get_labels()  # ('-', '|', 'E', 'T', ... "'", ...): index 0 is the blank
        self.index = {label: i for i, label in enumerate(self.labels)}

    def emissions(self, wave):
        """Log-probabilities (frames, classes) of the whole audio, made in windows so a ten-minute chapter fits in memory."""
        torch = self.torch
        core = WINDOW_SECONDS * SAMPLE_RATE
        context = CONTEXT_SECONDS * SAMPLE_RATE
        assert core % STRIDE == 0 and context % STRIDE == 0
        pieces = []
        with torch.inference_mode():
            for start in range(0, len(wave), core):
                a = max(0, start - context)
                b = min(len(wave), start + core + context)
                chunk = torch.from_numpy(wave[a:b])[None]
                out, _ = self.model(chunk)
                logp = torch.log_softmax(out[0], dim=-1)
                lead = (start - a) // STRIDE
                last = start + core >= len(wave)
                pieces.append(logp[lead:] if last else logp[lead:lead + core // STRIDE])
        return torch.cat(pieces, dim=0)

    def greedy(self, wave) -> list[str]:
        """The words the model hears in the audio, taking the likeliest letter of each frame (CTC collapse)."""
        if len(wave) < 4000:
            return []
        ids = self.emissions(wave).argmax(dim=-1).tolist()
        letters = []
        previous = -1
        for i in ids:
            if i != previous and i != 0:
                letters.append(self.labels[i])
            previous = i
        return [w.lower() for w in ''.join(letters).replace('|', ' ').split()]

    def align(self, emission, items: list[dict]):
        """Forced alignment of a sequence of words and wildcards to the emission. Each item is {'star': True} or {'word': 'abc', ...}. Gives (start, end) frames of each word item."""
        torch = self.torch
        star = emission.shape[1]  # the wildcard's own class, appended as a column that scores 0 (probability 1) everywhere
        padded = torch.cat((emission, torch.zeros(emission.shape[0], 1)), dim=1)
        targets: list[int] = []
        owner: list[int] = []  # the item each target belongs to; -1 is a word delimiter
        previous_was_word = False
        for k, item in enumerate(items):
            if 'star' in item:
                targets.append(star)
                owner.append(k)
                previous_was_word = False
                continue
            if previous_was_word:
                targets.append(self.index['|'])
                owner.append(-1)
            for letter in item['word'].upper():
                targets.append(self.index[letter])
                owner.append(k)
            previous_was_word = True
        if len(targets) > emission.shape[0]:
            raise Stop('the text has more letters than the audio has frames')
        path, scores = self.F.forced_align(padded[None], torch.tensor([targets], dtype=torch.int32), blank=0)
        spans = self.F.merge_tokens(path[0], scores[0].exp())
        if len(spans) != len(targets):
            raise Stop(f'alignment gave {len(spans)} token spans for {len(targets)} targets')
        first: dict[int, int] = {}
        last: dict[int, int] = {}
        for span, k in zip(spans, owner):
            if k < 0 or 'star' in items[k]:
                continue
            first.setdefault(k, span.start)
            last[k] = span.end
        return {k: (first[k], last[k]) for k in first}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The gap pass: each verse's end by the recording's energy
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def frame_levels(wave, a: float, b: float):
    """The level of each frame from second `a` to `b`: (the frames' start seconds, their RMS in dBFS)."""
    import numpy as np

    size = int(FRAME_SECONDS * SAMPLE_RATE)
    hop = int(HOP_SECONDS * SAMPLE_RATE)
    first = max(0, int(round(a * SAMPLE_RATE)))
    last = min(len(wave), int(round(b * SAMPLE_RATE))) - size
    if last < first:
        return np.zeros(0), np.zeros(0)
    starts = np.arange(first, last + 1, hop)
    squares = np.concatenate(([0.0], np.cumsum(wave[first:last + size].astype('float64') ** 2)))
    mean = (squares[starts - first + size] - squares[starts - first]) / size
    return starts / SAMPLE_RATE, 10 * np.log10(mean + 1e-12)


def quiet_of(wave, end: float, next_start: float, low: float, high: float) -> tuple[float, float] | None:
    """The quiet between a verse and the next, from the energy alone: (the second its last sound has died away, the second the next verse's sound begins), or None
    when there is no quiet of MIN_QUIET there. `end` and `next_start` are the aligner's, and only say which quiet is meant: the one they lie in or nearest to.
    The search stays inside `low`..`high` (the verse's own start, the next verse's end)."""
    a = max(low, end - REACH)
    b = min(high, next_start + REACH)
    times, levels = frame_levels(wave, a, b)
    runs: list[tuple[float, float]] = []
    k = 0
    while k < len(levels):
        if levels[k] >= QUIET_DB:
            k += 1
            continue
        j = k
        while j < len(levels) and levels[j] < QUIET_DB:
            j += 1
        # the frame before the first quiet one reaches HOP into it and is loud: the sound has died by the first quiet frame's start. The first loud frame after the
        # run starts HOP after the last quiet one, whose own FRAME was quiet: the sound begins no earlier than that frame's end.
        quiet_start = float(times[k])
        onset = float(times[j - 1]) + FRAME_SECONDS if j < len(levels) else b
        if k > 0 and onset - quiet_start >= MIN_QUIET:  # a run from the very start of the search has no sound before it: not this verse's
            runs.append((quiet_start, onset))
        k = j
    if not runs:
        return None
    middle = (end + next_start) / 2

    def rank(run: tuple[float, float]) -> tuple[int, float, float]:
        holds = run[0] <= middle <= run[1]
        overlap = max(0.0, min(run[1], next_start) - max(run[0], end))
        return (0 if holds else 1, -overlap, 0.0 if holds else min(abs(run[0] - middle), abs(run[1] - middle)))

    return min(runs, key=rank)


def settle_ends(wave, triples: list[list]) -> tuple[list[list], list[list], list[str]]:
    """Moves each verse's end to END_AFTER_SOUND after its last sound died away (never nearer than MIN_BEFORE_ONSET to the next verse's first sound, never past the next
    verse's start). Gives (the verses, what was measured of each gap as [verse, quiet start, onset], the verses the narrator reads on from with no quiet). Such a
    verse keeps the aligner's end and is measured as [verse, None, None]; the last verse of a chapter keeps its end too."""
    settled = [list(t) for t in triples]
    measured: list[list] = []
    runs_on: list[str] = []
    for i in range(len(triples) - 1):
        n, start, end = triples[i]
        _, next_start, next_end = triples[i + 1]
        found = quiet_of(wave, end, next_start, start, next_end)
        placed = None
        if found is not None:
            quiet_start, onset = found
            # to two decimals: the onset's bound rounded down, so the end is never a hair nearer to the onset than MIN_BEFORE_ONSET
            placed = min(round(quiet_start + END_AFTER_SOUND, 2), math.floor((onset - MIN_BEFORE_ONSET) * 100 + 1e-6) / 100, next_start)
        # no quiet at the boundary, or the nearest one starts after the next verse does (it is a pause inside that verse): the narrator read on
        if found is None or placed is None or placed < quiet_start or placed <= start:
            measured.append([n, None, None])
            runs_on.append(f'verse {n}: no quiet between it and the next verse (the narrator reads on): its end stays {end}')
            continue
        measured.append([n, round(quiet_start, 3), round(onset, 3)])
        settled[i][2] = placed
    return settled, measured, runs_on


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# One chapter
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def align_chapter(model: Model, book: str, chapter: int, mp3: Path, allow: set[tuple[int, int]], skip_title: bool = False) -> dict:
    """Times one chapter. Gives {'ok', 'line', 'timings', 'problems'}."""
    verses = chapter_text(book, chapter)
    for v in verses:
        for token in v['unconverted']:
            log(f'  no letters: {book} {chapter}:{v["n"]} token {token!r}')
    wave = decode(mp3)
    duration = len(wave) / SAMPLE_RATE
    emission = model.emissions(wave)
    items = build_items(verses, skip_title)
    frames = model.align(emission, items)
    seconds = lambda frame: frame * STRIDE / SAMPLE_RATE  # noqa: E731
    starts: dict[int, float] = {}
    ends: dict[int, float] = {}
    for k, item in enumerate(items):
        if 'word' not in item or k not in frames:
            continue
        s, e = frames[k]
        if item['first']:
            starts[item['verse']] = seconds(s)
        if item['last']:
            ends[item['verse']] = seconds(e)
    raw = []
    problems = []
    for v in verses:
        n = v['n']
        if n not in starts or n not in ends:
            problems.append(f'verse {n} has no words')
        elif ends[n] <= starts[n]:
            problems.append(f'verse {n}: start {starts[n]:.2f} is not before end {ends[n]:.2f}')
        else:
            raw.append((v, starts[n], ends[n]))
    triples = []
    low = high = None
    for i, (v, start, end) in enumerate(raw):
        before = (raw[i - 1][2] + start) / 2 if i else 0.0  # the middle of the gap before this verse
        after = (end + raw[i + 1][1]) / 2 if i + 1 < len(raw) else duration
        start, end = round(max(start - PAD_START, before), 2), round(min(end + PAD_END, after), 2)
        if end <= start:
            problems.append(f'verse {v["n"]}: start {start} is not before end {end}')
            continue
        spw = (end - start) / (len(v['words']) - (v['title_words'] if skip_title else 0))
        low = spw if low is None else min(low, spw)
        high = spw if high is None else max(high, spw)
        if (spw < SPW_MIN or spw > SPW_MAX) and (chapter, v['n']) not in allow:
            problems.append(f'verse {v["n"]}: {spw:.2f} s a word ({len(v["words"])} words, {start}-{end})')
        triples.append([v['n'], start, end])
    triples, quiet, runs_on = settle_ends(wave, triples)
    for note in runs_on:
        log(f'  reads on: {book} {chapter} {note}')
    lead = triples[0][1] if triples else float('nan')
    tail = duration - triples[-1][2] if triples else float('nan')
    line = (f'chapter {chapter:2d}: verses in text {len(verses):3d}, timed {len(triples):3d}, duration {duration:7.2f} s, before verse 1 {lead:6.2f} s, '
            f'after last verse {tail:6.2f} s, s/word min {low if low is not None else float("nan"):.2f} max {high if high is not None else float("nan"):.2f}'
            + (f', Psalm title {verses[0]["title_words"]} words {"NOT read: left to the opening wildcard" if skip_title else "read as the start of verse 1"}' if verses and verses[0]['title_words'] else ''))
    if len(triples) != len(verses):
        problems.append(f'verses timed {len(triples)} of {len(verses)}')
    return {'ok': not problems, 'line': line, 'problems': problems, 'quiet': quiet, 'timings': {'audio': audio_url(book, chapter), 'duration': round(duration, 2), 'verses': triples}}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def out_dir() -> Path:
    return REPO / 'public' / 'data' / 'audio' / EDITION


def read_json(path: Path, default):
    return json.loads(path.read_text(encoding='utf8')) if path.exists() else default


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, separators=(',', ':')) + '\n', encoding='utf8')


def write_chapters(book: str, results: dict[int, dict | None]) -> None:
    """Puts the chapters that passed into <book>.json and index.json; a chapter that failed (None) is taken out of both."""
    path = out_dir() / f'{book}.json'
    data = read_json(path, {'v': 1, 'edition': EDITION, 'book': book, 'chapters': {}})
    for chapter, timings in results.items():
        data['chapters'].pop(str(chapter), None)
        if timings is not None:
            data['chapters'][str(chapter)] = timings
    data['chapters'] = {k: data['chapters'][k] for k in sorted(data['chapters'], key=int)}
    index_path = out_dir() / 'index.json'
    index = read_json(index_path, {'v': 1, 'edition': EDITION, 'voice': VOICE, 'books': {}})
    if data['chapters']:
        write_json(path, data)
        index['books'][book] = [int(k) for k in data['chapters']]
    else:
        path.unlink(missing_ok=True)
        index['books'].pop(book, None)
    index['books'] = dict(sorted(index['books'].items()))
    write_json(index_path, index)


def quiet_path(book: str) -> Path:
    return Path(__file__).resolve().parent / 'quiet' / f'{EDITION}-{book}.json'


def write_quiet(book: str, results: dict[int, list | None]) -> None:
    """Puts what the gap pass measured of each chapter's gaps into scripts/audio-timings/quiet/<edition>-<book>.json; a chapter left out (None) is taken out."""
    path = quiet_path(book)
    data = read_json(path, {'v': 1, 'edition': EDITION, 'book': book, 'quietDb': QUIET_DB, 'frame': FRAME_SECONDS, 'chapters': {}})
    data['quietDb'], data['frame'] = QUIET_DB, FRAME_SECONDS
    for chapter, rows in results.items():
        data['chapters'].pop(str(chapter), None)
        if rows is not None:
            data['chapters'][str(chapter)] = rows
    data['chapters'] = {k: data['chapters'][k] for k in sorted(data['chapters'], key=int)}
    path.parent.mkdir(parents=True, exist_ok=True)
    write_json(path, data)


def run_gaps(book: str, chapters: list[int] | None, scratch: Path, fetcher: Fetcher) -> bool:
    """The gap pass alone, on the timings already written: each chapter's MP3 is decoded, each verse's end moved by the energy of its gap, nothing aligned again."""
    path = out_dir() / f'{book}.json'
    data = read_json(path, None)
    if not data or not data['chapters']:
        raise Stop(f'no timings for {book} to settle')
    near_before = near_after = pairs = moved = reads_on = 0
    for key in sorted(data['chapters'], key=int):
        chapter = int(key)
        if chapters is not None and chapter not in chapters:
            continue
        timings = data['chapters'][key]
        mp3 = fetcher.get(audio_url(book, chapter), scratch / 'mp3' / Path(audio_url(book, chapter)).name)
        wave = decode(mp3)
        before = timings['verses']
        after, quiet, runs_on = settle_ends(wave, before)
        onset = {row[0]: row[2] for row in quiet if row[2] is not None}
        rooms_before = sorted(onset[b[0]] - b[2] for b in before if b[0] in onset)
        rooms_after = sorted(onset[a[0]] - a[2] for a in after if a[0] in onset)
        pairs += len(before) - 1
        reads_on += len(runs_on)
        near_before += sum(room < MIN_BEFORE_ONSET - 1e-9 for room in rooms_before)
        near_after += sum(room < MIN_BEFORE_ONSET - 1e-9 for room in rooms_after)
        moved += sum(a[2] != b[2] for a, b in zip(after, before))
        log(f'chapter {chapter:2d}: {len(before) - 1:3d} pairs, quiet from the end to the next onset min {rooms_before[0]:.3f} -> {rooms_after[0]:.3f} s, '
            f'median {rooms_before[len(rooms_before) // 2]:.3f} -> {rooms_after[len(rooms_after) // 2]:.3f} s')
        for note in runs_on:
            log(f'  reads on: {book} {chapter} {note}')
        timings['verses'] = after
        write_quiet(book, {chapter: quiet})
    write_json(path, data)
    log(f'verse pairs {pairs}; ends moved {moved}; pairs the narrator reads on through (no quiet, end kept) {reads_on}; '
        f'of the others, ends within {MIN_BEFORE_ONSET} s of the next onset: {near_before} before, {near_after} after')
    return True


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The sanity check
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def edit_distance(a: str, b: str) -> int:
    row = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        new = [i]
        for j, cb in enumerate(b, 1):
            new.append(min(row[j] + 1, new[j - 1] + 1, row[j - 1] + (ca != cb)))
        row = new
    return row[-1]


def run_check(book: str, scratch: Path, fetcher: Fetcher) -> bool:
    """For CHECK_VERSES verses spread over the book by a fixed seed: the audio between a verse's start and end, decoded greedily, begins with its first word and ends with its last."""
    data = read_json(out_dir() / f'{book}.json', None)
    if not data or not data['chapters']:
        raise Stop(f'no timings for {book} to check')
    pairs = [(int(c), v[0]) for c, ch in data['chapters'].items() for v in ch['verses']]
    chosen = sorted(random.Random(CHECK_SEED).sample(pairs, min(CHECK_VERSES, len(pairs))))
    model = Model(scratch)
    cache: dict[int, object] = {}
    passed = 0
    log(f'sanity check: {len(chosen)} verses of {book}, seed {CHECK_SEED}')
    log('verse    start    end   first word (heard)   last word (heard)   result')
    for chapter, n in chosen:
        if chapter not in cache:
            mp3 = fetcher.get(audio_url(book, chapter), scratch / 'mp3' / Path(audio_url(book, chapter)).name)
            cache = {chapter: decode(mp3)}
        verse = next(v for v in chapter_text(book, chapter) if v['n'] == n)
        _, start, end = next(t for t in data['chapters'][str(chapter)]['verses'] if t[0] == n)
        heard = model.greedy(cache[chapter][int(start * SAMPLE_RATE):int(end * SAMPLE_RATE)])
        first, last = verse['words'][0], verse['words'][-1]
        ok = bool(heard) and edit_distance(heard[0], first) <= 1 and edit_distance(heard[-1], last) <= 1
        passed += ok
        log(f'{chapter:2d}:{n:<3d} {start:8.2f} {end:7.2f}   {first:>10s} ({heard[0] if heard else "-":<10s}) {last:>10s} ({heard[-1] if heard else "-":<10s}) {"ok" if ok else "FAIL"}')
    log(f'sanity check: {passed} of {len(chosen)} (needs {CHECK_PASS})')
    return passed >= CHECK_PASS


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Aligns a book's chapter MP3s to Lampas's MSB verse text and writes the verse timings.")
    parser.add_argument('--book', required=True, choices=sorted(BOOKS))
    parser.add_argument('--chapters', help='comma-separated chapter numbers (default: every chapter of the book in public/data)')
    parser.add_argument('--scratch', type=Path, default=SCRATCH_DEFAULT, help='the folder of the venv, the MP3s and the weights, outside the repo')
    parser.add_argument('--allow-flagged', default='', help='chapter:verse,... whose seconds-a-word outside 0.12-1.5 has been looked at and explained')
    parser.add_argument('--redo', action='store_true', help='align the chapters already in the book file again (default: a run that stopped part way is started again and skips them)')
    parser.add_argument('--check', action='store_true', help='run the sanity check on the written timings instead of aligning')
    parser.add_argument('--gaps', action='store_true', help="run the gap pass alone on the written timings: each verse's end by the recording's energy, nothing aligned again")
    args = parser.parse_args()
    scratch = args.scratch.expanduser().resolve()
    if REPO in scratch.parents or scratch == REPO:
        raise Stop('the scratch folder must be outside the repo')
    (scratch / 'mp3').mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    fetcher = Fetcher()
    try:
        if args.check:
            return 0 if run_check(args.book, scratch, fetcher) else 1
        if args.gaps:
            return 0 if run_gaps(args.book, [int(c) for c in args.chapters.split(',')] if args.chapters else None, scratch, fetcher) else 1
        book_dir = REPO / 'public' / 'data' / args.book
        chapters = [int(c) for c in args.chapters.split(',')] if args.chapters else sorted(int(p.stem) for p in book_dir.glob('*.json'))
        allow = {tuple(int(x) for x in pair.split(':')) for pair in args.allow_flagged.split(',') if pair}
        done = set() if args.redo else {int(k) for k in read_json(out_dir() / f'{args.book}.json', {'chapters': {}})['chapters']}
        todo = [c for c in chapters if c not in done]
        if len(todo) != len(chapters):
            log(f'skipped, already in {args.book}.json (--redo aligns them again): {[c for c in chapters if c in done]}')
        model = Model(scratch) if todo else None
        lines = []
        left_out = []
        for chapter in todo:
            mp3 = fetcher.get(audio_url(args.book, chapter), scratch / 'mp3' / Path(audio_url(args.book, chapter)).name)
            t0 = time.monotonic()
            result = align_chapter(model, args.book, chapter, mp3, allow)
            if not result['ok'] and chapter_text(args.book, chapter)[0]['title_words']:
                log(result['line'] + f'  [{time.monotonic() - t0:.0f} s]')
                log(f'  chapter {chapter} did not pass with its Psalm title read as verse 1: {result["problems"]}; trying again with the title left to the opening wildcard')
                result = align_chapter(model, args.book, chapter, mp3, allow, skip_title=True)
            log(result['line'] + f'  [{time.monotonic() - t0:.0f} s]')
            lines.append(result['line'])
            if result['ok']:
                write_chapters(args.book, {chapter: result['timings']})
                write_quiet(args.book, {chapter: result['quiet']})
            else:
                left_out.append(chapter)
                write_chapters(args.book, {chapter: None})
                write_quiet(args.book, {chapter: None})
                for problem in result['problems']:
                    log(f'  LEFT OUT chapter {chapter}: {problem}')
        log('')
        log('\n'.join(lines))
        log(f'left out: {left_out or "none"}')
        log(f'requests: {fetcher.requests}, files fetched: {fetcher.fetched}; whole run {time.monotonic() - started:.0f} s')
        return 0
    except Stop as stop:
        log(f'STOP: {stop}')
        return 2


if __name__ == '__main__':
    sys.exit(main())
