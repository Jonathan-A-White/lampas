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


def test_a_silence_shorter_than_a_quiet_is_still_where_the_cut_goes():
    # Genesis 23:14: 45 ms of silence between two verses, less than the maker calls a quiet: cut in its middle, listed with its length, not called a read-on
    parts = [(0.5, None), (1.0, -20), (0.045, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'answered abraham'), verse(2, 'listen to me')], {1: [0.6, 1.3], 2: [1.7, 2.4]}, SLOP)
    (_, _, end1), (_, start2, _) = cut['verses']
    assert near(end1, 1.5225) and near(start2, 1.5225) and end1 <= start2
    assert len(cut['quiet'][1]) == 3 and near(cut['quiet'][1][1], 1.5) and near(cut['quiet'][1][2], 1.545)
    assert [(e['verse'], e['edge']) for e in cut['listen']] == [(1, 'tail'), (2, 'head')] and 'a quiet of' in cut['listen'][0]['reason']


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
    # no heading in the text: the longest quiet between the two letters is the boundary, and a sound that is more than a click (40 ms here), 70 ms before the
    # first word, stays with that word
    parts = [(0.5, None), (1.0, -20), (0.6, None), (0.04, -30), (0.07, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'some of')], {1: [0.6, 1.4], 2: [2.3, 3.1]}, SLOP)
    assert near(cut['verses'][0][2], 1.55) and near(cut['verses'][1][1], 2.10 - 0.05)


def test_a_click_before_a_verse_s_first_word_is_not_its_first_sound():
    # John 9:40 (mw-ar5k42b.6): after 9:39 1.3 s of quiet, a click of 15 ms at -46 dBFS, 60 ms of silence, then 'Some'. The quiet file gave 9:39's next onset as
    # 313.57, the click's, and 9:40 started 50 ms before the click; the word begins at 313.645.
    parts = [(0.5, None), (1.0, -20), (1.305, None), (0.015, -46), (0.06, None), (1.0, -20), (0.5, None)]  # the click 2.805-2.82, the word from 2.88
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'that those who see may become blind'), verse(2, 'some of the pharisees')], {1: [0.6, 1.3], 2: [2.95, 3.7]}, SLOP)
    row = cut['quiet'][1]
    assert len(row) == 3 and near(row[1], 1.5)  # the sound before has died where the verse before ends, as it did
    assert near(row[2], 2.88), f'the next onset is {row[2]}: the click is at 2.805, the word begins at 2.88'
    (_, _, end1), (_, start2, _) = cut['verses']
    assert near(end1, 1.5 + 0.05)
    assert near(start2, 2.88 - 0.05)  # the lead slop before the word, not before the click
    assert cut['listen'] == []


def test_a_click_is_not_the_first_sound_after_the_announcement_or_a_heading_either():
    # the same click before verse 1 (the aligner was given a wildcard before it), and before a verse with a heading that is not read
    parts = [(0.2, None), (0.8, -20), (0.6, None), (0.015, -46), (0.06, None), (1.0, -20), (0.5, None), (0.015, -46), (0.06, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'in the'), verse(2, 'and god', heading=True)], {1: [1.75, 2.6], 2: [3.3, 4.1]}, SLOP)
    assert near(cut['quiet'][0][1], 1.0) and near(cut['quiet'][0][2], 1.675)  # the announcement has died at 1.0; verse 1's word begins at 1.675, the click at 1.6
    assert near(cut['quiet'][1][2], 3.25) and len(cut['quiet'][1]) == 3  # the click at 3.175 is not something spoken between the two verses
    assert near(cut['verses'][0][1], 1.675 - 0.05) and near(cut['verses'][1][1], 3.25 - 0.05) and cut['listen'] == []


