Feature: A Preface about the text
  Lampas reads the Byzantine (Majority) Greek of Robinson and Pierpont with the Majority Standard
  Bible's English. A Preface page says so in a few plain paragraphs and links to the sources: Robinson's
  essay on Byzantine priority, the Robinson-Pierpont edition and the Majority Standard Bible's site. It is
  reached from the top of the chapter picker and from About. The essay is also in the app, in a phone-sized copy
  of the appendix of the 2005 edition (its release into the public domain names that appendix; the 2001 journal
  article differs, so it is only linked).

  Scenario: The chapter picker opens the Preface from above Matthew
    Given Lampas is opened with nothing saved
    When he taps the title
    Then the picker shows "Preface" above "Matthew"
    When he taps "Preface" in the picker
    Then the screen is headed "Preface"
    And the address is "#/preface"
    And the picker is closed

  Scenario: About links to the Preface and Back returns
    Given Lampas is opened with nothing saved
    And he taps "About"
    When he taps "Preface"
    Then the screen is headed "Preface"
    When he goes back
    Then he is back on the screen headed "About"

  Scenario: The Preface names its sources and links to them
    Given Lampas is opened on the Preface
    Then the page names "Robinson and Pierpont" and "Majority Standard Bible"
    And it links to the original of the Robinson essay "Original (TC Journal, 2001)" at "http://rosetta.reltech.org/TC/vol06/Robinson2001.html"
    And the original is marked as an old-format page that answers only on http
    And it links to the Majority Standard Bible at "https://majoritybible.com/"
    And every link opens in a new tab with rel "noreferrer"
    And every address on the page is one of the listed sources
    And the tutor is told the page's facts

  Scenario: Back from the Preface returns to the Reader
    Given Lampas is opened with nothing saved
    And he opens the Preface from the picker
    When he taps "‹ Reader"
    Then the reader is headed "Romans 8"

  Scenario: The Robinson entry opens the essay inside the app
    Given Lampas is opened on the Preface
    When he taps "The Case for Byzantine Priority"
    Then the screen is headed "The Case for Byzantine Priority"
    And the address is "#/preface/robinson"
    And the essay's first heading is "Introduction"
    And the essay has the heading "Concluding Observations"
    When he goes back
    Then he is back on the screen headed "Preface"

  Scenario: The essay's footnotes open and close in place
    Given Lampas is opened on the essay
    When he taps the footnote number "1"
    Then the footnote's text is shown under the paragraph
    When he taps the same footnote number "1" again
    Then the footnote's text is hidden

  Scenario: The essay says where it comes from and keeps the original beneath
    Given Lampas is opened on the essay
    Then the essay says it is released into the public domain with the 2005 edition's appendix
    And it links to the original of the Robinson essay "Original (TC Journal, 2001)" at "http://rosetta.reltech.org/TC/vol06/Robinson2001.html"
    And the original is marked as an old-format page that answers only on http
    And About this copy says it is the 2005 appendix, not the 2001 article, and links the appendix

  Scenario: Greek in the essay is Greek letters
    Given Lampas is opened on the essay
    Then the essay shows "αγγελος κυριου" with no transliteration markup left in it
