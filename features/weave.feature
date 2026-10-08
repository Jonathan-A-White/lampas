Feature: The diglot weave
  In the English view, a Weave switch swaps the English words he already knows for the Greek word as it
  stands in the verse. A chunk is woven only when every Greek word behind it is one of his solid words;
  the rest stays English. The Greek view is untouched.

  Scenario: With the seed, verse 1 in English shows ἐν Χριστῷ Ἰησοῦ in Greek and the rest in English
    Given Lampas is opened with nothing saved
    When he sets Weave to Solid words
    Then verse 1 shows the Greek of the lemmas "ἐν", "Χριστός" and "Ἰησοῦς" in place of "in", "Christ" and "Jesus,"
    And "Therefore" in verse 1 is still English
    And every woven chunk of verse 1 is a chunk whose Greek words are all solid

  Scenario: A word set to dropped on the Words screen leaves the weave on return
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    When he drops the word "Χριστός" on the Words screen
    And he returns to the reader
    Then "Christ" in verse 1 is English again
    And the Greek "ἐν" is still woven in verse 1

  Scenario: Tapping a woven word shows its sheet
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    When he taps the woven word for the lemma "Χριστός" in verse 1
    Then the word sheet shows the Greek word of that lemma as it stands in verse 1
    And the word sheet shows the lemma "Χριστός"
    And the word sheet shows the English "Christ"

  Scenario: Weave Off restores plain English
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    When he sets Weave to Off
    Then verse 1 reads as the data's English chunks read
    And no woven word is shown

  Scenario: The woven count line matches the number of woven chunks
    Given Lampas is opened with nothing saved
    When he sets Weave to Solid words
    Then the count line under the header reads as many words as there are woven chunks
    When he sets Weave to Off
    Then there is no count line

  Scenario: The Greek view is not changed by the weave
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    When he switches to Greek
    Then the Greek view shows the Greek words of verse 1 and no Weave switch

  Scenario: The Weave switch is remembered after reload
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    When he reopens Lampas
    Then Weave is set to Solid words
