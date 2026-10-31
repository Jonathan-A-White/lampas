@uc-pronunciation @greek
Feature: The Greek voice and the respelling say the same sounds
  The word sheet shows how to say a word (the respelling) and its speaker hands the word to the phone's Greek voice. They must
  agree. A Modern Greek voice drops the n of ντ inside a word (Πάντοτε heard as 'PA-do-te') while the respelling, and the
  lessons, keep it ('PAN-do-te'); so the scheme hands the voice a form that keeps the nasal: the nasal ends the first part and
  the pair opens the next as at a word's start ('πάν-ντοτε'), the same for μπ and γκ. A word that begins with the pair is
  handed over as it is. χ is respelt KH before α, ο, ω, ου or a consonant and HY before ε, ι, η, υ, αι, ει or οι (χαίρετε is HYE-re-te).

  Scenario: The speaker on Πάντοτε hands the Greek voice the n the respelling shows
    Given Lampas is opened on 1 Thessalonians 5 in Greek, on a phone with a Greek voice
    When he taps the Greek word "Πάντοτε" in verse 16
    Then the word sheet shows the respelling "PAN-do-te"
    When he taps the word sheet's speaker
    Then the phone is told to speak "πάν-ντοτε" with lang "el-GR" in its Greek voice

  Scenario: χαίρετε is respelt with the soft χ of e and i
    Given Lampas is opened on 1 Thessalonians 5 in Greek, on a phone with a Greek voice
    When he taps the Greek word "χαίρετε" in verse 16
    Then the word sheet shows the respelling "HYE-re-te"
