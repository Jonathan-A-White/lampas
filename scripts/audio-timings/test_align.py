"""The maker's cut rule (mw-ar5k42b.3; docs/data.md 'The cut rule'). No model, no recording: synthetic chapters made of noise and silence, and letters put where an
aligner would put them. Run by hand in the judge's venv (it has numpy and pytest), like test_judge.py:

    ~/.cache/lampas-audio-timings/judge-venv/bin/python -m pytest scripts/audio-timings/test_align.py -q -p no:cacheprovider
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

import align  # noqa: E402

SR = align.SAMPLE_RATE
SLOP = {'lead': 0.05, 'tail': 0.05}


def wave_of(parts) -> np.ndarray:
    """(seconds, level in dBFS; None is digital silence) -> samples."""
    rng = np.random.default_rng(7)
    pieces = []
    for seconds, level in parts:
        count = int(round(seconds * SR))
        pieces.append(np.zeros(count, dtype='float32') if level is None else (rng.standard_normal(count) * 10 ** (level / 20)).astype('float32'))
    return np.concatenate(pieces)


def verse(n: int, words: str, heading: bool = False) -> dict:
    return {'n': n, 'heading': heading, 'words': words.split(), 'title_words': 0}


def near(value: float, wanted: float, within: float = 0.011) -> bool:
    """The noise's edge is read to a frame's hop and the cut is to two decimals: a centisecond's grace."""
    return abs(value - wanted) <= within


# An announcement, verse 1 with a pause in it, a gap, verse 2 read on into verse 3 through a dip that is no quiet, a quiet the file ends in.
PARTS = [
    (0.20, None),
    (0.80, -20),  # 0.20-1.00 the announcement
    (0.60, None),
    (0.60, -20),  # 1.60-2.20 verse 1 'in the'
    (0.20, None),  # a pause inside verse 1
    (0.60, -20),  # 2.40-3.00 verse 1 'beginning'
    (0.50, None),  # the gap
    (1.48, -20),  # 3.50-4.98 verse 2 'was the word'
    (0.04, -40),  # 4.98-5.02 a dip, not a quiet: the narrator reads on
    (0.98, -20),  # 5.02-6.00 verse 3 'and god'
    (0.40, None),
]
VERSES = [verse(1, 'in the beginning'), verse(2, 'was the word'), verse(3, 'and god')]
LETTERS = {1: [1.70, 2.90], 2: [3.60, 4.90], 3: [5.10, 5.90]}  # a letter is heard near the middle of its sound: after the onset, before the end


@pytest.fixture(scope='module')
def cut():
    return align.cut_chapter(wave_of(PARTS), VERSES, LETTERS, SLOP)


def test_each_end_is_the_tail_slop_after_the_last_sound_and_each_start_the_lead_slop_before_the_first(cut):
    (_, start1, end1), (_, start2, _), (_, _, end3) = cut['verses']
    assert near(start1, 1.60 - 0.05)  # not at the announcement, not at the pause inside the verse
    assert near(end1, 3.00 + 0.05)  # not at the pause inside the verse
    assert near(start2, 3.50 - 0.05)
    assert near(end3, 6.00 + 0.05)


def test_the_margin_is_kept_both_ways_to_two_decimals(cut):
    rows = cut['quiet']
    for (n, start, end), before, after in zip(cut['verses'], rows, rows[1:]):
        assert round(start * 100) == pytest.approx(start * 100) and round(end * 100) == pytest.approx(end * 100)
        if n == 1:
            assert start - SLOP['lead'] >= before[1] - 1e-9  # the clip at its longest holds nothing of the announcement
            assert start + SLOP['lead'] <= before[2] + 1e-9  # the clip at its shortest loses nothing of the verse
            assert end - SLOP['tail'] >= after[1] - 1e-9 and end + SLOP['tail'] <= after[2] + 1e-9


def test_the_announcement_is_in_no_verse(cut):
    assert near(cut['quiet'][0][1], 1.00) and near(cut['quiet'][0][2], 1.60)  # [0, the announcement's last sound has died, verse 1's first sound]
    assert cut['verses'][0][1] > 1.00 + SLOP['lead']