def test_two_clicks_before_a_first_word_are_both_passed():
    parts = [(0.5, None), (1.0, -20), (0.6, None), (0.015, -46), (0.04, None), (0.01, -46), (0.06, None), (1.0, -20), (0.5, None)]  # the word from 2.225
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'some of')], {1: [0.6, 1.4], 2: [2.3, 3.1]}, SLOP)
    assert near(cut['quiet'][1][2], 2.225) and near(cut['verses'][1][1], 2.225 - 0.05)


def test_a_first_sound_longer_than_a_click_is_the_verse_s_own():
    # Genesis 10:14: 'The' (100 ms), the 20 ms closure of the p, 'Pathrusites'. And a sound of 30 ms with 60 ms of silence after it: more than a click
    parts = [(0.5, None), (1.0, -20), (0.4, None), (0.1, -15), (0.02, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'the pathrusites')], {1: [0.6, 1.4], 2: [1.95, 2.9]}, SLOP)
    assert near(cut['quiet'][1][2], 1.9) and near(cut['verses'][1][1], 1.9 - 0.05)
    parts = [(0.5, None), (1.0, -20), (0.4, None), (0.03, -30), (0.06, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'some of')], {1: [0.6, 1.4], 2: [2.05, 2.9]}, SLOP)
    assert near(cut['quiet'][1][2], 1.9) and near(cut['verses'][1][1], 1.9 - 0.05)


def test_a_short_sound_with_less_than_a_click_s_silence_after_it_is_the_verse_s_own():
    # Genesis 19:30: 10 ms of sound, 20 ms of silence, then 'Lot': too little silence to say the sound is not the word's
    parts = [(0.5, None), (1.0, -20), (0.4, None), (0.01, -39), (0.02, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'lot and his')], {1: [0.6, 1.4], 2: [2.0, 2.9]}, SLOP)
    assert near(cut['quiet'][1][2], 1.9) and near(cut['verses'][1][1], 1.9 - 0.05)


def test_a_short_sound_the_aligner_puts_the_first_letter_at_is_the_verse_s_own():
    # the same sound as John 9:40's click, but the aligner hears the verse's first letter in it: the silence after it is not between the two verses' letters
    parts = [(0.5, None), (1.0, -20), (1.305, None), (0.015, -46), (0.06, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'some of')], {1: [0.6, 1.3], 2: [2.81, 3.7]}, SLOP)
    assert near(cut['quiet'][1][2], 2.805) and near(cut['verses'][1][1], 2.805 - 0.05)


def test_a_short_sound_before_a_word_that_begins_with_a_stop_may_be_its_release_and_stays_its_first_sound():
    # the same sound and silence as John 9:40's, before 'Put' (Exodus 4:7) and 'But' (Genesis 4:5): the stop's release, its breath too faint for the gate
    parts = [(0.5, None), (1.0, -20), (1.305, None), (0.015, -46), (0.06, None), (1.0, -20), (0.5, None)]
    for words in ('put your hand', 'but he had', 'jesus said', 'the pharisees'):
        cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, words)], {1: [0.6, 1.3], 2: [2.95, 3.7]}, SLOP)
        assert near(cut['quiet'][1][2], 2.805) and near(cut['verses'][1][1], 2.805 - 0.05), words


def test_a_psalm_whose_title_was_not_read_is_judged_by_the_first_word_after_the_title():
    # 'A Psalm of David. O LORD ...': the title left to the opening wildcard, verse 1 begins at 'O', which is no stop; with the title read it begins at 'A' all the same
    parts = [(0.2, None), (0.8, -20), (0.6, None), (0.015, -46), (0.06, None), (1.0, -20), (0.5, None)]
    psalm = {'n': 1, 'heading': True, 'words': 'to david o lord'.split(), 'title_words': 2}
    assert near(align.cut_chapter(wave_of(parts), [psalm], {1: [1.75, 2.6]}, SLOP, True)['quiet'][0][2], 1.675)
    assert near(align.cut_chapter(wave_of(parts), [psalm], {1: [1.75, 2.6]}, SLOP)['quiet'][0][2], 1.6)  # 'to' may begin with a release


