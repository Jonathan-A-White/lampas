Feature: A page of prose can be read aloud and shared
  About, My study way and the Preface are pages of prose. Each has two round buttons in its header: Read aloud, which reads
  the page top to bottom with the line being read marked and the speaking bar (Pause, Resume, Restart, Stop), and Share, which
  hands the page's own link to the phone's share sheet or, where there is none, copies it.

  Scenario: Read aloud speaks the first paragraph first and shows the speaking bar
    Given Lampas is opened on the About page on a phone with an English and a Greek voice
    When he taps "Read aloud" in the header
    Then the phone speaks the first paragraph of the page first, in "en-US"
    And the speaking bar shows Pause, Restart and Stop
    And the line being read is marked

  Scenario: Pause and Resume go on from the same sentence
    Given Lampas is opened on the About page on a phone with an English and a Greek voice
    And he taps "Read aloud" in the header
    And the phone finishes the first line
    When he taps "Pause" on the speaking bar
    And he taps "Resume" on the speaking bar
    Then the phone speaks the second line again
    And the first line was not spoken again

  Scenario: The reading moves on and the mark follows it
    Given Lampas is opened on the About page on a phone with an English and a Greek voice
    And he taps "Read aloud" in the header
    When the phone finishes the first line
    Then the second line is the one marked

  Scenario: Leaving the page stops the reading
    Given Lampas is opened on the About page on a phone with an English and a Greek voice
    And he taps "Read aloud" in the header
    When he taps "‹ Reader"
    Then nothing is being spoken
    And there is no speaking bar

  Scenario: Share hands the page's link to the phone
    Given Lampas is opened on the About page on a phone that can share
    When he taps "Share" in the header
    Then the phone is asked to share the title "About", the first paragraph and the link "https://lampas.allmymind.org/#/about"

  Scenario: With no share sheet the link is copied
    Given Lampas is opened on the About page on a phone that cannot share
    When he taps "Share" in the header
    Then the clipboard holds "https://lampas.allmymind.org/#/about"
    And the page says "Link copied"

  Scenario Outline: Every page of prose has both buttons
    Given Lampas is opened on the <page> page on a phone with an English and a Greek voice
    Then the header has a "Read aloud" button and a "Share" button

    Examples:
      | page         |
      | About        |
      | My study way |
      | Preface      |

  Scenario: Study way shares its own link
    Given Lampas is opened on the My study way page on a phone that can share
    When he taps "Share" in the header
    Then the phone is asked to share the title "My study way", the first paragraph and the link "https://lampas.allmymind.org/#/studyway"

  Scenario: Read aloud on Robinson's essay does not read the footnote numbers
    Given Lampas is opened on Robinson's essay on a phone with an English and a Greek voice
    When he taps "Read aloud" in the header
    And the phone speaks the whole essay
    Then no sentence the phone speaks has a footnote number in it
    And the phone speaks "as reflected in MSS A/02 and W/032." as the end of a sentence
    And the phone speaks "in any manner. Rather, the Byzantine Textform" as one sentence
    And the phone speaks "least interesting” in terms of theory" with the quotation whole

  Scenario: A quotation's credit is not run into its text
    Given Lampas is opened on Robinson's essay on a phone with an English and a Greek voice
    When he taps "Read aloud" in the header
    And the phone speaks the whole essay
    Then the phone speaks "not really much of a change. Bob Waltz (Internet email)" as one sentence
    And the phone never speaks a full stop glued to the word after it
