Feature: Lampas takes links in
  A verse or a word can be named in a link, the way Logos names one: https://lampas.allmymind.org/#/?ref=Rom.8.28 opens the
  reader on that verse, and #/?word=G3551 opens the word sheet of νόμος. A reference may be written as OSIS or in English
  ('Rom 8:28', 'Romans 8:28', '1 John 1:9'), in any case, or as a chapter alone. A reference Lampas does not hold opens the
  nearest place it does hold, with a one-line notice saying what was asked for, never a blank screen. The Verse view and the
  word sheet each give back a link: Copy link, and Share where the phone has it. The browser's web+lampas: scheme reaches the
  same addresses (docs/links.md).

  Scenario: A reference opens the reader with the verse selected
    Given a link "#/?ref=Romans%208:28" is opened
    Then the reader is headed "Romans 8"
    And verse 28 is selected
    And there is no notice
    And the address names book "rom", chapter 8 and verse 28

  Scenario: An OSIS reference to another book opens it
    Given a link "#/?ref=1Jn.1.9" is opened
    Then the reader is headed "1 John 1"
    And verse 9 is selected
    And the address names book "1jn", chapter 1 and verse 9

  Scenario: A chapter alone opens the chapter with no verse selected
    Given a link "#/?ref=Rom%208" is opened
    Then the reader is headed "Romans 8"
    And no verse is selected
    And there is no notice

  Scenario: A verse past the end of the chapter opens the last verse and says what was asked for
    Given a link "#/?ref=Rom.8.99" is opened
    Then the reader is headed "Romans 8"
    And verse 39 is selected
    And the notice reads "“Rom.8.99” is not in Lampas; showing Romans 8:39."

  Scenario: A chapter past the end of the book opens the last chapter and says what was asked for
    Given a link "#/?ref=Romans%2099:1" is opened
    Then the reader is headed "Romans 16"
    And no verse is selected
    And the notice reads "“Romans 99:1” is not in Lampas; showing Romans 16."

  Scenario: A book Lampas does not hold opens the chapter he had open and says what was asked for
    Given a link "#/?ref=Tobit.3.1" is opened
    Then the reader is headed "Romans 8"
    And the notice reads "“Tobit.3.1” is not in Lampas; showing Romans 8."

  Scenario: The notice can be dismissed
    Given a link "#/?ref=Tobit.3.1" is opened
    When he dismisses the notice
    Then there is no notice

  Scenario: The web+lampas: form reaches the same verse
    Given a link "#/?ref=web%2Blampas%3ARom.8.28" is opened
    Then the reader is headed "Romans 8"
    And verse 28 is selected

  Scenario: A Strong's number opens the word sheet of its word
    Given a link "#/?word=G3551" is opened
    Then the word sheet shows "νόμος" meaning "law"
    And the word sheet has no Parsing row

  Scenario: A lemma opens the word sheet of that word
    Given a link "#/?word=%CE%BD%CF%8C%CE%BC%CE%BF%CF%82" is opened
    Then the word sheet shows "νόμος" meaning "law"

  Scenario: A word Lampas does not hold says so and opens the reader
    Given a link "#/?word=G99999" is opened
    Then the reader is headed "Romans 8"
    And the notice reads "“G99999” is not in Lampas; showing Romans 8."
    And no word sheet is open

  Scenario: The Verse view copies the https link of its verse
    Given a link "#/?ref=Rom.8.28" is opened
    When he taps Copy link on the Verse view
    Then the clipboard holds "https://lampas.allmymind.org/#/?ref=Rom.8.28"
    And the Verse view says "Link copied"

  Scenario: The Verse view has no Share button where the phone cannot share
    Given a link "#/?ref=Rom.8.28" is opened
    Then the Verse view has no Share button

  Scenario: The Verse view shares the https link of its verse where the phone can share
    Given the phone can share
    And a link "#/?ref=Rom.8.28" is opened
    When he taps Share on the Verse view
    Then the phone is asked to share "https://lampas.allmymind.org/#/?ref=Rom.8.28"

  Scenario: The word sheet copies the https link of its word
    Given a link "#/?word=G3551" is opened
    When he taps Copy link on the word sheet
    Then the clipboard holds "https://lampas.allmymind.org/#/?word=G3551"

  Scenario: A phone that refuses the clipboard shows the link to copy by hand
    Given a link "#/?ref=Rom.8.28" is opened
    And the clipboard refuses
    When he taps Copy link on the Verse view
    Then the Verse view shows the link "https://lampas.allmymind.org/#/?ref=Rom.8.28" to copy by hand
