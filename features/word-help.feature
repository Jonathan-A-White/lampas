Feature: Word help
  The word sheet of a Greek word has a Help with this word row, Grammar and Sound it out. Each opens the Talk sheet on the
  verse the word stands in, with a first turn already sent: the question names the word as it stands, its lemma, its parsing
  and the reference, and the bible-talk grind (grinds/bible-talk.json) gets a focus {form, lemma, parse, kind} with it.
  Sound it out also says the word in Greek, slowly, before the answer, and each syllable the answer lists after it. These
  scenarios run against a fake Postern whose mill opens the grist and answers it (tests/support/fake-postern.ts).

  Scenario: Grammar on the word sheet of a verb in 8:28 opens the Talk sheet and sends a bible-talk grist whose input carries a grammar focus and the verse
    Given Lampas is opened on Romans 8 with word help behind a fake Postern
    And he taps "work together" in verse 28
    Then the word sheet shows a Help with this word row with Grammar and Sound it out
    When he taps Grammar on the word sheet
    Then the word sheet is gone and the sheet is titled "Talk about Romans 8:28"
    And the mill received 1 grist for the lampas app, kind bible-talk
    And the grist carries the focus form "συνεργεῖ", lemma "συνεργέω", parse "verb, present active indicative, 3rd person singular" and kind grammar
    And the grist carries the reference "Romans 8:28" and the Greek and the English of verse 28
    And the grist question names the word, its lemma, its parsing and the reference and asks to explain the grammar
    And a word-help event for grammar on "συνεργεῖ" in verse 28 was published

  Scenario: Sound it out sends kind sound, and the word is spoken in Greek before the answer and once per syllable after it
    Given Lampas is opened on Romans 8 with word help behind a fake Postern that holds its answers and a phone that speaks Greek
    And he taps "work together" in verse 28
    When he taps Sound it out on the word sheet
    Then the mill received 1 grist for the lampas app, kind bible-talk
    And the grist carries the focus form "συνεργεῖ", lemma "συνεργέω", parse "verb, present active indicative, 3rd person singular" and kind sound
    And the grist question asks to pronounce the word, its syllables and how each sounds
    And the word "συνεργεῖ" was spoken in Greek, slowly, before any answer
    When the tutor answers
    Then the Greek syllables "συν", "ερ" and "γεῖ" are spoken one after another in Greek, slowly

  Scenario: The answer shows in the Talk sheet and the conversation continues by text
    Given Lampas is opened on Romans 8 with word help behind a fake Postern
    And he taps "work together" in verse 28
    And he taps Grammar on the word sheet
    Then the answer shows in the Talk sheet under the question about the word
    When he sends "What does the subject do?"
    Then the mill received 2 grists for the lampas app, kind bible-talk
    And the second grist carries no focus and the first turn as the earlier turn

  Scenario: An unreachable backend shows Could not reach with Retry
    Given Lampas is opened on Romans 8 with word help behind a fake Postern that cannot be reached
    And he taps "work together" in verse 28
    When he taps Grammar on the word sheet
    Then the sheet says "Could not reach the tutor" with a Retry button
    When the backend comes back and he taps Retry
    Then the answer shows in the Talk sheet under the question about the word
    And the retried grist carries the same grammar focus
