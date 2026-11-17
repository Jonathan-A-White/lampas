#!/usr/bin/env python3
"""The timing maker of the recorded voice (mw-82lb97i.2; docs/data.md 'Recorded audio timings').

Fetches each chapter MP3 of a book from the publisher, aligns it to Lampas's MSB verse text (public/data/<book>/<n>.json) with an English wav2vec2 CTC model
(torchaudio.functional.forced_align), and writes when each verse starts and ends to public/data/audio/msb-david/<book>.json (the app's index.json is made from the book files by scripts/audio-index.mjs, never written here).
Any of the 66 books of BOOKS. A run that stops part way is started again with the same command: a chapter already in the book file is skipped unless --redo.
The MP3s stay in a scratch folder OUTSIDE the repo (default ~/.cache/lampas-audio-timings/mp3) and are never committed, copied to our server or put under public/.

    python align.py --book jhn [--chapters 3,4] [--scratch <dir>] [--allow-flagged 3:5,7:12] [--redo]
    python align.py --book jhn --check          # the sanity check: 20 verses decoded back from the audio between their start and end
    python align.py --book jhn --cut            # the cut rule alone, from the aligner's letters already kept: no model, nothing aligned again (a minute for John)
    python align.py --book jhn --listen         # after judge.py: what the judge hears at each edge of the listen list; exit 1 when a flag is outside the list

WHAT ALLOWS THE DOWNLOAD (the Mayor's reading, 2026-11-11): the publisher offers these files as public downloads ('Audio Downloads' at
https://openbible.com/audio.htm: per-chapter files and a zip of all chapters); the site has no robots.txt rules; the MSB text is public domain
(https://berean.bible/terms.htm: 'All uses are freely permitted'). The fetch is polite: ONE sequential request per chapter file, 2 s between files, a generic
User-Agent ('lampas-audio-timings/1'; no name, no email), a file already whole in the scratch folder is never fetched again, at most 2 retries a file with a
growing wait (only for a lost connection), and a 4xx or 5xx stops the run rather than hammering.

THE WEIGHTS: torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H, wav2vec 2.0 large (LV-60k, fine-tuned on 960 h of LibriSpeech), English letters. Its licence is quoted at
https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H.html: 'Originally published by the authors of wav2vec 2.0
[Baevski et al., 2020] under MIT License and redistributed with the same license.' (Not the MMS forced-aligner weights, which are CC-BY-NC.)
The method is that of https://github.com/BSB-publishing/bsb-align (MIT); none of its timing data is used.

THE CUT RULE (mw-ar5k42b.3; cut_chapter): the model only says BETWEEN WHICH LETTERS each verse lies (a CTC model puts a letter near the middle of its sound); where
each edge is, is read from the recording's level. The narrator's recording is gated, so between two verses it is digital silence (about -90 dBFS; speech is above
-45): the quiet of a boundary is the longest quiet between the last letter of one verse and the first letter of the next, read to 5 ms. BOTH edges are placed in it
with the player's margin (player-slop.json, the one file the judge reads too): the end `tail` after the verse's last sound has died, the start `lead` before its
first sound begins (a click before its first word is not its first sound: a sound of 20 ms or less with 30 ms or more of silence after it, John 9:40;
mw-ar5k42b.6). Where the quiet is too short for the margin the cut is its middle; where there is none (the narrator reads on) it is the quietest instant
between the two words; those edges go on the LISTEN LIST (scripts/audio-timings/listen/<edition>-<book>.json), for the Governor's ear. The announcement, a heading
read aloud and a closing line are in no verse. What was measured (the aligner's letters of each verse, each boundary's quiet) is kept in
scripts/audio-timings/quiet/<edition>-<book>.json: tests/unit/audio-timings-data.test.ts holds every timing to the rule by it, and --cut runs the rule again from
it with no model (after a change of the slop). THE LOCK (tests/unit/audio-judged.test.ts): a book ships only with a judged report (judge.py) of its timings as
they are, with no flag outside its listen list.

One process, one chapter at a time, torch on 4 threads: start it as `nice -n 10 ~/.cache/lampas-audio-timings/venv/bin/python scripts/audio-timings/align.py --book jhn`.
"""
from __future__ import annotations

