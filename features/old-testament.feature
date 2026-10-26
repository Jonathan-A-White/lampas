Feature: Lampas reads the Old Testament in English
  The Reader's chapter picker lists the 66 books of the Bible in canon order, Genesis to Revelation. An Old Testament chapter opens in the Reader like any
  other, but it is read in English only (its words are Hebrew, which Lampas does not teach): the English | Greek switch and the weave's controls are not
  drawn, and the view he has saved is not changed, so the next New Testament chapter keeps it. Every other setting applies. A tap on an English chunk
  opens the English word sheet (the chunk, and a Webster's 1828 row in Logos for each of its words); Listen and Read from the top read the English;
  the chapter before Matthew 1 is Malachi 4 and Genesis 1 has no chapter before it. At the foot of the chapter, Read in Logos opens it in the Bible he
  chose in Settings (Bible in Logos, the Legacy Standard Bible to start; Settings > Bible in Logos opens Library > Bibles, where it is chosen), by the
  Logos app's own link, and Listen in Audible opens The Word of Promise at the chapter, each only while its setting is on. Jonah 1 is the copy of the
  built chapter in tests/fixtures/data/jon/1.json (scripts/fixture-chapter.mjs).

  Scenario: The picker lists the 66 books and opens Jonah 1 in the Reader
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the title
    Then the picker lists the 66 books from "Genesis" to "Revelation" in order, "Malachi" before "Matthew"
    When he chooses the book "Jonah"
    Then the picker lists chapters 1 to 4
    When he picks chapter 1
    Then the reader is headed "Jonah 1"
    And the picker is closed

  Scenario: The English shows with its verse numbers and headings
    Given Lampas is opened on Jonah 1 with Logos on
    Then the reader shows verses 1 to 17 with their numbers
    And verse 1 reads "Now the word of the LORD came to Jonah son of Amittai, saying,"
    And the heading "Jonah Flees from the LORD" stands before verse 1

  Scenario: The English | Greek switch and the weave are not there, and his saved view is not changed
    Given Lampas is opened on Jonah 1 with the Greek view and the Weave on Solid words saved
    Then the reader is in the English view with the Weave off
    And there is no English | Greek switch
    And there are no woven words and no count of words in Greek
    And the saved view is still "greek" and the saved Weave is still "solid"
    When he opens Matthew 1 from the picker
    Then the reader is in the "greek" view
    And the English | Greek switch is there

  Scenario: His other settings apply to an Old Testament chapter
    Given Lampas is opened on Jonah 1 with Theme Dark, Text size Largest and Turn pages
    Then the page is dark
    And the page text is at 160% of the phone's size
    And the reader turns pages

  Scenario: A tap on "fish" opens the English word sheet with a Webster's row for it
    Given Lampas is opened on Jonah 1 with Logos on
    When he taps the chunk "fish" of verse 17
    Then the English word sheet opens headed "fish"
    And it has one "Look it up in Logos" link to "fish" in Webster's 1828
    And the Greek word sheet is not opened

  Scenario: A chunk of two words lists two rows
    Given Lampas is opened on Jonah 1 with Logos on
    When he taps the chunk "of Amittai," of verse 1
    Then the English word sheet opens headed "of Amittai"
    And it lists the words "of" and "Amittai", each with its Listen
    And it has the links "Look it up in Logos: of" and "Look it up in Logos: amittai"

  Scenario: With Logos off the English word sheet offers to turn it on
    Given Lampas is opened on Jonah 1 with Logos off
    When he taps the chunk "fish" of verse 17
    Then the English word sheet opens headed "fish"
    And it says "Turn on Logos to look words up"

  Scenario: A long press on a chunk says it in English
    Given Lampas is opened on Jonah 1 on a phone with an English, a Greek and a Hebrew voice
    When he long presses the chunk "fish" of verse 17
    Then the phone says "fish" in "en-US"
    And no English word sheet opens

  Scenario: Read from the top reads the English in an English voice and never asks for the Greek one
    Given Lampas is opened on Jonah 1 on a phone with an English, a Greek and a Hebrew voice
    When he taps Read from the top
    Then the phone speaks the English of verse 1 in "en-US"
    And verse 1 is highlighted as being read
    And the speaking bar shows Pause, Restart and Stop
    When the phone finishes speaking verse 1
    Then the phone goes on to the English of verse 2 in "en-US"
    And every voice asked for so far is English

  Scenario: Pause keeps the verse and Resume goes on from it
    Given Lampas is opened on Jonah 1 on a phone with an English, a Greek and a Hebrew voice
    And he taps Read from the top
    And the phone finishes speaking verse 1
    When he taps Pause on the speaking bar
    Then the speaking bar shows Resume, Restart and Stop
    When he taps Resume on the speaking bar
    Then the phone speaks the English of verse 2 in "en-US"
    And the speaking bar shows Pause, Restart and Stop

  Scenario: A word he has the phone say pauses the reading and Resume goes on from it
    Given Lampas is opened on Jonah 1 on a phone with an English, a Greek and a Hebrew voice
    And he taps Read from the top
    And the phone finishes speaking verse 1
    When he taps the chunk "fish" of verse 17
    And he taps Listen on the English word sheet
    Then the reading is paused
    And the phone is saying "fish" alone
    When the phone finishes the word
    Then the speaking bar shows Resume, Restart and Stop
    When he taps Resume on the speaking bar
    Then the reading goes on from verse 2
    And the speaking bar shows Pause, Restart and Stop

  Scenario: Malachi 4 is followed by Matthew 1, and Matthew 1 is preceded by Malachi 4
    Given Lampas is opened on Malachi 4 with Logos on
    Then the foot of the chapter has a button "‹ Malachi 3" and a button "Matthew 1 ›"
    When he taps "Matthew 1 ›"
    Then the reader is headed "Matthew 1"
    And the foot of the chapter has a button "‹ Malachi 4"

  Scenario: Genesis 1 has no chapter before it
    Given Lampas is opened on Genesis 1 with Logos on
    Then the foot of the chapter has a button "Genesis 2 ›" and no button before it

  Scenario: Read in Logos is at the foot of an opened chapter in his default Bible and the chapter stays open
    Given Lampas is opened on Jonah 1 with Logos on
    Then "Read in Logos" is at the foot of the chapter with the link "logosres:lgcystndrdbblsb;ref=Bible.Jon1"
    When he taps "Read in Logos"
    Then Logos is asked for "logosres:lgcystndrdbblsb;ref=Bible.Jon1"
    And the reader is headed "Jonah 1"

  Scenario: The https address is the fallback only when the phone cannot open the app
    Given Lampas is opened on Psalms 23 with Logos on
    When he taps "Read in Logos"
    And the page stays in front for the wait
    Then the address "https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Ps23" was opened

  Scenario: The Bible he chose in Settings is the one that opens
    Given Lampas is opened on Malachi 4 with Logos on and the Bible in Logos "LLS:NASB95"
    When he taps "Read in Logos"
    Then Logos is asked for "logosres:nasb95;ref=Bible.Mal4"

  Scenario: With Logos on and the Audio Bible on the chapter offers both, and Listen in Audible names the chapter to pick
    Given Lampas is opened on Judges 3 with Logos on and the Audio Bible on
    Then the foot of Judges 3 offers "Read in Logos" and "Listen in Audible"
    And the foot says "In Audible: Chapters > Judges 3"
    And "Read in Logos" is the chapter's Logos link
    And "Listen in Audible" is Audible's link at the start of Judges 3

  Scenario: With only Logos on the foot offers the one action
    Given Lampas is opened on Judges 3 with Logos on and the Audio Bible off
    Then the foot of Judges 3 offers only "Read in Logos"

  Scenario: With only the Audio Bible on the foot offers the one action
    Given Lampas is opened on Judges 3 with Logos off and the Audio Bible on
    Then the foot of Judges 3 offers only "Listen in Audible"

  Scenario: With both off the foot offers neither
    Given Lampas is opened on Judges 3 with Logos off and the Audio Bible off
    Then the foot of Judges 3 offers nothing outside Lampas

  Scenario: A New Testament chapter has no Read in Logos at its foot
    Given Lampas is opened on Romans 8 with Logos on
    Then there is no "Read in Logos" at the foot of the chapter

  Scenario: Settings has Bible in Logos, the Legacy Standard Bible to start, and it opens Library > Bibles
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the gear in the reader's header
    Then the Bible in Logos row says "Bible in Logos: LSB"
    When he opens the Bible in Logos row
    Then the Bibles page says "Old Testament chapters open in LSB."
    And the Resource ID field holds "LLS:LGCYSTNDRDBBLSB"

  Scenario: A Bible chosen on the Bibles page is kept across a close
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the gear in the reader's header
    And he opens the Bible in Logos row
    And he chooses the Bible "ESV" on the Bibles page
    And the app is closed and opened again
    Then the Bibles page says "Old Testament chapters open in ESV."

  Scenario: A typed Resource ID is kept across a close, and a malformed one is not
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the gear in the reader's header
    And he opens the Bible in Logos row
    And he types the Resource ID "esv"
    Then the Resource ID field says "That is not a Resource ID. It looks like LLS:LGCYSTNDRDBBLSB."
    And the setting "logosBible" holds nothing
    When he types the Resource ID "LLS:1.0.9991"
    And the app is closed and opened again
    Then the Bibles page says "Old Testament chapters open in LLS:1.0.9991."
    And the Resource ID field holds "LLS:1.0.9991"
