@uc-logos-links @greek
Feature: Enduring Word, David Guzik's commentary on the web
  For whoever lacks David Guzik's Commentaries on the Bible (DGCB) in Logos (mw-1l901so.1). Enduring Word (https://enduringword.com) is a web commentary: Lampas links its chapter page and opens it
  in its own reader (which opens the browser when it cannot get the words), and holds none of its text. In the "In another book…" chooser it is one row, "Enduring Word (David Guzik)", under
  "Commentaries on <book>", only where his library holds no DGCB volume of the book. Without Logos (Logos Off, or no library) the Verse view has a "Commentary" door that opens the same page.

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
    And the page "https://enduringword.com/bible-commentary/john-3/" is opened on the web, as the reader cannot get its words

  Scenario: With Logos Off the Verse view has the Commentary door
    Given Lampas is opened on John 3:16 with Logos Off
    Then the Verse view has the door "Commentary", which is the link "https://enduringword.com/bible-commentary/john-3/"
    When he taps the door "Commentary"
    Then the reader is headed "John 3 · Enduring Word"
    And the page "https://enduringword.com/bible-commentary/john-3/" is opened on the web, as the reader cannot get its words
