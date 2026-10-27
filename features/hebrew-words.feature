Feature: Hebrew words taught while he reads
  An Old Testament chapter teaches Hebrew words the way a New Testament chapter teaches Greek ones (docs/frontier.md 'Hebrew words'). On Genesis 1 with the Hebrew dial at Learning
  the New words chip counts the next Hebrew lemmas of the chapter by the same rule as the Greek, from the Hebrew word counts, never his Greek words; the teach sheet draws the word
  large, right to left, with its respelling and Hear it in the Hebrew voice; Got it puts it in Words as a Hebrew word. Words and Review have a Greek | Hebrew segment where both
  languages are chosen; the Quick test, Review and the Parsing drill ask a Hebrew word in Hebrew, among Hebrew words. The pace, New words a day, is one setting for both languages.

  Scenario: Genesis 1 at Hebrew Learning with 3 new words a day shows the chip and the teach sheet of the first word
    Given Lampas is opened on Genesis 1 with Hebrew chosen at Learning and 3 new words a day
    Then the chip under the Reader's header reads "New 3"
    When he taps New words
    Then the teach sheet shows "אֵת" large in Hebrew, right to left, with its respelling, its meaning "[Obj.]" and Hear it
    And the teach sheet shows verse 1 with "אֵת" in Hebrew and its English in small grey beneath it

  Scenario: Hear it on the teach sheet says the word in the Hebrew voice
    Given Lampas is opened on Genesis 1 with Hebrew chosen at Learning and 3 new words a day on a phone with a Hebrew voice
    When he taps New words
    And he taps Hear it on the teach sheet
    Then the phone says "אֵת" in "he-IL"

  Scenario: Got it puts the word in Words under Hebrew and the next one is offered
    Given Lampas is opened on Genesis 1 with Hebrew chosen at Learning and 3 new words a day
    When he taps New words
    And he taps Got it
    Then "אֵת" is a learning Hebrew word from his reading, scheduled at step 0 and due now
    And the teach sheet now shows "עַל"
    When he opens Words
    Then Words lists "אֵת" in Hebrew, right to left

  Scenario: Words has a Greek | Hebrew segment where both languages are chosen
    Given Lampas is opened on Genesis 1 with both languages chosen and a Greek and a Hebrew word he is learning
    When he opens Words
    Then Words has the language segment with Greek pressed and lists "λόγος" and not "אֵת"
    When he taps Hebrew on the segment
    Then Words lists "אֵת" and not "λόγος"

  Scenario: A Quick test asks the Hebrew word among Hebrew words
    Given Lampas is opened on Genesis 1 with Hebrew chosen at Learning and 3 new words a day on a phone with a Hebrew voice
    And he has taken "אֵת" on the teach sheet with Got it
    When he opens the Quick test
    Then the Quick test asks "אֵת" large in Hebrew, right to left, among four glosses of Hebrew words
    When he picks "[Obj.]"
    Then the answer is right and the phone says "אֵת" in "he-IL"

  Scenario: Review lists the Hebrew word due and asks it in Hebrew
    Given Lampas is opened on Genesis 1 with Hebrew chosen at Learning and 3 new words a day
    And he has taken "אֵת" on the teach sheet with Got it
    When he opens Review
    Then Review says "Due today: 1 word"
    When he starts the round
    Then Review asks "אֵת" in Hebrew, right to left

  Scenario: Review has the Greek | Hebrew segment where both languages are chosen
    Given Lampas is opened on Genesis 1 with both languages chosen and a Greek and a Hebrew word he is learning
    When he opens Review
    Then Review says "Due today: 2 words" and has the language segment
    When he taps Hebrew on the segment
    And he starts the round
    Then Review asks "אֵת" in Hebrew, right to left

  Scenario: The Parsing drill on a Hebrew word asks its terms with the verse in Hebrew
    Given Lampas is opened on Genesis 1 with Hebrew chosen at Learning and a Hebrew verb he is learning
    When he opens the Parsing drill
    Then the Parsing drill shows the verse in Hebrew, right to left, with a form of "בָּרָא" marked
    And its first step is "Part of speech" and the next is "Stem"

  Scenario: Greek only offers no Hebrew new words on Genesis 1
    Given Lampas is opened on Genesis 1 with Greek chosen alone and 3 new words a day
    Then the Reader shows no New words chip

  Scenario: At English only there is no chip on Genesis 1
    Given Lampas is opened on Genesis 1 with English only and 3 new words a day
    Then the Reader shows no New words chip

  Scenario: A Greek chapter still teaches Greek words with both languages chosen
    Given Lampas is opened on Romans 8 with both languages chosen at Learning, 3 new words a day and no Hebrew words
    Then the chip under the Reader's header reads "New 3"
    When he taps New words
    Then the teach sheet shows "καί" large in Greek with its respelling and Hear it, and takes the word as a Greek one with Got it
