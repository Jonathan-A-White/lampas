Feature: I memorize a verse in Hebrew
  An Old Testament verse is learned in English, and in Hebrew once my Hebrew setting reaches Curious; the Weave joins at Dipping a toe. Only my Hebrew setting counts for an Old Testament verse,
  and Hebrew is never offered on a New Testament one. In the session the Hebrew verse is drawn right to left with its words taken away bit by bit; what I say in Hebrew is checked in Hebrew
  (the points do not count, the consonants do), and I can type it only once I have told Lampas that my phone has a Hebrew keyboard.

  Scenario: Jonah 1:1 offers Hebrew at Hebrew Curious
    Given my Hebrew setting is step 1 and my Greek setting is step 0 and I have a list "Jonah" holding "Jonah.1.1"
    When I tap Memorize on the row
    And I open the row's languages
    Then the sheet offers English and Hebrew
    When I switch Hebrew on in the sheet
    Then Jonah 1:1 is memorized in English and Hebrew

  Scenario: The Weave joins at Hebrew Dipping a toe
    Given my Hebrew setting is step 2 and my Greek setting is step 0 and I have a list "Jonah" holding "Jonah.1.1"
    When I tap Memorize on the row
    And I open the row's languages
    Then the sheet offers English, Hebrew and Weave

  Scenario: With Greek only an Old Testament verse offers English at most
    Given my Hebrew setting is step 0 and my Greek setting is step 5 and I have a list "Jonah" holding "Jonah.1.1"
    When I tap Memorize on the row
    Then the row reads "Memorizing · English"
    When I open the row's languages
    Then no sheet opens

  Scenario: A Greek verse is still learned by the Greek setting
    Given my Hebrew setting is step 5 and my Greek setting is step 1 and I have a list "Refuge" holding "Rom.8.28"
    When I tap Memorize on the row
    And I open the row's languages
    Then the sheet offers English and Greek

  Scenario: The session hides the Hebrew words, right to left
    Given Jonah 1:1 is at step 2 in Hebrew
    When I open its Memorize session
    Then the session says "Hebrew · Half the words gone · step 3 of 7"
    And the verse is drawn right to left in Hebrew with 4 of its 8 words blank

  Scenario: What I say in Hebrew is judged in Hebrew
    Given Jonah 1:1 is at step 2 in Hebrew
    When I open its Memorize session
    And I hold the bar and say the verse in Hebrew without points and without its fourth word
    Then the phone was asked to hear he-IL
    And the session says "Not yet: 1 word missed"
    And the fourth word is marked
    And the recall is kept in Hebrew as said

  Scenario: What I say right passes
    Given Jonah 1:1 is at step 2 in Hebrew
    When I open its Memorize session
    And I hold the bar and say the whole verse in Hebrew without points
    Then the session says "Got it: 8 of 8 words"

  Scenario: Type it appears only with the Hebrew keyboard On
    Given Jonah 1:1 is at step 2 in Hebrew
    When I open its Memorize session
    Then the session says "Turn on Hebrew keyboard in Settings to type Hebrew"
    And there is no way to type
    When I turn on Hebrew keyboard in Settings
    And I tap "Type it"
    Then the box is for Hebrew, right to left
    When I type the whole verse in Hebrew without points
    And I check what I typed
    And the session says "Got it: 8 of 8 words"
    And the recall is kept in Hebrew as typed
