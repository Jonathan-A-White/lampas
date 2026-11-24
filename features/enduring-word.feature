@uc-logos-links @greek
Feature: Enduring Word, David Guzik's commentary on the web
  For whoever lacks David Guzik's Commentaries on the Bible (DGCB) in Logos (mw-1l901so.1). Enduring Word (https://enduringword.com) is a web commentary: Lampas links its chapter page and opens it
  in its own reader (which opens the browser when it cannot get the words), and holds none of its text. In the "In another book…" chooser it is one row, "Enduring Word (David Guzik)", under
  "Commentaries on <book>", only where his library holds no DGCB volume of the book. Without Logos (Logos Off, or no library) the Verse view has a "Commentary" door that opens the same page.
  The page opens at the outline section whose verse range holds the verse he started from (mw-1l901so.2): the page's headings carry ids section-1, section-2 ... and name their range ("6. (16) ..."),
  so John 3:16 opens at #section-6; a verse no range names opens the chapter's top. Lampas knows the outline of the chapters whose headings were read (John 3 so far).

  Scenario: Where his library holds the DGCB volume the chooser lists it and no Enduring Word row
    Given his library holds the DGCB volume "DGCB Is" and a commentary on John, all On
    When he opens the chooser at "Isaiah 1:1"
    Then "Commentaries on Isaiah" lists "DGCB Is"
    And the chooser has no row for "Enduring Word (David Guzik)"

  Scenario: Where his library holds no DGCB volume of the book the chooser lists Enduring Word
    Given his library holds the DGCB volume "DGCB Is" and a commentary on John, all On
    When he opens the chooser at "John 3:16"
    Then "Commentaries on John" lists "Commentary on John 1" and "Enduring Word (David Guzik)"

  Scenario: Its row opens the chapter's page in Lampas's reader, with its credit line
    Given his library holds the DGCB volume "DGCB Is" and a commentary on John, all On
    When he opens the chooser at "John 3:16"
    And he taps the row "Enduring Word (David Guzik)"
    Then the reader is headed "John 3 · Enduring Word"
    And the reader shows the credit "(c)1996-present The Enduring Word Bible Commentary by David Guzik - enduringword.com"
    And the page "https://enduringword.com/bible-commentary/john-3/#section-6" is opened on the web, as the reader cannot get its words

  Scenario: A verse no section's range holds opens the chapter's top
    Given his library holds the DGCB volume "DGCB Is" and a commentary on John, all On
    When he opens the chooser at "John 3:40"
    And he taps the row "Enduring Word (David Guzik)"
    Then the page "https://enduringword.com/bible-commentary/john-3/" is opened on the web, as the reader cannot get its words

  Scenario: With Logos Off the Verse view has the Commentary door
    Given Lampas is opened on John 3:16 with Logos Off
    Then the Verse view has the door "Commentary", which is the link "https://enduringword.com/bible-commentary/john-3/#section-6"
    When he taps the door "Commentary"
    Then the reader is headed "John 3 · Enduring Word"
    And the page "https://enduringword.com/bible-commentary/john-3/#section-6" is opened on the web, as the reader cannot get its words

  # By voice (mw-1l901so.3, PROVISIONAL, the Governor to confirm). In Hands-free the words "Enduring Word", "commentary" or "what does Guzik say" open the page of the passage he is on in the reader, at the
  # verse's section, and it reads it aloud, saying its credit line once at the start; "stop", "back", "forward" and "play" work as for a sermon. "read <place>", "next chapter" and "previous chapter" put the
  # commentary away and do what he asked; asking for the commentary again goes on where he stopped. The reader can read it only where the sermon index service serves its words (it serves none of this site's today,
  # so these scenarios stand a service that does in its place); where it does not, the page opens on the web and Hands-free says so.
  Scenario: In Hands-free on John 3:16 "Enduring Word" opens the John 3 page in the reader at section 6 and starts reading
    Given Lampas is opened on John 3:16 with Logos Off and a service that serves the words of John 3's commentary
    When he says "Enduring Word"
    Then the reader is headed "John 3 · Enduring Word"
    And the service was asked for the commentary "john-3"
    And the reader marks the paragraph "6. (16) Heading six" and is reading it
    And no page is opened on the web

  Scenario: "stop", then the reading, then "Enduring Word" again goes on at the paragraph where he stopped
    Given Lampas is opened on John 3:16 with Logos Off and a service that serves the words of John 3's commentary
    When he says "Enduring Word"
    And he then says "forward"
    Then the reader marks the paragraph "Words of section 6." and is reading it
    When he says "stop" to end it
    Then the reader marks the paragraph "Words of section 6." and is not reading
    When he next says "read John 3 16"
    Then the reader is put away
    And John 3 is being read from verse 16
    When he asks again "Enduring Word"
    Then the reader is headed "John 3 · Enduring Word"
    And the reader goes on at the paragraph "Words of section 6." and is reading it

  Scenario: The credit line is said once, at the start
    Given Lampas is opened on John 3:16 with Logos Off and a service that serves the words of John 3's commentary
    When he says "what does Guzik say"
    Then the first thing the phone says is the credit "(c)1996-present The Enduring Word Bible Commentary by David Guzik - enduringword.com"
    When he then says "forward"
    And he next says "back"
    And he says "restart" once more
    Then the phone has said the credit once

  Scenario: Where the service serves no words the page opens on the web and he is told
    Given Lampas is opened on John 3:16 with Logos Off and a service that serves no words of the commentary
    When he says "commentary"
    Then the page "https://enduringword.com/bible-commentary/john-3/#section-6" is opened on the web, as the reader cannot get its words
    And Hands-free says "Lampas could not get the words of this commentary, so it opens on the web."
