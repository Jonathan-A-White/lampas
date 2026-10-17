Feature: A free reader is told once, gently, what a licence adds
  Lampas is complete without a licence. On a reader's third visit (an open of the app on a different day) a phone with no licence shows one quiet line
  at the foot of the Reader: what a licence adds, a Learn more that opens the Licence page and a close. Closing it or tapping Learn more is the end of
  it: it never shows again. A phone with a licence never sees it, and neither does the first open, which includes the first open of a shared link.
  Every "Needs a licence" in Settings opens the same Licence page, and Back returns to where he was.

  Scenario: The first visit shows no tip
    Given this phone has no licence and Lampas is opened on its visit number 1
    Then no licence tip is shown

  Scenario: The second visit shows no tip
    Given this phone has no licence and Lampas is opened on its visit number 2
    Then no licence tip is shown

  Scenario: The third visit shows the tip once, with its words and a close
    Given this phone has no licence and Lampas is opened on its visit number 3
    Then the licence tip says "Lampas is free to read. A licence adds a tutor you can ask about any word or verse, and one that listens to you read a verse aloud."
    And the licence tip does not call it "Read it aloud", which is the free ▶ to a reader who has never seen the Verse view's check
    And the licence tip has Learn more and a close

  Scenario: Closing the tip ends it
    Given this phone has no licence and Lampas is opened on its visit number 3
    When he closes the licence tip
    Then no licence tip is shown
    When Lampas is opened again on a later day
    Then the licence tip stays gone

  Scenario: Learn more opens the Licence page and ends the tip
    Given this phone has no licence and Lampas is opened on its visit number 3
    When he taps Learn more on the licence tip
    Then the Licence page is open
    When Lampas is opened again on a later day
    Then the licence tip stays gone

  Scenario: Learn more opens the Licence page and Back returns to the Reader where he was
    Given this phone has no licence and Lampas is opened on its visit number 3 in Greek
    When he taps Learn more on the licence tip
    Then the Licence page is open
    When he presses the phone's Back
    Then the Reader is open in Greek

  Scenario: The Licence page has its own way back to the Reader
    Given this phone has no licence and Lampas is opened on its visit number 3 in Greek
    When he taps Learn more on the licence tip
    And he taps the Licence page's back button "‹ Reader"
    Then the Reader is open in Greek

  Scenario: A tap on the tip in its first moment does nothing, and one after it opens the Licence page
    Given this phone has no licence and Lampas is opened on its visit number 3 with the licence check still out
    Then no licence tip is shown
    When the licence check answers that this phone has no licence
    Then the licence tip is shown
    When he taps Learn more on the licence tip within 500 ms of it appearing
    Then the licence tip is still shown and the Licence page is not open
    When he taps Learn more on the licence tip after it has settled
    Then the Licence page is open

  Scenario: A phone with a licence never sees the tip
    Given this phone has a licence and Lampas is opened on its visit number 3
    Then no licence tip is shown

  Scenario: The first open of a shared verse link shows no tip
    Given this phone has no licence and the shared link "#/?ref=Rom.8.28" is opened on its visit number 1
    Then no licence tip is shown

  Scenario: A Settings row's Needs a licence opens the Licence page and Back returns to Settings
    Given this phone has no licence and Settings is open
    When he taps "Needs a licence" under "Tips"
    Then the Licence page is open
    When he presses the phone's Back
    Then Settings is open with "Tips" showing "Needs a licence"

  Scenario: The Licence page says how to get a licence, with Copy beside the key
    Given this phone has no licence and the Licence page is open
    Then the Licence page says in one line how to get a licence
    And the Licence page has Copy beside the key
