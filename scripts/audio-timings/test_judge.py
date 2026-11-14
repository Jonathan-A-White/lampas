"""The judge's pure parts (mw-ar5k42b.1; docs/audio-judge.md). No model, no recording: a tiny synthetic chapter made of noise and silence, and ears that are faked.

    ~/.cache/lampas-audio-timings/judge-venv/bin/python -m pytest scripts/audio-timings/test_judge.py -q -p no:cacheprovider
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

import align  # noqa: E402
import judge  # noqa: E402

SR = judge.SAMPLE_RATE
SLOP = {'lead': 0.05, 'tail': 0.05}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The synthetic chapter: an announcement, verse 1 with a pause in it, a gap, verse 2 read on into verse 3 with no quiet, a closing quiet
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

PARTS = [  # (seconds, level in dBFS; None is digital silence)
    (0.20, None),
    (0.80, -20),  # 0.20-1.00 the announcement 'CHAPTER ONE'
    (0.60, None),
    (0.60, -20),  # 1.60-2.20 verse 1 'IN THE'
    (0.20, None),  # a pause inside verse 1
    (0.60, -20),  # 2.40-3.00 verse 1 'BEGINNING'
    (0.50, None),  # the gap
    (1.48, -20),  # 3.50-4.98 verse 2 'WAS THE WORD'
    (0.04, -40),  # 4.98-5.02 a dip, not a quiet: the narrator reads on
    (0.98, -20),  # 5.02-6.00 verse 3 'AND GOD'
    (0.40, None),
]
VERSES = [{'n': 1, 'words': ['in', 'the', 'beginning']}, {'n': 2, 'words': ['was', 'the', 'word']}, {'n': 3, 'words': ['and', 'god']}]
CLEAN = [[1, 1.5, 3.05], [2, 3.4, 5.0], [3, 5.0, 6.05]]


def wave_of(parts) -> np.ndarray:
    rng = np.random.default_rng(7)
    pieces = []
    for seconds, level in parts:
        count = int(round(seconds * SR))
        pieces.append(np.zeros(count, dtype='float32') if level is None else (rng.standard_normal(count) * 10 ** (level / 20)).astype('float32'))
    return np.concatenate(pieces)


def say(text: str, a: float, b: float) -> list[list]:
    """What a letters ear would hear of `text` between `a` and `b`: [label, start, end] with '|' between words, spread evenly."""
    labels = list(text.upper().replace(' ', '|'))
    step = (b - a) / len(labels)
    return [[label, round(a + k * step + step * 0.25, 3), round(a + k * step + step * 0.75, 3)] for k, label in enumerate(labels)]


def heard_of() -> list[list]:
    return (say('CHAPTER ONE', 0.2, 1.0) + [['|', 1.2, 1.22]] + say('IN THE', 1.6, 2.2) + [['|', 2.3, 2.32]] + say('BEGINNING', 2.4, 3.0) + [['|', 3.2, 3.22]]
            + say('WAS THE WORD', 3.5, 4.98) + [['|', 4.99, 5.01]] + say('AND GOD', 5.02, 6.0))


@pytest.fixture(scope='module')
def sound():
    return judge.sound_of(wave_of(PARTS))


class FakeEars:
    """Ears that say what they are told: the words of a clip by its span, the letters of an edge."""

    def __init__(self, words=None, told=None):
        self.words_by_span = words or {}
        self.told = told  # what it hears of any clip when it is told the verse's words; None: the same as untold
        self.asked: list[tuple[float, float]] = []
        self.hints: list[str] = []

    def words(self, a: float, b: float, hint: str | None = None) -> list[str]:
        if hint is not None:
            self.hints.append(hint)
            if self.told is not None:
                return self.told
        else:
            self.asked.append((round(a, 3), round(b, 3)))
        return self.words_by_span.get((round(a, 2), round(b, 2)), ['heard'])

    def letters(self, a: float, b: float) -> str:
        return 'LETTERS'


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The quiet ear
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def test_the_speech_level_is_the_level_of_the_sound_and_quiet_is_far_below_it(sound):
    assert sound.speech == pytest.approx(-20, abs=1.5)
    assert sound.floor == pytest.approx(sound.speech - judge.QUIET_BELOW_SPEECH)
    assert sound.duration == pytest.approx(6.4, abs=0.001)


def test_the_quiets_are_where_the_sound_has_died_until_it_begins_again(sound):
    expected = [(0.0, 0.2), (1.0, 1.6), (2.2, 2.4), (3.0, 3.5), (6.0, 6.4)]
    assert len(sound.quiets) == len(expected)
    for (a, b), (ea, eb) in zip(sound.quiets, expected):
        assert a == pytest.approx(ea, abs=0.011) and b == pytest.approx(eb, abs=0.011)
    # the dip at 5.0 s is 20 dB under the speech, not quiet: no quiet there
    assert not any(a < 5.0 < b for a, b in sound.quiets)


def test_a_dip_shorter_than_the_least_quiet_is_not_a_quiet():
    parts = [(0.3, -20), (judge.MIN_QUIET - 0.015, None), (0.3, -20), (judge.MIN_QUIET + 0.02, None), (0.3, -20)]
    quiets = judge.sound_of(wave_of(parts)).quiets
    assert len(quiets) == 1 and quiets[0][0] == pytest.approx(0.6 + judge.MIN_QUIET - 0.015, abs=0.011)


def test_the_level_of_a_span_is_against_the_speech_level(sound):
    assert sound.level(1.7, 2.0) == pytest.approx(0, abs=4)  # speech against speech
    assert sound.level(3.1, 3.4) < -judge.QUIET_BELOW_SPEECH  # the gap
    assert sound.level(4.985, 5.015) == pytest.approx(-20, abs=6)  # the dip


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The text: the same normaliser as the maker, and the letters paired with what was heard
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def test_the_normaliser_is_the_makers_own():
    assert judge.words_of is align.words_of
    assert judge.words_of('“Then 153 fish—large ones,” he said.')[0] == ['then', 'one', 'hundred', 'fifty', 'three', 'fish', 'large', 'ones', 'he', 'said']


def test_letters_heard_are_paired_with_the_text_and_the_rest_are_nobodys():
    pairs = judge.pair_letters('INTHEBEGINNING', 'CHAPTERONEINTHEBEGINING')
    assert pairs[:10] == [None] * 10  # the announcement is nobody's
    assert pairs[10:15] == [0, 1, 2, 3, 4]
    assert pairs[-1] == 13 and sum(p is not None for p in pairs) == 13  # one N of 'beginning' was not heard


def test_pairing_an_empty_side():
    assert judge.pair_letters('', 'ABC') == [None, None, None]
    assert judge.pair_letters('ABC', '') == []


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The measure: where each verse's own sound begins and ends, and the sound either side of it
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def test_each_verse_is_measured_from_the_sound_either_side_of_its_gap(sound):
    measured = judge.measure(VERSES, heard_of(), sound)
    one, two, three = measured['verses']
    assert measured['announcement'] == 'CHAPTER ONE'
    assert one['before'] == pytest.approx(1.0, abs=0.011) and one['onset'] == pytest.approx(1.6, abs=0.011)
    # the pause inside verse 1 (2.2-2.4) is not its end: the gap is the longest quiet before the next verse's first letter
    assert one['end'] == pytest.approx(3.0, abs=0.011) and one['after'] == pytest.approx(3.5, abs=0.011)
    assert not one['headReadsOn'] and not one['tailReadsOn']
    assert two['before'] == pytest.approx(3.0, abs=0.011) and two['onset'] == pytest.approx(3.5, abs=0.011)
    # verse 2 is read on into verse 3: no quiet, the boundary is the dip between the last letter of one and the first of the other
    assert two['tailReadsOn'] and three['headReadsOn']
    assert two['end'] == pytest.approx(5.0, abs=0.03) and two['after'] == two['end']
    assert three['before'] == three['onset'] == two['end']
    assert three['end'] == pytest.approx(6.0, abs=0.011) and three['after'] is None


def test_the_closing_quiet_is_found_whatever_the_recordings_length():
    # a duration that is not a whole millisecond (John 6: 548.5714375 s): the quiet that runs to the end is still the closing quiet
    odd = judge.sound_of(wave_of(PARTS + [(7 / SR, None)]))
    three = judge.measure(VERSES, heard_of(), odd)['verses'][2]
    assert three['end'] == pytest.approx(6.0, abs=0.011) and three['after'] is None


def test_a_chapter_with_no_announcement_has_no_sound_before_verse_one():
    parts = [(0.3, None), (0.7, -20), (0.3, None)]
    measured = judge.measure([{'n': 1, 'words': ['amen']}], say('AMEN', 0.3, 1.0), judge.sound_of(wave_of(parts)))
    only = measured['verses'][0]
    assert only['before'] is None and only['onset'] == pytest.approx(0.3, abs=0.011)
    assert only['end'] == pytest.approx(1.0, abs=0.011) and only['after'] is None
    assert measured['announcement'] == ''


def test_a_heading_read_aloud_between_two_verses_is_nobodys_sound():
    parts = [(0.2, None), (0.6, -20), (0.4, None), (0.5, -20), (0.4, None), (0.6, -20), (0.3, None)]
    heard = say('ONE TWO', 0.2, 0.8) + say('HEADING', 1.2, 1.7) + say('THREE FOUR', 2.1, 2.7)
    measured = judge.measure([{'n': 1, 'words': ['one', 'two']}, {'n': 2, 'words': ['three', 'four']}], heard, judge.sound_of(wave_of(parts)))
    one, two = measured['verses']
    assert one['end'] == pytest.approx(0.8, abs=0.011) and one['after'] == pytest.approx(1.2, abs=0.011)  # the heading is the next sound after verse 1
    assert two['before'] == pytest.approx(1.7, abs=0.011) and two['onset'] == pytest.approx(2.1, abs=0.011)
    assert measured['between'] == [{'after': 1, 'letters': 'HEADING'}]
    stray = say('ONE TWO', 0.2, 0.8) + say('B', 1.2, 1.7) + say('THREE FOUR', 2.1, 2.7)  # one letter is not a heading
    assert judge.measure([{'n': 1, 'words': ['one', 'two']}, {'n': 2, 'words': ['three', 'four']}], stray, judge.sound_of(wave_of(parts)))['between'] == []


def test_a_first_letter_heard_in_the_silence_before_its_sound_is_still_its_words(sound):
    # a word's first B is heard in its closure, a moment before the sound begins: the gap's quiet reaches past the letter, and the word is still heard whole
    early = [h for h in heard_of() if not (3.5 <= h[1] < 3.6)] + [['W', 3.46, 3.48]]
    early.sort(key=lambda h: h[1])
    two = judge.measure(VERSES, early, sound)['verses'][1]
    assert not two['headWeak'] and two['suspect'] == []
    assert two['before'] == pytest.approx(3.0, abs=0.011) and two['onset'] == pytest.approx(3.5, abs=0.011)


def test_an_edge_word_the_letters_did_not_hear_makes_the_edge_weak(sound):
    heard = [h for h in heard_of() if not (1.6 <= h[1] < 2.2)]  # 'IN THE' was not heard
    one = judge.measure(VERSES, heard, sound)['verses'][0]
    assert one['headWeak'] and not one['tailWeak']


def test_a_word_in_the_middle_the_letters_heard_otherwise_is_a_suspect(sound):
    heard = say('CHAPTER ONE', 0.2, 1.0) + say('IN THE', 1.6, 2.2) + say('BEGINNING', 2.4, 3.0) + say('WAS A BIRD', 3.5, 4.98) + say('AND GOD', 5.02, 6.0)
    measured = judge.measure(VERSES, heard, sound)['verses']
    assert measured[0]['suspect'] == [] and measured[1]['suspect'] != [] and measured[2]['suspect'] == []


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The flag rules: the clip at its longest holds nothing of its neighbours, the clip at its shortest loses nothing of its own
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

EDGES = {'before': 10.0, 'onset': 10.5, 'end': 15.0, 'after': 15.6, 'headReadsOn': False, 'tailReadsOn': False}


def kinds(flags) -> list[str]:
    return [f['kind'] for f in flags]


def test_a_cut_in_the_quiet_with_the_players_slop_either_side_is_clean():
    assert judge.flags_of(EDGES, 10.25, 15.3, SLOP) == []
    # to the very bound: the clip at its longest reaches the neighbour's sound, the clip at its shortest reaches its own
    assert judge.flags_of(EDGES, 10.05, 15.55, SLOP) == []
    assert judge.flags_of(EDGES, 10.45, 15.05, SLOP) == []


def test_the_end_past_the_next_verses_first_sound_is_tail_extra():
    flags = judge.flags_of(EDGES, 10.25, 15.65, SLOP)  # 50 ms past the onset: the long clip holds 100 ms of it
    assert kinds(flags) == ['tail-extra'] and flags[0]['by'] == pytest.approx(0.10)


def test_the_start_before_the_end_of_the_sound_before_is_head_extra():
    flags = judge.flags_of(EDGES, 9.95, 15.3, SLOP)
    assert kinds(flags) == ['head-extra'] and flags[0]['by'] == pytest.approx(0.10)


def test_the_end_before_its_own_last_sound_has_died_is_tail_clipped():
    flags = judge.flags_of(EDGES, 10.25, 14.9, SLOP)  # 100 ms before: the short clip loses 150 ms
    assert kinds(flags) == ['tail-clipped'] and flags[0]['by'] == pytest.approx(0.15)


def test_the_start_after_its_own_first_sound_is_head_clipped():
    flags = judge.flags_of(EDGES, 10.6, 15.3, SLOP)
    assert kinds(flags) == ['head-clipped'] and flags[0]['by'] == pytest.approx(0.15)


def test_less_than_the_tolerance_is_not_a_fault():
    just_under = judge.TOLERANCE - 0.005
    assert judge.flags_of(EDGES, 10.25, 15.6 - SLOP['tail'] + just_under, SLOP) == []
    assert kinds(judge.flags_of(EDGES, 10.25, 15.6 - SLOP['tail'] + judge.TOLERANCE + 0.005, SLOP)) == ['tail-extra']


def test_no_sound_before_or_after_means_no_extra_there():
    edges = dict(EDGES, before=None, after=None)
    assert judge.flags_of(edges, 0.0, 99.0, SLOP) == []


def test_a_read_on_boundary_cannot_be_cut_clean_and_says_so():
    edges = dict(EDGES, after=15.0, tailReadsOn=True)
    flags = judge.flags_of(edges, 10.25, 15.0, SLOP)  # the cut exactly at the boundary: 50 ms either way is a fault
    assert kinds(flags) == ['tail-extra', 'tail-clipped'] and all(f['readsOn'] for f in flags)
    assert all(f['by'] == pytest.approx(0.05) for f in flags)


def test_the_slop_is_the_one_files():
    wide = {'lead': 0.2, 'tail': 0.3}
    assert judge.flags_of(EDGES, 10.25, 15.3, wide) == []  # 10.05 and 15.6 at the longest, 10.45 and 15.0 at the shortest: to the very bounds
    assert kinds(judge.flags_of(EDGES, 10.25, 15.35, wide)) == ['tail-extra']  # 15.35 + 0.3 = 15.65: 50 ms into the next sound
    assert kinds(judge.flags_of(EDGES, 10.25, 15.35, SLOP)) == []
    slop = judge.read_slop()
    assert slop == {'lead': 0.05, 'tail': 0.05}
    raw = json.loads((Path(judge.__file__).resolve().parent / 'player-slop.json').read_text(encoding='utf8'))
    assert 'provisional' in raw['note'].lower()


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The words ear's comparison: the clip's first and last words against the verse's
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

VERSE = ['then', 'he', 'called', 'the', 'bridegroom', 'aside']


def test_the_same_words_are_no_difference():
    assert judge.compare_words(VERSE, VERSE) == {'headExtra': [], 'headMissing': [], 'tailExtra': [], 'tailMissing': [], 'middle': []}


def test_words_after_the_last_word_are_tail_extra():
    assert judge.compare_words(VERSE, VERSE + ['and', 'said'])['tailExtra'] == ['and', 'said']


def test_words_before_the_first_word_are_head_extra():
    assert judge.compare_words(VERSE, ['chapter', 'two'] + VERSE)['headExtra'] == ['chapter', 'two']


def test_a_missing_first_or_last_word_is_missing_at_that_edge():
    assert judge.compare_words(VERSE, VERSE[1:])['headMissing'] == ['then']
    assert judge.compare_words(VERSE, VERSE[:-1])['tailMissing'] == ['aside']


def test_a_word_in_the_middle_that_differs_is_the_middles():
    result = judge.compare_words(VERSE, ['then', 'he', 'called', 'the', 'groom', 'aside'])
    assert result['middle'] == [[['bridegroom'], ['groom']]]
    assert result['headExtra'] == result['tailExtra'] == result['headMissing'] == result['tailMissing'] == []
    added = judge.compare_words(VERSE, ['then', 'he', 'quickly', 'called', 'the', 'bridegroom', 'aside'])
    assert added['middle'] == [[[], ['quickly']]]


def test_a_spelling_the_recogniser_chose_is_not_a_difference():
    assert judge.compare_words(['at', 'cana', 'in', 'galilee'], ['at', 'kana', 'in', 'galilee'])['middle'] == []
    assert judge.compare_words(['nicodemus', 'said'], ['nicodemas', 'said'])['middle'] == []
    # a word written as two, or two as one
    assert judge.compare_words(['the', 'bridegroom', 'came'], ['the', 'bride', 'groom', 'came'])['middle'] == []
    # a sound two words share, written once (John 3:8)
    assert judge.compare_words(['you', 'hear', 'its', 'sound', 'but'], ['you', 'hear', 'it', 'sound', 'but'])['middle'] == []
    assert judge.compare_words(['you', 'hear', 'its', 'sound', 'but'], ['you', 'hear', 'a', 'sound', 'but'])['middle'] == [[['its'], ['a']]]


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# A chapter judged: clean timings, and each fault planted in a copy of them
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def judged(triples, sound, heard=None, ears=None):
    return judge.judge_chapter(VERSES, triples, sound, heard if heard is not None else heard_of(), SLOP, ears or FakeEars())


def verdicts(result) -> dict[int, list[str]]:
    return {v['n']: [f['kind'] for f in v.get('flags', [])] for v in result['verses']}


def test_clean_timings_are_ok_but_for_the_read_on(sound):
    result = judged(CLEAN, sound)
    assert result['verses'][0] == {'n': 1, 'verdict': 'ok', 'sound': [pytest.approx(1.0, abs=0.011), pytest.approx(1.6, abs=0.011), pytest.approx(3.0, abs=0.011), pytest.approx(3.5, abs=0.011)]}
    # verse 2 is read on into verse 3 at 5.0: with 50 ms of slop either way the cut cannot be clean
    assert verdicts(result)[2] == ['tail-extra', 'tail-clipped'] and verdicts(result)[3] == ['head-extra', 'head-clipped']
    assert result['announcement'] == 'CHAPTER ONE'


@pytest.mark.parametrize('ms', [50, 100, 250])
def test_planted_the_end_past_the_next_verses_first_sound(sound, ms):
    planted = [[1, 1.5, 3.5 + ms / 1000], CLEAN[1], CLEAN[2]]
    flag = judged(planted, sound)['verses'][0]['flags'][0]
    assert flag['kind'] == 'tail-extra' and flag['by'] == pytest.approx(ms / 1000 + 0.05, abs=0.011)
    assert flag['heard']['words'] == 'heard' and flag['heard']['letters'] == 'LETTERS'


@pytest.mark.parametrize('ms', [50, 100, 250])
def test_planted_the_start_before_the_end_of_the_verse_before(sound, ms):
    planted = [CLEAN[0], [2, 3.0 - ms / 1000, 5.0], CLEAN[2]]
    assert 'head-extra' in verdicts(judged(planted, sound))[2]
    announced = [[1, 1.0 - ms / 1000, 3.05], CLEAN[1], CLEAN[2]]  # the announcement is the sound before verse 1
    flags = judged(announced, sound)['verses'][0]['flags']
    assert kinds(flags) == ['head-extra'] and flags[0]['by'] == pytest.approx(ms / 1000 + 0.05, abs=0.011)


@pytest.mark.parametrize('ms', [100, 250])
def test_planted_the_end_before_its_own_last_sound(sound, ms):
    planted = [[1, 1.5, 3.0 - ms / 1000], CLEAN[1], CLEAN[2]]
    flags = judged(planted, sound)['verses'][0]['flags']
    assert kinds(flags) == ['tail-clipped'] and flags[0]['by'] == pytest.approx(ms / 1000 + 0.05, abs=0.011)


@pytest.mark.parametrize('ms', [100, 250])
def test_planted_the_start_after_its_own_first_sound(sound, ms):
    planted = [[1, 1.6 + ms / 1000, 3.05], CLEAN[1], CLEAN[2]]
    flags = judged(planted, sound)['verses'][0]['flags']
    assert kinds(flags) == ['head-clipped'] and flags[0]['by'] == pytest.approx(ms / 1000 + 0.05, abs=0.011)


def test_the_end_in_the_pause_inside_the_verse_loses_its_last_word(sound):
    flags = judged([[1, 1.5, 2.3], CLEAN[1], CLEAN[2]], sound)['verses'][0]['flags']
    # 2.25 to 3.0 is lost: 0.15 s of the pause, which is no sound, and the 0.6 s of 'BEGINNING'
    assert kinds(flags) == ['tail-clipped'] and flags[0]['by'] == pytest.approx(0.60, abs=0.011)
    assert flags[0]['heard']['lost'] == 'BEGINNING'


def test_a_click_before_the_first_word_with_silence_after_it_is_not_the_word_cut():
    # John 9:40: a faint click (four frames of the level are above the floor: 10 ms of sound), 50 ms of silence, then the word. A start at the click loses the
    # click at the player's latest, not the word.
    parts = [(0.5, -20), (0.5, None), (0.01, -50), (0.05, None), (0.6, -20), (0.3, None)]
    click = judge.sound_of(wave_of(parts))
    heard = say('ONE', 0.0, 0.5) + say('TWO', 1.06, 1.66)
    verses = [{'n': 1, 'words': ['one']}, {'n': 2, 'words': ['two']}]
    result = judge.judge_chapter(verses, [[1, 0.0, 0.55], [2, 1.0, 1.7]], click, heard, SLOP, FakeEars())
    assert result['verses'][1]['sound'][1] == pytest.approx(1.0, abs=0.011)  # the click is where its sound begins
    assert verdicts(result)[2] == []  # 1.0 to 1.05 lost at the latest start: the click, within the tolerance, and silence
    late = judge.judge_chapter(verses, [[1, 0.0, 0.55], [2, 1.06, 1.7]], click, heard, SLOP, FakeEars())
    assert verdicts(late)[2] == ['head-clipped']  # 1.06 to 1.11 is the word itself


def test_a_flag_names_what_was_heard_at_its_edge(sound):
    flag = judged([[1, 1.5, 3.75], CLEAN[1], CLEAN[2]], sound)['verses'][0]['flags'][0]  # 250 ms into verse 2
    assert flag['kind'] == 'tail-extra'
    assert flag['heard']['extra'].startswith('W')  # the letters of the next verse inside the clip
    assert isinstance(flag['level'], float) and flag['level'] > -10  # speech, not a dying tail


def test_the_words_ear_is_asked_only_where_the_cheap_ears_cannot_settle_it(sound):
    ears = FakeEars()
    result = judged([CLEAN[0], [2, 3.4, 4.6], [3, 5.4, 6.05]], sound, ears=ears)  # verses 2 and 3 cut far from the read-on: flagged, so heard
    assert verdicts(result)[1] == []
    # each flagged verse: the clip at its longest, then (a measured clipping) the clip at its shortest, which is what its flag reports
    assert ears.asked == [(3.35, 4.65), (3.45, 4.55), (5.35, 6.1), (5.45, 6.0)]


def test_a_weak_edge_is_settled_by_the_words_ear(sound):
    unheard = [h for h in heard_of() if not (1.6 <= h[1] < 2.2)]  # the letters did not hear 'IN THE'
    right = FakeEars({(1.45, 3.1): ['in', 'the', 'beginning']})
    assert verdicts(judged(CLEAN, sound, unheard, right))[1] == []
    wrong = FakeEars({(1.45, 3.1): ['beginning']})
    result = judged(CLEAN, sound, unheard, wrong)
    assert verdicts(result)[1] == ['head-clipped'] and result['verses'][0]['flags'][0]['heard']['words'] == 'beginning'


def test_a_middle_difference_both_ears_hear_is_text_differs_and_never_an_edge_flag(sound):
    heard = say('CHAPTER ONE', 0.2, 1.0) + say('IN THE', 1.6, 2.2) + say('MIDDLE', 2.4, 3.0) + say('WAS THE WORD', 3.5, 4.98) + say('AND GOD', 5.02, 6.0)
    both = FakeEars({(1.45, 3.1): ['in', 'the', 'middle']})
    result = judged(CLEAN, sound, heard, both)
    assert verdicts(result)[1] == ['text-differs']
    assert result['verses'][0]['flags'][0]['heard'] == {'expected': 'beginning', 'words': 'middle'}
    assert both.hints == ['in the beginning']  # it was heard a second time, told the verse's words, and still heard 'middle'
    # a hard word both ears stumble on, heard as written once the words ear is told the verse (John 19:39, 'myrrh'): not a difference
    stumbles = FakeEars({(1.45, 3.1): ['in', 'the', 'middle']}, told=['in', 'the', 'beginning'])
    assert verdicts(judged(CLEAN, sound, heard, stumbles))[1] == []
    # the letters misheard, the words ear heard the verse: not a difference
    only_letters = FakeEars({(1.45, 3.1): ['in', 'the', 'beginning']})
    assert verdicts(judged(CLEAN, sound, heard, only_letters))[1] == []
    # the words ear differs at a word the letters heard well: not a difference either
    elsewhere = FakeEars({(1.45, 3.1): ['on', 'the', 'beginning']})
    assert verdicts(judged(CLEAN, sound, heard, elsewhere))[1] == []


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# Planting: where a fault is put, from the maker's measure of each gap
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

def test_each_fault_is_planted_from_the_makers_measure_of_the_gaps():
    triples = [[1, 1.0, 5.05], [2, 5.3, 9.15], [3, 9.5, 12.0]]
    gaps = {1: (5.0, 5.4), 2: (9.1, 9.55)}  # verse -> (its last sound died, the next verse's first sound)
    assert judge.plant(triples, gaps, 2, 'tail-extra', 50) == [2, 5.3, 9.6]
    assert judge.plant(triples, gaps, 2, 'head-extra', 250) == [2, 4.75, 9.15]
    assert judge.plant(triples, gaps, 2, 'tail-clipped', 100) == [2, 5.3, 9.0]
    assert judge.plant(triples, gaps, 2, 'head-clipped', 100) == [2, 5.5, 9.15]
    assert judge.plant(triples, gaps, 1, 'head-extra', 50) is None  # no gap measured before verse 1
    assert judge.plant(triples, gaps, 3, 'tail-extra', 50) is None
    assert len(judge.PLANTS) == 10


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# The report: its shape, the hash of what was judged, the same bytes twice, a run taken up again
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------

TIMINGS = {'v': 1, 'edition': 'msb-david', 'book': 'tst', 'chapters': {
    '1': {'audio': 'https://example.org/1.mp3', 'duration': 6.4, 'verses': CLEAN},
    '2': {'audio': 'https://example.org/2.mp3', 'duration': 6.4, 'verses': [[1, 1.5, 3.55], [2, 3.4, 5.0], [3, 5.0, 6.05]]},
}}


def chapter_judge(sound, calls: list[int], fail_at: int | None = None):
    def judge_one(chapter: int, triples: list[list]) -> dict:
        if chapter == fail_at:
            raise KeyboardInterrupt
        calls.append(chapter)
        return judge.judge_chapter(VERSES, triples, sound, heard_of(), SLOP, FakeEars())
    return judge_one


def test_the_report_has_a_verdict_a_verse_the_hash_the_version_the_slops_and_a_summary(sound, tmp_path):
    raw = (json.dumps(TIMINGS, separators=(',', ':')) + '\n').encode()
    out = tmp_path / 'judged.json'
    judge.run_book('tst', raw, SLOP, chapter_judge(sound, []), out, tmp_path / 'work')
    report = json.loads(out.read_text(encoding='utf8'))
    assert report['timings']['sha256'] == hashlib.sha256(raw).hexdigest()
    assert report['judge'] == judge.JUDGE_VERSION and report['slop'] == SLOP and report['book'] == 'tst' and report['edition'] == 'msb-david'
    assert set(report['chapters']) == {'1', '2'}
    for chapter in report['chapters'].values():
        assert [v['n'] for v in chapter['verses']] == [1, 2, 3]
        for verse in chapter['verses']:
            assert verse['verdict'] in ('ok', 'flagged') and (verse['verdict'] == 'ok') == ('flags' not in verse)
            for flag in verse.get('flags', []):
                assert flag['kind'] in judge.KINDS and 'heard' in flag
    summary = report['summary']
    assert summary['verses'] == 6 and summary['ok'] + summary['flagged'] == 6
    assert set(summary['flags']) == set(judge.KINDS)
    assert summary['flags']['tail-extra'] == 3  # the read-on of each chapter, and chapter 2's verse 1 planted 50 ms past verse 2's onset
    assert summary['flags']['text-differs'] == 0
    assert out.read_bytes().endswith(b'\n')


def test_a_second_run_writes_the_same_bytes(sound, tmp_path):
    raw = json.dumps(TIMINGS).encode()
    first, second = tmp_path / 'a.json', tmp_path / 'b.json'
    judge.run_book('tst', raw, SLOP, chapter_judge(sound, []), first, tmp_path / 'work-a')
    judge.run_book('tst', raw, SLOP, chapter_judge(sound, []), second, tmp_path / 'work-b')
    assert first.read_bytes() == second.read_bytes()


def test_a_run_stopped_halfway_is_taken_up_without_judging_a_finished_chapter_again(sound, tmp_path):
    raw = json.dumps(TIMINGS).encode()
    out, whole = tmp_path / 'judged.json', tmp_path / 'whole.json'
    calls: list[int] = []
    with pytest.raises(KeyboardInterrupt):
        judge.run_book('tst', raw, SLOP, chapter_judge(sound, calls, fail_at=2), out, tmp_path / 'work')
    assert calls == [1] and not out.exists()  # no report of half a book
    judge.run_book('tst', raw, SLOP, chapter_judge(sound, calls), out, tmp_path / 'work')
    assert calls == [1, 2]  # chapter 1 was not judged again
    judge.run_book('tst', raw, SLOP, chapter_judge(sound, []), whole, tmp_path / 'work-whole')
    assert out.read_bytes() == whole.read_bytes()


def test_other_timings_or_another_slop_are_not_taken_up_from_the_old_run(sound, tmp_path):
    raw = json.dumps(TIMINGS).encode()
    calls: list[int] = []
    judge.run_book('tst', raw, SLOP, chapter_judge(sound, calls), tmp_path / 'a.json', tmp_path / 'work')
    judge.run_book('tst', raw + b' ', SLOP, chapter_judge(sound, calls), tmp_path / 'b.json', tmp_path / 'work')
    judge.run_book('tst', raw, {'lead': 0.1, 'tail': 0.05}, chapter_judge(sound, calls), tmp_path / 'c.json', tmp_path / 'work')
    assert calls == [1, 2, 1, 2, 1, 2]