import argparse
import json
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
# The recording's level: a frame of FRAME_SECONDS every HOP_SECONDS is quiet below QUIET_DB (dBFS of its RMS); a quiet is at least MIN_QUIET of it.
FRAME_SECONDS, HOP_SECONDS = 0.010, 0.005
QUIET_DB = -60.0
MIN_QUIET = 0.06
MIN_DIP = 0.02  # where two letters have no quiet of MIN_QUIET between them, a shorter silence of at least this is still the place to cut
REACH = 0.75  # quiet_of (the judge's proof reads the announcement's end with it) looks this far either side of the two seconds it is given
# The cut rule. Where something else may be spoken between two verses (the announcement, a heading, a closing line, a word of a retake left in: wherever the aligner
# was given a wildcard), the verse's own quiet is told from a stop's closure inside its word: a quiet of STAR_QUIET or more is a pause, and so is a shorter one
# with more than a BLIP of sound on its far side (a stop's release is a blip; a word is not).
STAR_QUIET = 0.2
BLIP = 0.1
# A click before a verse's first word is not the verse's first sound (mw-ar5k42b.6; John 9:40: 15 ms of sound at -46 dBFS, 60 ms of silence, then 'Some'): a sound of
# CLICK or less with CLICK_QUIET or more of silence after it. They are the judge's TOLERANCE (a part-sound that short is the measure's own grain) and its MIN_QUIET.
# Before a word that begins with a stop (STOP_LETTERS: a c, a g, a j or a t may be one) a sound as short may be the word's own: the stop's release, or the faint
# start of it (Exodus 4:7 'Put', Genesis 4:5 'But': 5 to 10 ms at -60 dBFS, 30 to 35 ms before the burst). There it stays the verse's first sound.
CLICK = 0.02
CLICK_QUIET = 0.03
STOP_LETTERS = frozenset('bcdgjkpqt')
SMOOTH_FRAMES = 3  # the quietest instant between two words is read from the level smoothed over this many frames (20 ms): one pitch period's trough is not a word boundary
SLOP_PATH = Path(__file__).resolve().parent / 'player-slop.json'  # the player's margin, the ONE file: the judge widens each clip by the same numbers
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


def letters_of(frames: dict[int, tuple[int, int]], items: list[dict]) -> dict[int, list[float]]:
    """What the aligner says of each verse, and all the cut rule takes from it: verse -> [the second its first letter starts, the second its last letter ends].
    A CTC model puts a letter near the middle of its sound, so the verse's own sound begins a little before the first and dies a little after the last: the two
    say BETWEEN WHICH LETTERS a verse's edge lies, never where it is. A verse with no word aligned is left out."""
    seconds = lambda frame: round(frame * STRIDE / SAMPLE_RATE, 2)  # noqa: E731
    first: dict[int, float] = {}
    last: dict[int, float] = {}
    for k, item in enumerate(items):
        if 'word' not in item or k not in frames:
            continue
        s, e = frames[k]
        if item['first']:
            first[item['verse']] = seconds(s)
        if item['last']:
            last[item['verse']] = seconds(e)
    return {n: [first[n], last[n]] for n in first if n in last}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The cut rule: both edges of every verse by the recording's level, with the player's margin
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def read_slop(path: Path = SLOP_PATH) -> dict:
    """The player's margin, from the one file (the judge reads the same): {'lead': the seconds it may start early or late, 'tail': the seconds it may stop late or early}."""
    raw = json.loads(path.read_text(encoding='utf8'))
    return {'lead': float(raw['lead']), 'tail': float(raw['tail'])}


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
    """The quiet two seconds lie in or nearest to, from the energy alone: (the second the sound before it has died away, the second the sound after it begins), or
    None when there is no quiet of MIN_QUIET there. The search stays inside `low`..`high`. The cut rule does not use it (it reads the whole chapter's quiets, below);
    the judge's proof (judge.py --prove) finds the end of the announcement with it, to plant a start in the announcement's last sound."""
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


def ms(seconds: float) -> int:
    return int(round(seconds * 1000))


