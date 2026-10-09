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

  Scenario: A learning word stands in Greek with its English beneath
    Given Lampas is opened with nothing saved
    When he sets Weave to Solid and learning words
    Then verse 18 shows the Greek of "δόξα" in place of "glory" with the English "glory" beneath it as a hint
    And the solid woven words of verse 1 have no hint
    And the count line counts the learning word too

  Scenario: Solid words alone leave a learning word in English
    Given Lampas is opened with nothing saved
    When he sets Weave to Solid words
    Then "glory" in verse 18 is English

  Scenario: When it turns solid the English hint goes
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid and learning words
    When he answers the word "δόξα" right twice in the Quick test
    Then verse 18 shows the Greek of "δόξα" in place of "glory" with no hint beneath it

  Scenario: The Weave setting offers Off, Solid, Solid and learning
    Given Lampas is opened with nothing saved
    When he opens Settings
    Then the Weave setting offers "Off", "Solid" and "+ Learning"
    And the Weave setting allows the values "off", "solid" and "solid+learning"

  Scenario: Settings > Weave has a Words row and a Grammar row
    Given Lampas is opened with nothing saved
    When he opens Settings
    Then the Words row is labelled "Words" and offers "Off", "Solid" and "+ Learning"
    When he turns the Weave on in Settings
    Then the Grammar row is labelled "Grammar" and offers "Any", "Solid" and "+ Frontier"
    And the Grammar setting allows the values "any", "solid" and "solid+frontier"
    And the Grammar row is set to "Any"

  Scenario: Solid words with Solid grammar leaves only the chunks whose forms are solid in Greek
    Given Lampas is opened with nothing saved
    And every grammar idea is solid except the dative case, which is not yet
    When he sets Weave to Solid words
    And he sets the Weave grammar to Solid
    Then the Greek "ἐν" is woven in verse 1
    And "Christ" in verse 1 is English
    And "Jesus," in verse 1 is also English

  Scenario: Frontier grammar brings back the chunks whose grammar is at the frontier
    Given Lampas is opened with nothing saved
    And every grammar idea is solid except the dative case, which is at the frontier
    And he sets Weave to Solid words
    And he sets the Weave grammar to Solid
    And "Christ" in verse 1 is English
    When he sets the Weave grammar to + Frontier
    Then the Greek "Χριστός" is woven in verse 1
    And the Greek "Ἰησοῦς" is also woven in verse 1

  Scenario: Grammar Any weaves as before
    Given Lampas is opened with nothing saved
    And no grammar idea has a level
    When he sets Weave to Solid words
    Then the Weave grammar is Any
    And the Greek "Χριστός" is woven in verse 1
    And every woven chunk of verse 1 is a chunk whose Greek words are all solid

  Scenario: The four combinations are each one tap
    Given Lampas is opened with nothing saved
    When he opens Settings
    Then each of Solid words, + Learning words, with Solid grammar, + Frontier grammar is set by one tap on each row

