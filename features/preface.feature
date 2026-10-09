Feature: A Preface about the text
  Lampas reads the Byzantine (Majority) Greek of Robinson and Pierpont with the Majority Standard
  Bible's English. A Preface page says so in a few plain paragraphs and links to the sources: Robinson's
  essay on Byzantine priority, the Robinson-Pierpont edition and the Majority Standard Bible's site. It is
  reached from the top of the chapter picker and from About.

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
    And it links to the Robinson essay "The Case for Byzantine Priority" at "http://rosetta.reltech.org/TC/vol06/Robinson2001.html"
    And it links to the Majority Standard Bible at "https://majoritybible.com/"
    And every link opens in a new tab with rel "noreferrer"
    And every address on the page is one of the listed sources
    And the tutor is told the page's facts

  Scenario: Back from the Preface returns to the Reader
    Given Lampas is opened with nothing saved
    And he opens the Preface from the picker
    When he taps "‹ Reader"
    Then the reader is headed "Romans 8"