def up2(milliseconds: int) -> int:
    """To the timings' two decimals, never below."""
    return -(-milliseconds // 10) * 10


def down2(milliseconds: int) -> int:
    """To the timings' two decimals, never above."""
    return milliseconds // 10 * 10


class Level:
    """A chapter's recording as its level: every frame's dBFS, and every quiet of it as (the millisecond the sound has died by, the millisecond it begins again).
    The narrator's recording is gated: between phrases it is digital silence (about -90 dBFS; speech is above -45), so both are read to a frame's hop, 5 ms."""

    def __init__(self, wave) -> None:
        import numpy as np

        self.np = np
        self.duration = len(wave) / SAMPLE_RATE
        _, self.db = frame_levels(wave, 0.0, self.duration)
        self.hop, self.frame = ms(HOP_SECONDS), ms(FRAME_SECONDS)
        quiet = (self.db < QUIET_DB).astype(np.int8)
        edges = np.flatnonzero(np.diff(np.concatenate(([0], quiet, [0]))))
        self.quiets: list[tuple[int, int]] = []  # every quiet of MIN_QUIET or more
        self.dips: list[tuple[int, int]] = []  # every silence of MIN_DIP or more, the quiets among them
        self.from_start = self.to_end = None  # the quiet the file begins with, the quiet it ends in
        for k, j in zip(edges[::2].tolist(), edges[1::2].tolist()):  # frames k .. j-1 are quiet
            # the frame before the first quiet one reaches a hop into it and is loud: the sound has died by the first quiet frame's start. The first loud frame
            # after the run starts a hop after the last quiet one, whose own length was quiet: the sound begins no earlier than that frame's end.
            run = (0 if k == 0 else k * self.hop, ms(self.duration) if j == len(quiet) else (j - 1) * self.hop + self.frame)
            if run[1] - run[0] < ms(MIN_DIP):
                continue
            self.dips.append(run)
            if run[1] - run[0] < ms(MIN_QUIET):
                continue
            self.quiets.append(run)
            if k == 0:
                self.from_start = run
            if j == len(quiet):
                self.to_end = run

    def between(self, lo: int, hi: int) -> list[tuple[int, int]]:
        """The quiets that lie between two letters, wholly or in part; where there is none of MIN_QUIET, the shorter silences there (John 1:24 has 75 ms between
        two verses, Genesis 23:14 has 45)."""
        import bisect

        for runs in (self.quiets, self.dips):
            found = []
            for q in runs[max(0, bisect.bisect_left(runs, (lo, 0)) - 1):]:
                if q[0] >= hi:
                    break
                if q[1] > lo:
                    found.append(q)
            if found:
                return found
        return []

    def past_clicks(self, onset: int, hi: int) -> int:
        """Where a verse's own first sound begins, given `onset`, where the sound after its quiet begins: a click is not its first sound (mw-ar5k42b.6; John 9:40
        started 50 ms before a click 75 ms before 'Some'). A click is a sound of CLICK or less (from where it begins to the next silence) with a silence of
        CLICK_QUIET or more after it, a silence that begins before `hi`, the verse's first letter (a sound the aligner hears the first letter in is the verse's
        own) and does not run to the file's end. Gives the millisecond the sound after the last such click begins. Only a verse's FIRST sound is read so, and
        only of a word that does not begin with a stop (the cut rule asks): a sound as short after a silence at a verse's end is a stop's release and stays with
        its word."""
        import bisect

        while True:
            k = bisect.bisect_left(self.dips, (onset, 0))  # the next silence of MIN_DIP or more
            if k == len(self.dips):
                return onset
            died, begins = self.dips[k]
            if died - onset > ms(CLICK) or begins - died < ms(CLICK_QUIET) or died >= hi or begins >= ms(self.duration):
                return onset
            onset = begins

    def quietest(self, lo: int, hi: int) -> int:
        """The quietest instant between two letters, where the narrator reads on with no quiet: the middle of the frame whose level, smoothed over SMOOTH_FRAMES,
        is the lowest of the frames that lie wholly between them."""
        np = self.np
        first = -(-lo // self.hop)
        last = min(len(self.db) - 1, (hi - self.frame) // self.hop)
        if last < first:
            return (lo + hi) // 2 // self.hop * self.hop
        half = SMOOTH_FRAMES // 2
        padded = np.concatenate((np.full(half, self.db[0]), self.db, np.full(half, self.db[-1])))
        smooth = np.convolve(padded, np.ones(SMOOTH_FRAMES) / SMOOTH_FRAMES, mode='valid')
        k = first + int(np.argmin(smooth[first:last + 1]))
        return k * self.hop + self.frame // 2


def place_end(died: int, onset: int | None, tail: int, duration: int) -> tuple[int, bool]:
    """A verse's end, in milliseconds, in the quiet from `died` (its last sound has died) to `onset` (the next sound begins; None: the file ends in the quiet), and
    whether the quiet is too short for the margin. With room: `tail` after its last sound, so the player stopping `tail` early still plays the whole of it and a
    stop that comes late has all the rest of the quiet. Too short: the middle of the quiet, each way keeping what there is."""
    wanted = up2(died + tail)
    if onset is None:
        return min(wanted, down2(duration)), wanted > down2(duration)
    if wanted <= down2(onset - tail):
        return wanted, False
    return down2((died + onset) // 2), True


def place_start(died: int | None, onset: int, lead: int) -> tuple[int, bool]:
    """A verse's start, in milliseconds, in the quiet from `died` (the sound before it has died; None: nothing sounds before it) to `onset` (its own first sound),
    and whether the quiet is too short for the margin. With room: `lead` before its first sound, so the player starting `lead` late still plays the whole of it.
    Too short: the middle of the quiet."""
    wanted = max(0, down2(onset - lead))
    if died is None or up2(died + lead) <= wanted:
        return wanted, False
    return up2(-(-(died + onset) // 2)), True


def cut_chapter(wave, verses: list[dict], letters: dict[int, list[float]], slop: dict, skip_title: bool = False) -> dict:
    """THE CUT RULE (mw-ar5k42b.3). Both edges of every verse are placed from the recording's level either side of the verse's boundary; the aligner only says
    between which two letters a boundary lies (`letters`: verse -> [its first letter's start, its last letter's end]).

    A boundary is what lies between the last letter of one verse and the first letter of the next (before the first verse: from second 0; after the last: to the
    file's end). Its quiet is the LONGEST quiet between the two letters (a stop's closure inside a word is a shorter one and stays with its word). Where something
    else may be spoken there (the announcement before the first verse, a heading, a closing line: wherever the aligner was given a wildcard) the verse before ends
    in the FIRST quiet that is a pause and the verse after starts from the LAST one, so what is spoken between them is in neither verse. A pause is a quiet of
    STAR_QUIET or more, or a shorter one with more than a BLIP of sound on its far side (a stop's closure has only its release there). The sound the verse after
    starts from is its own first sound: a click before its first word (Level.past_clicks) is in the quiet, and the boundary's onset is the word's; but before a
    word that begins with a stop (STOP_LETTERS) a sound as short may be the word's own release, and stays its first sound. `skip_title`: a Psalm's title was
    left to the opening wildcard, so verse 1's first word is the first after it.
      1. The end is `tail` after the verse's last sound has died; the start is `lead` before its first sound begins (place_end, place_start; the two slops are the
         player's, from player-slop.json). So the clip at its longest holds nothing of a neighbour and the clip at its shortest loses nothing of its own.
      2. A quiet too short for that (less than twice the slop): the cut is the middle of the quiet, each side keeping what margin there is.
      3. No quiet at all (the narrator reads on): the cut is the quietest instant between the two words, for the end and for the next start alike.
    The edges of 2 and 3 are the LISTEN LIST: no cut is clean there, and they are for the Governor's ear.

    Gives {'verses': [[n, start, end]], 'quiet': the boundaries as measured, one more than the verses, 'listen': the listed edges}. A boundary is
    [the verse before it (0: before the first), the second the sound before it has died, the second the sound after it begins]; either is None where nothing sounds
    on that side; where something else is spoken between two verses two more seconds say from when to when; a boundary read on through is [verse, None, None, the cut]."""
    level = Level(wave)
    lead, tail, duration = ms(slop['lead']), ms(slop['tail']), ms(level.duration)
    count = len(verses)
    starts: list[int] = [0] * count
    ends: list[int] = [0] * count
    rows: list[list] = []
    listen: list[dict] = []
    seconds = lambda value: None if value is None else value / 1000  # noqa: E731

    def word(index: int, which: int) -> str:
        return verses[index]['words'][which] if verses[index]['words'] else ''

    def may_begin_with_a_release(index: int) -> bool:
        words = verses[index]['words'][verses[index].get('title_words', 0) if skip_title and index == 0 else 0:]
        return not words or words[0][0] in STOP_LETTERS

    def listed(index: int, edge: str, reason: str, room: int, cut: int) -> None:
        listen.append({'verse': verses[index]['n'], 'edge': edge, 'reason': reason, 'room': room / 1000, 'cut': cut / 1000})

    for at in range(count + 1):  # the boundary after verse at-1 and before verse at
        before, after = at - 1, at
        lo = ms(letters[verses[before]['n']][1]) if at > 0 else 0
        hi = ms(letters[verses[after]['n']][0]) if at < count else duration
        star = at == 0 or at == count or bool(verses[after]['heading'])
        found = level.between(lo, hi)
        number = verses[before]['n'] if at > 0 else 0
        if not found:
            if at == 0:  # the file begins with the verse's own sound
                starts[after] = 0
                rows.append([number, None, 0.0])
            elif at == count:  # the file ends with no quiet after the last word
                ends[before] = down2(duration)
                rows.append([number, None, None, seconds(duration)])
                listed(before, 'tail', f"the recording ends with no quiet after '{word(before, -1)}'", 0, ends[before])
            else:
                cut = level.quietest(lo, hi)
                ends[before] = starts[after] = down2(cut)  # to the timings' two decimals, never after the instant: the next verse starts at or before its first sound
                rows.append([number, None, None, seconds(cut)])
                between = f"no quiet between '{word(before, -1)}' and '{word(after, 0)}'"
                listed(before, 'tail', f'the narrator reads on into verse {verses[after]["n"]}: {between}; cut at the quietest instant between them', 0, ends[before])
                listed(after, 'head', f'the narrator reads on from verse {verses[before]["n"]}: {between}; cut at the quietest instant between them', 0, starts[after])
            continue
        longest = max(found, key=lambda q: (q[1] - q[0], -q[0]))
        first = last = longest
        if star:
            # the verse before ends in the first quiet that is a pause, the verse after starts from the last: what is spoken between the two is in neither
            first = next(q for i, q in enumerate(found) if q[1] - q[0] >= ms(STAR_QUIET) or i + 1 == len(found) or found[i + 1][0] - q[1] > ms(BLIP))
            last = next(q for i, q in reversed(list(enumerate(found))) if q[1] - q[0] >= ms(STAR_QUIET) or i == 0 or q[0] - found[i - 1][1] > ms(BLIP))
            if first[0] > last[0]:
                first = last = longest
        if at == 0:
            first = last  # before the first verse: what is spoken before its quiet is the announcement
        if at == count:
            last = first  # after the last verse: what is spoken after its quiet is a closing line (or nothing: the file ends in the quiet)
        died = first[0]
        onset = last[1]
        if at < count and not may_begin_with_a_release(after):
            onset = level.past_clicks(onset, hi)  # a click before the verse's first word is not its first sound
        if at > 0:
            next_sound = onset if first is last else first[1]  # what is spoken between two verses begins where its quiet ends, click or not
            ends[before], tight = place_end(died, None if first is level.to_end else next_sound, tail, duration)
            if tight:
                room = next_sound - first[0]
                if first is level.to_end:
                    reason = f"the recording ends {room} ms after '{word(before, -1)}': less than the {tail} ms the player's margin needs; the end is the file's"
                else:
                    reason = (f"a quiet of {room} ms between '{word(before, -1)}' and " + (f"'{word(after, 0)}'" if first is last and at < count else 'what is spoken next')
                              + f": less than the {2 * tail} ms the player's margin needs; cut in its middle")
                listed(before, 'tail', reason, room, ends[before])
        if at < count:
            starts[after], tight = place_start(None if last is level.from_start else last[0], onset, lead)
            if tight:
                room = onset - last[0]
                what = f"a quiet of {room} ms between " + (f"'{word(before, -1)}'" if first is last and at > 0 else 'what is spoken before') + f" and '{word(after, 0)}'"
                listed(after, 'head', f'{what}: less than the {2 * lead} ms the player\'s margin needs; cut in its middle', room, starts[after])
            if at > 0:
                starts[after] = max(starts[after], ends[before])
        row = [number, None if at == 0 and last is level.from_start else seconds(died), None if at == count and first is level.to_end else seconds(onset)]
        if first is not last:
            row += [seconds(first[1]), seconds(last[0])]  # something else is spoken from the one to the other
        rows.append(row)
    return {'verses': [[v['n'], starts[i] / 1000, ends[i] / 1000] for i, v in enumerate(verses)], 'quiet': rows, 'listen': listen}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# One chapter
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def cut_and_check(book: str, chapter: int, wave, verses: list[dict], letters: dict[int, list[float]], slop: dict, allow: set[tuple[int, int]], skip_title: bool = False) -> dict:
    """One chapter cut by the rule from the aligner's letters, and checked. Gives {'ok', 'line', 'problems', 'timings', 'quiet', 'listen', 'aligned'}."""
    duration = len(wave) / SAMPLE_RATE
    problems = []
    for v in verses:
        n = v['n']
        if n not in letters:
            problems.append(f'verse {n} has no words')
        elif letters[n][1] <= letters[n][0]:
            problems.append(f'verse {n}: its first letter {letters[n][0]:.2f} is not before its last {letters[n][1]:.2f}')
    if problems:
        return {'ok': False, 'line': f'chapter {chapter:2d}: verses in text {len(verses):3d}, not cut', 'problems': problems + [f'verses timed 0 of {len(verses)}']}
    cut = cut_chapter(wave, verses, letters, slop, skip_title)
    triples = cut['verses']
    low = high = None
    for v, (n, start, end) in zip(verses, triples):
        if end <= start:
            problems.append(f'verse {n}: start {start} is not before end {end}')
            continue
        spw = (end - start) / (len(v['words']) - (v['title_words'] if skip_title else 0))
        low = spw if low is None else min(low, spw)
        high = spw if high is None else max(high, spw)
        if (spw < SPW_MIN or spw > SPW_MAX) and (chapter, n) not in allow:
            problems.append(f'verse {n}: {spw:.2f} s a word ({len(v["words"])} words, {start}-{end})')
    for a, b in zip(triples, triples[1:]):
        if b[1] < a[2]:
            problems.append(f'verse {a[0]} ends at {a[2]}, after verse {b[0]} starts at {b[1]}')
    for entry in cut['listen']:
        log(f'  listen: {book} {chapter}:{entry["verse"]} {entry["edge"]}: {entry["reason"]} ({entry["cut"]})')
    lead = triples[0][1] if triples else float('nan')
    tail = duration - triples[-1][2] if triples else float('nan')
    line = (f'chapter {chapter:2d}: verses in text {len(verses):3d}, timed {len(triples):3d}, duration {duration:7.2f} s, before verse 1 {lead:6.2f} s, '
            f'after last verse {tail:6.2f} s, s/word min {low if low is not None else float("nan"):.2f} max {high if high is not None else float("nan"):.2f}'
            + (f', Psalm title {verses[0]["title_words"]} words {"NOT read: left to the opening wildcard" if skip_title else "read as the start of verse 1"}' if verses and verses[0]['title_words'] else ''))
    return {'ok': not problems, 'line': line, 'problems': problems, 'quiet': cut['quiet'], 'listen': cut['listen'],
            'aligned': [[v['n']] + letters[v['n']] for v in verses], 'title_skipped': skip_title,
            'timings': {'audio': audio_url(book, chapter), 'duration': round(duration, 2), 'verses': triples}}


def align_chapter(model: Model, book: str, chapter: int, mp3: Path, allow: set[tuple[int, int]], slop: dict, skip_title: bool = False) -> dict:
    """Times one chapter: the model says between which letters each verse lies (letters_of), the recording's level places both edges (cut_chapter)."""
    verses = chapter_text(book, chapter)
    for v in verses:
        for token in v['unconverted']:
            log(f'  no letters: {book} {chapter}:{v["n"]} token {token!r}')
    wave = decode(mp3)
    emission = model.emissions(wave)
    items = build_items(verses, skip_title)
    letters = letters_of(model.align(emission, items), items)
    return cut_and_check(book, chapter, wave, verses, letters, slop, allow, skip_title)


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def out_dir() -> Path:
    return REPO / 'public' / 'data' / 'audio' / EDITION


def read_json(path: Path, default):
    return json.loads(path.read_text(encoding='utf8')) if path.exists() else default


def compact(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, separators=(',', ':')) + '\n', encoding='utf8')


def write_chapters(book: str, results: dict[int, dict | None]) -> None:
    """Puts the chapters that passed into <book>.json; a chapter that failed (None) is taken out. A book left with no chapter has its file deleted. The app's index.json
    is NOT written here: it is made from the book files by scripts/audio-index.mjs (mw-zbgo4ep.49), so two books never edit one file."""
    path = out_dir() / f'{book}.json'
    data = read_json(path, {'v': 1, 'edition': EDITION, 'book': book, 'chapters': {}})
    for chapter, timings in results.items():
        data['chapters'].pop(str(chapter), None)
        if timings is not None:
            data['chapters'][str(chapter)] = timings
    data['chapters'] = {k: data['chapters'][k] for k in sorted(data['chapters'], key=int)}
    if data['chapters']:
        write_json(path, data)
    else:
        path.unlink(missing_ok=True)


def tools_path(kind: str, book: str) -> Path:
    return Path(__file__).resolve().parent / kind / f'{EDITION}-{book}.json'


def quiet_path(book: str) -> Path:
    return tools_path('quiet', book)


def listen_path(book: str) -> Path:
    return tools_path('listen', book)


def judged_path(book: str) -> Path:
    return tools_path('judged', book)


def read_quiet(book: str, slop: dict) -> dict:
    """What the maker measured of a book (scripts/audio-timings/quiet/<edition>-<book>.json): `aligned`, by chapter, the aligner's letters of each verse as
    [verse, its first letter's start, its last letter's end] (all the cut rule takes from the model, kept so the rule can be run again with no model); and
    `chapters`, by chapter, the boundaries as the recording's level gives them (cut_chapter), which the tests hold the timings to and the judge's proof plants its
    faults by. A file of the gap pass before the cut rule (v 1: no letters kept) is not read: the book is aligned again."""
    data = read_json(quiet_path(book), None)
    if not data or data.get('v') != 2:
        return {'v': 2, 'edition': EDITION, 'book': book, 'quietDb': QUIET_DB, 'frame': FRAME_SECONDS, 'slop': slop, 'titleSkipped': [], 'aligned': {}, 'chapters': {}}
    return data


def write_quiet(book: str, slop: dict, results: dict[int, dict | None]) -> None:
    """Puts each chapter's letters and boundaries into the quiet file, a chapter to a line; a chapter left out (None) is taken out."""
    data = read_quiet(book, slop)
    data['quietDb'], data['frame'], data['slop'] = QUIET_DB, FRAME_SECONDS, slop
    for chapter, result in results.items():
        for key in ('aligned', 'chapters'):
            data[key].pop(str(chapter), None)
        data['titleSkipped'] = sorted(set(data['titleSkipped']) - {chapter})
        if result is not None:
            data['aligned'][str(chapter)] = result['aligned']
            data['chapters'][str(chapter)] = result['quiet']
            if result['title_skipped']:  # a Psalm whose title the narrator did not read: the cut pass alone counts the verse's words without it too
                data['titleSkipped'] = sorted(set(data['titleSkipped']) | {chapter})
    lines = ['{']
    for key, value in data.items():
        if key not in ('aligned', 'chapters'):
            lines.append(f' {compact(key)}:{compact(value)},')
    for key in ('aligned', 'chapters'):
        names = sorted(data[key], key=int)
        lines.append(f' {compact(key)}:{{')
        lines += [f'  {compact(name)}:{compact(data[key][name])}' + (',' if name != names[-1] else '') for name in names]
        lines.append(' }' + (',' if key == 'aligned' else ''))
    lines.append('}')
    path = quiet_path(book)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(lines) + '\n', encoding='utf8')


def verse_key(name: str) -> tuple[int, int]:
    chapter, verse = name.split(':')
    return int(chapter), int(verse)


def write_listen(book: str, slop: dict, results: dict[int, list | None], judged: dict | None = None) -> list[dict]:
    """THE LISTEN LIST (scripts/audio-timings/listen/<edition>-<book>.json): the edges of a book the recording leaves no room for, for the Governor's ear, an edge
    to a line: {'verse': 'chapter:verse', 'edge': 'head' | 'tail', 'reason', 'room', 'cut', 'judge'}. `results` are the chapters cut now (their entries replace the
    chapter's; None takes the chapter out). `judge` is what the judge hears at the chosen cut: 'ok', or its flags of that edge, copied from the judged report by
    --listen (`judged`: the report's flags by (verse, edge)); a cut that did not move keeps what was heard of it, a new cut has none until it is judged."""
    old = read_json(listen_path(book), {'verses': []})
    heard = {(e['verse'], e['edge']): e for e in old['verses']} if old.get('slop') == slop else {}
    entries = [e for e in old['verses'] if verse_key(e['verse'])[0] not in results and e['edge'] != 'text']
    for chapter, found in results.items():
        for entry in found or []:
            entry = {**entry, 'verse': f'{chapter}:{entry["verse"]}'}
            before = heard.get((entry['verse'], entry['edge']))
            if before and 'judge' in before and (before.get('cut'), before.get('room')) == (entry['cut'], entry['room']):
                entry['judge'] = before['judge']
            entries.append(entry)
    if judged is None:
        entries += [e for e in old['verses'] if e['edge'] == 'text']
    else:
        for entry in entries:
            entry['judge'] = judged.get((entry['verse'], entry['edge']), 'ok')
        for (verse, edge), flags in judged.items():
            if edge == 'text':  # a difference in the middle of a verse is no cut's fault and no cut can cure it: it can only be listened to
                said = flags[0].get('heard', {})
                entries.append({'verse': verse, 'edge': 'text', 'judge': flags,
                                'reason': f"the judge's two ears heard '{said.get('words', '')}' where the text has '{said.get('expected', '')}': not a cut's fault"})
    entries.sort(key=lambda e: (verse_key(e['verse']), ['head', 'text', 'tail'].index(e['edge'])))
    lines = ['{', f' "v":1,"edition":{compact(EDITION)},"book":{compact(book)},"slop":{compact(slop)},', ' "verses":[']
    lines += ['  ' + compact(e) + (',' if k + 1 < len(entries) else '') for k, e in enumerate(entries)]
    lines += [' ]', '}']
    path = listen_path(book)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(lines) + '\n', encoding='utf8')
    return entries


EDGES = {'head-extra': 'head', 'head-clipped': 'head', 'tail-extra': 'tail', 'tail-clipped': 'tail', 'text-differs': 'text'}


def run_listen(book: str, slop: dict) -> bool:
    """After the judge: writes into the listen list what the judge hears at each listed edge (its flags there, or ok), and says whether the book may ship: the
    judged report is of the timings as they are (its sha256), at the slop in force, and has no flag outside the listen list. tests/unit/audio-judged.test.ts holds
    the same in the gate."""
    import hashlib

    timings = out_dir() / f'{book}.json'
    report = read_json(judged_path(book), None)
    if report is None or not timings.exists():
        raise Stop(f'{book} has no timings or was never judged: run judge.py --book {book}')
    sha = hashlib.sha256(timings.read_bytes()).hexdigest()
    if report['timings']['sha256'] != sha:
        raise Stop(f'the judged report is of other timings ({report["timings"]["sha256"][:12]}..., the file is {sha[:12]}...): run judge.py --book {book} again')
    if report['slop'] != slop:
        raise Stop(f'the judged report was judged at the slop {report["slop"]}, player-slop.json says {slop}: cut again (--cut) and judge again')
    flags: dict[tuple[str, str], list] = {}
    for chapter, result in report['chapters'].items():
        for verse in result['verses']:
            for flag in verse.get('flags', []):
                flags.setdefault((f'{chapter}:{verse["n"]}', EDGES[flag['kind']]), []).append(flag)
    entries = write_listen(book, slop, {}, flags)
    on_list = {(e['verse'], e['edge']) for e in entries}
    outside = sorted((key for key in flags if key not in on_list), key=lambda key: (verse_key(key[0]), key[1]))
    summary = report['summary']
    log(f'{book}: {summary["verses"]} verses judged, {summary["ok"]} ok, {summary["flagged"]} flagged; ' + ', '.join(f'{k} {v}' for k, v in summary['flags'].items()))
    log(f'the listen list: {len(entries)} edges of {len({e["verse"] for e in entries})} verses')
    for entry in entries:
        heard = 'ok' if entry['judge'] == 'ok' else '; '.join(f'{f["kind"]}' + (f' {f["by"]} s' if 'by' in f else '') + f' {compact(f.get("heard", {}))}' for f in entry['judge'])
        log(f'  {entry["verse"]} {entry["edge"]}: {entry["reason"]}. The judge: {heard}')
    log(f'flags outside the listen list: {len(outside)}')
    for verse, edge in outside:
        log(f'  {verse} {edge}: ' + '; '.join(compact(f) for f in flags[(verse, edge)]))
    return not outside


def run_cut(book: str, chapters: list[int] | None, scratch: Path, fetcher: Fetcher, slop: dict, allow: set[tuple[int, int]]) -> bool:
    """The cut rule alone, from the aligner's letters already kept in the quiet file: each chapter's MP3 is decoded and every edge placed again by the recording's
    level; no model, nothing aligned again. For a changed slop, or a changed rule."""
    kept = read_quiet(book, slop)
    if not kept['aligned']:
        raise Stop(f"no aligner's letters kept for {book} (scripts/audio-timings/quiet/): align it first")
    if chapters is not None and kept['slop'] != slop:
        raise Stop(f'the book was cut at the slop {kept["slop"]}, player-slop.json says {slop}: cut the whole book again, without --chapters')
    before = read_json(out_dir() / f'{book}.json', {'chapters': {}})['chapters']
    moved_starts = moved_ends = verses_cut = 0
    widest = (0.0, '')
    left_out = []
    for key in sorted(kept['aligned'], key=int):
        chapter = int(key)
        if chapters is not None and chapter not in chapters:
            continue
        mp3 = fetcher.get(audio_url(book, chapter), scratch / 'mp3' / Path(audio_url(book, chapter)).name)
        verses = chapter_text(book, chapter)
        result = cut_and_check(book, chapter, decode(mp3), verses, {row[0]: row[1:] for row in kept['aligned'][key]}, slop, allow, chapter in kept['titleSkipped'])
        log(result['line'])
        if not result['ok']:
            left_out.append(chapter)
            for problem in result['problems']:
                log(f'  LEFT OUT chapter {chapter}: {problem}')
            write_chapters(book, {chapter: None})
            write_quiet(book, slop, {chapter: None})
            write_listen(book, slop, {chapter: None})
            continue
        was = {t[0]: t for t in before.get(key, {}).get('verses', [])}
        for n, start, end in result['timings']['verses']:
            verses_cut += 1
            if n in was:
                moved_starts += was[n][1] != start
                moved_ends += was[n][2] != end
                for move in (start - was[n][1], end - was[n][2]):
                    if abs(move) > abs(widest[0]):
                        widest = (round(move, 2), f'{chapter}:{n}')
        write_chapters(book, {chapter: result['timings']})
        write_quiet(book, slop, {chapter: result})
        write_listen(book, slop, {chapter: result['listen']})
    log(f'verses cut {verses_cut}; starts moved {moved_starts}, ends moved {moved_ends}, the widest move {widest[0]} s at {widest[1] or "-"}; left out: {left_out or "none"}')
    return not left_out


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


# A proper name the model spells as it knows it, not as the text does: the text's word -> the spellings the model may give it, each a name's own other spelling and
# so far from the text's by more than one letter (mw-zbgo4ep.37: Genesis 24:51, 'rebekah' heard as 'rebecca', an edit distance of 3). A name is added here only when
# a FAIL line of --check shows the model hearing the right name; a misheard word is never added.
HEARD_AS = {
    'rebekah': {'rebecca'},
}


def heard_as_written(heard: str, written: str) -> bool:
    """--check's test of one end of a verse: the word the model heard is the text's word, to one letter, or a name's other spelling the model knows."""
    return bool(heard) and (edit_distance(heard, written) <= 1 or heard in HEARD_AS.get(written, ()))


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
        ok = bool(heard) and heard_as_written(heard[0], first) and heard_as_written(heard[-1], last)
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
    parser.add_argument('--cut', '--gaps', action='store_true', dest='cut',
                        help="run the cut rule alone, from the aligner's letters already kept: every edge placed again by the recording's level, no model, nothing aligned again")
    parser.add_argument('--listen', action='store_true', help='after the judge: write what it hears at each edge of the listen list, and say whether any flag is outside the list')
    args = parser.parse_args()
    scratch = args.scratch.expanduser().resolve()
    if REPO in scratch.parents or scratch == REPO:
        raise Stop('the scratch folder must be outside the repo')
    (scratch / 'mp3').mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    fetcher = Fetcher()
    try:
        slop = read_slop()
        allow = {tuple(int(x) for x in pair.split(':')) for pair in args.allow_flagged.split(',') if pair}
        if args.check:
            return 0 if run_check(args.book, scratch, fetcher) else 1
        if args.listen:
            return 0 if run_listen(args.book, slop) else 1
        if args.cut:
            return 0 if run_cut(args.book, [int(c) for c in args.chapters.split(',')] if args.chapters else None, scratch, fetcher, slop, allow) else 1
        book_dir = REPO / 'public' / 'data' / args.book
        chapters = [int(c) for c in args.chapters.split(',')] if args.chapters else sorted(int(p.stem) for p in book_dir.glob('*.json'))
        kept = read_quiet(args.book, slop)
        # a chapter is done when its timings are written AND its letters are kept (a book timed before the cut rule has no letters: it is aligned again)
        done = set() if args.redo else {int(k) for k in read_json(out_dir() / f'{args.book}.json', {'chapters': {}})['chapters']} & {int(k) for k in kept['aligned']}
        todo = [c for c in chapters if c not in done]
        if len(todo) != len(chapters):
            log(f'skipped, already in {args.book}.json (--redo aligns them again): {[c for c in chapters if c in done]}')
        if todo and kept['chapters'] and kept['slop'] != slop:
            raise Stop(f'the book was cut at the slop {kept["slop"]}, player-slop.json says {slop}: cut the whole book again first (--cut)')
        model = Model(scratch) if todo else None
        lines = []
        left_out = []
        for chapter in todo:
            mp3 = fetcher.get(audio_url(args.book, chapter), scratch / 'mp3' / Path(audio_url(args.book, chapter)).name)
            t0 = time.monotonic()
            result = align_chapter(model, args.book, chapter, mp3, allow, slop)
            if not result['ok'] and chapter_text(args.book, chapter)[0]['title_words']:
                log(result['line'] + f'  [{time.monotonic() - t0:.0f} s]')
                log(f'  chapter {chapter} did not pass with its Psalm title read as verse 1: {result["problems"]}; trying again with the title left to the opening wildcard')
                result = align_chapter(model, args.book, chapter, mp3, allow, slop, skip_title=True)
            log(result['line'] + f'  [{time.monotonic() - t0:.0f} s]')
            lines.append(result['line'])
            if result['ok']:
                write_chapters(args.book, {chapter: result['timings']})
                write_quiet(args.book, slop, {chapter: result})
                write_listen(args.book, slop, {chapter: result['listen']})
            else:
                left_out.append(chapter)
                write_chapters(args.book, {chapter: None})
                write_quiet(args.book, slop, {chapter: None})
                write_listen(args.book, slop, {chapter: None})
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