def test_where_the_narrator_reads_on_both_verses_are_cut_at_the_quietest_instant_and_listed(cut):
    (_, _, end2), (_, start3, _) = cut['verses'][1:]
    assert end2 == start3
    assert 4.98 <= end2 <= 5.02
    assert cut['quiet'][2][:3] == [2, None, None] and 4.98 <= cut['quiet'][2][3] <= 5.02
    assert [(e['verse'], e['edge']) for e in cut['listen']] == [(2, 'tail'), (3, 'head')]
    assert "no quiet between 'word' and 'and'" in cut['listen'][0]['reason']
    assert cut['listen'][0]['room'] == 0


def test_the_file_ending_in_quiet_has_no_sound_after_the_last_verse(cut):
    assert cut['quiet'][-1][0] == 3 and near(cut['quiet'][-1][1], 6.00) and cut['quiet'][-1][2] is None


def test_a_quiet_too_short_for_the_margin_is_cut_in_its_middle_and_listed():
    parts = [(0.5, None), (1.0, -20), (0.075, None), (1.0, -20), (0.5, None)]  # John 1:24: 75 ms between two verses, the player needs 100
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'had been sent'), verse(2, 'asked him')], {1: [0.6, 1.4], 2: [1.7, 2.4]}, SLOP)
    (_, _, end1), (_, start2, _) = cut['verses']
    assert near(end1, 1.5375) and near(start2, 1.5375) and end1 <= start2
    assert [(e['verse'], e['edge']) for e in cut['listen']] == [(1, 'tail'), (2, 'head')]
    assert 'less than the 100 ms' in cut['listen'][0]['reason'] and near(cut['listen'][0]['room'], 0.075, 0.006)


def test_a_quiet_of_just_the_margin_both_ways_is_not_listed():
    parts = [(0.5, None), (1.0, -20), (0.13, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'c d')], {1: [0.6, 1.4], 2: [1.75, 2.4]}, SLOP)
    assert cut['listen'] == []
    (_, _, end1), (_, start2, _) = cut['verses']
    assert near(end1, 1.55) and near(start2, 1.58) and end1 <= start2


def test_a_heading_read_aloud_between_two_verses_is_in_neither():
    # verse 1, a pause, 'THE FIRST DAY' read aloud, a pause, verse 2 (which has the heading in the text, so the aligner was given a wildcard there)
    parts = [(0.5, None), (1.0, -20), (0.4, None), (0.8, -20), (0.5, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'c d', heading=True)], {1: [0.6, 1.4], 2: [3.3, 4.1]}, SLOP)
    (_, _, end1), (_, start2, _) = cut['verses']
    assert near(end1, 1.5 + 0.05)  # before the heading
    assert near(start2, 3.2 - 0.05)  # after it
    row = cut['quiet'][1]
    assert len(row) == 5 and near(row[1], 1.5) and near(row[2], 3.2) and near(row[3], 1.9) and near(row[4], 2.7)  # ..., the heading from 1.9 to 2.7
    assert cut['listen'] == []


def test_a_heading_not_read_is_one_quiet_like_any_other():
    parts = [(0.5, None), (1.0, -20), (0.9, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'c d', heading=True)], {1: [0.6, 1.4], 2: [2.5, 3.3]}, SLOP)
    assert len(cut['quiet'][1]) == 3
    assert near(cut['verses'][0][2], 1.55) and near(cut['verses'][1][1], 2.35)


def test_a_sound_between_two_verses_with_no_wildcard_goes_to_the_side_of_the_shorter_quiet():
    # no heading in the text: the longest quiet between the two letters is the boundary (a click before a first word stays with that word, John 9:40)
    parts = [(0.5, None), (1.0, -20), (0.6, None), (0.01, -30), (0.07, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'some of')], {1: [0.6, 1.4], 2: [2.3, 3.1]}, SLOP)
    assert near(cut['verses'][0][2], 1.55) and near(cut['verses'][1][1], 2.10 - 0.05)


def test_a_closing_line_after_the_last_verse_is_not_in_it():
    parts = [(0.5, None), (1.0, -20), (0.5, None), (0.9, -20), (0.3, None)]  # the verse, a pause, a closing line, the file's end
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b')], {1: [0.6, 1.4]}, SLOP)
    assert near(cut['verses'][0][2], 1.55)
    assert near(cut['quiet'][-1][1], 1.5) and near(cut['quiet'][-1][2], 2.0)  # the next sound is the closing line's


def test_a_stop_closure_after_the_last_letter_stays_with_its_word():
    # '...sent': the letters end before the closure of the t; its burst comes 80 ms later; then the real gap
    parts = [(0.5, None), (1.0, -20), (0.08, None), (0.05, -25), (0.5, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'had been sent'), verse(2, 'c d')], {1: [0.6, 1.45], 2: [2.25, 3.0]}, SLOP)
    assert near(cut['verses'][0][2], 1.63 + 0.05)  # after the burst, not in the closure