def test_a_stop_s_release_as_short_as_a_click_still_stays_with_its_word():
    # '...sent': the 80 ms closure of the t, a release of 15 ms, then the gap. It is the verse's last sound: the click rule is for a verse's FIRST sound alone
    parts = [(0.5, None), (1.0, -20), (0.08, None), (0.015, -40), (0.5, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'had been sent'), verse(2, 'and he')], {1: [0.6, 1.45], 2: [2.2, 3.0]}, SLOP)
    assert near(cut['quiet'][1][1], 1.595) and near(cut['verses'][0][2], 1.595 + 0.05)  # after the release, not in the closure
    assert near(cut['quiet'][1][2], 2.095) and near(cut['verses'][1][1], 2.095 - 0.05)


def test_a_closing_line_after_the_last_verse_is_not_in_it():
    parts = [(0.5, None), (1.0, -20), (0.5, None), (0.9, -20), (0.3, None)]  # the verse, a pause, a closing line, the file's end
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b')], {1: [0.6, 1.4]}, SLOP)
    assert near(cut['verses'][0][2], 1.55)
    assert near(cut['quiet'][-1][1], 1.5) and near(cut['quiet'][-1][2], 2.0)  # the next sound is the closing line's


def test_a_word_left_in_after_the_last_verse_is_not_in_it():
    # Genesis 14: '... take their portion.', 140 ms of quiet, then 'They' (a retake left in the recording), and the file ends 150 ms after it
    parts = [(0.5, None), (1.0, -20), (0.14, None), (0.41, -15), (0.155, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'take their portion')], {1: [0.6, 1.35]}, SLOP)
    assert near(cut['verses'][0][2], 1.5 + 0.05)  # before the word, with the whole margin
    assert near(cut['quiet'][-1][1], 1.5) and near(cut['quiet'][-1][2], 1.64) and cut['listen'] == []


def test_a_heading_read_with_short_pauses_is_still_in_neither_verse():
    parts = [(0.5, None), (1.0, -20), (0.15, None), (0.8, -20), (0.15, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'a b'), verse(2, 'c d', heading=True)], {1: [0.6, 1.4], 2: [2.7, 3.5]}, SLOP)
    assert near(cut['verses'][0][2], 1.55) and near(cut['verses'][1][1], 2.55) and len(cut['quiet'][1]) == 5


def test_a_stop_closure_before_a_heading_s_pause_stays_with_its_word_and_a_click_after_it_is_in_neither_verse():
    # '...sent' (closure, release), a pause, [no heading read], a click 60 ms before the first word (mw-ar5k42b.6: the click was taken for the word's first sound)
    parts = [(0.5, None), (1.0, -20), (0.08, None), (0.05, -25), (0.6, None), (0.01, -30), (0.06, None), (1.0, -20), (0.5, None)]
    cut = align.cut_chapter(wave_of(parts), [verse(1, 'had been sent'), verse(2, 'some of', heading=True)], {1: [0.6, 1.45], 2: [2.45, 3.2]}, SLOP)
    assert near(cut['verses'][0][2], 1.63 + 0.05) and near(cut['verses'][1][1], 2.30 - 0.05) and len(cut['quiet'][1]) == 3


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


def test_check_takes_a_name_the_model_spells_as_it_knows_it_for_the_word_the_text_has():
    # --check (mw-zbgo4ep.37): 24:51 of Genesis, the text's 'rebekah' heard as 'rebecca' (an edit distance of 3) was counted a miss
    assert align.heard_as_written('rebecca', 'rebekah')
    assert align.heard_as_written('rebekah', 'rebekah')
    assert align.heard_as_written('rebekahs', 'rebekah')  # one letter, as before
    assert not align.heard_as_written('rebecca', 'esau')
    assert not align.heard_as_written('rebecca', 'laban')
    assert not align.heard_as_written('', 'rebekah')