def test_the_last_verse_ends_by_its_own_sound_and_a_file_that_ends_too_soon_is_listed():
    cut = align.cut_chapter(wave_of([(0.5, None), (1.0, -20), (0.2, None)]), [verse(1, 'a b')], {1: [0.6, 1.2]}, SLOP)  # the letters end 0.3 s before the sound does
    assert near(cut['verses'][0][2], 1.55) and cut['listen'] == []
    cut = align.cut_chapter(wave_of([(0.5, None), (1.0, -20), (0.07, None)]), [verse(1, 'a b')], {1: [0.6, 1.2]}, SLOP)
    assert near(cut['verses'][0][2], 1.55) and cut['verses'][0][2] <= 1.57 and cut['listen'] == []  # 70 ms: room for the 50 ms tail
    cut = align.cut_chapter(wave_of([(0.5, None), (1.0, -20), (0.065, None)]), [verse(1, 'a b')], {1: [0.6, 1.2]}, {'lead': 0.05, 'tail': 0.1})
    assert cut['verses'][0][2] <= 1.565 and [(e['verse'], e['edge']) for e in cut['listen']] == [(1, 'tail')]


def test_a_file_with_no_announcement_starts_the_first_verse_by_its_own_sound():
    cut = align.cut_chapter(wave_of([(0.5, None), (1.0, -20), (0.3, None)]), [verse(1, 'a b')], {1: [0.6, 1.4]}, SLOP)
    assert near(cut['verses'][0][1], 0.45) and cut['quiet'][0][:2] == [0, None] and near(cut['quiet'][0][2], 0.5)


def test_the_two_slops_are_the_file_s_and_each_edge_keeps_its_own():
    parts = [(0.5, None), (1.0, -20), (0.15, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'c d')], {1: [0.6, 1.4], 2: [1.75, 2.5]}, {'lead': 0.03, 'tail': 0.1})
    (_, _, end1), (_, start2, _) = cut['verses']
    assert near(end1, 1.575) and near(start2, 1.65 - 0.03) and end1 <= start2  # 150 ms is too short for a tail of 100 either way, enough for a lead of 30
    assert [(e['verse'], e['edge']) for e in cut['listen']] == [(1, 'tail')]
    assert align.read_slop() == {'lead': float(align.read_slop()['lead']), 'tail': float(align.read_slop()['tail'])}
    assert 'lead' in align.SLOP_PATH.read_text() and align.SLOP_PATH.name == 'player-slop.json'


def test_place_end_and_place_start_round_away_from_the_sound():
    assert align.place_end(12115, 12500, 50, 99999) == (12170, False)  # 12.165 is not 12.16: the clip at its shortest would lose 5 ms
    assert align.place_start(12115, 12505, 50) == (12450, False)  # 12.455 is not 12.46
    assert align.place_end(163365, 163440, 50, 999999) == (163400, True) and align.place_start(163365, 163440, 50) == (163410, True)  # John 1:24 and 1:25
    assert align.place_end(1000, 1100, 50, 99999) == (1050, False) and align.place_start(1000, 1100, 50) == (1050, False)  # exactly twice the slop: room
    assert align.place_end(1000, 1095, 50, 99999)[1] and align.place_start(1000, 1095, 50)[1]
    assert align.place_end(1000, None, 50, 1100) == (1050, False) and align.place_end(1000, None, 50, 1043) == (1040, True)  # the file's end
    assert align.place_start(None, 30, 50) == (0, False)  # nothing before: never below second 0


def test_the_quietest_instant_is_a_dip_not_one_frame_s_trough():
    # a voiced stretch with one frame 20 dB down (a pitch period's trough) and, elsewhere, a 40 ms dip of 12 dB (the boundary between two words)
    rng = np.random.default_rng(3)
    wave = (rng.standard_normal(SR) * 0.1).astype('float32')
    wave[int(0.200 * SR):int(0.210 * SR)] *= 0.1
    wave[int(0.500 * SR):int(0.540 * SR)] *= 0.25
    level = align.Level(wave)
    assert int(np.argmin(level.db)) == 40  # the lowest single frame is the trough, at 0.200 s ...
    assert 500 <= level.quietest(100, 900) <= 540  # ... and the quietest instant is in the dip
