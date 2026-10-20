Feature: Turn pages in the Reader
  Settings > Reading is Scroll | Turn pages, Scroll by default. With Turn pages the chapter is laid out in pages the size of the reading box:
  a tap on the right third of the text or a swipe to the left turns forward a page, a tap on the left third or a swipe to the right turns back,
  and one quiet line under the text says the page ('Romans 8 · Page 2 of 7'). In the outer thirds a verse number, its play button or a heading is
  text and turns the page like the rest (mw-5r3p30.609); the chapter buttons still do what they do; a tap in the middle third still opens the word. Past the last page the next chapter opens on its first page, and back past the first page the previous chapter opens on its last (mw-5r3p30.620); at Matthew 1 and Revelation 22 nothing opens. With Scroll the
  Reader is as it always was. jsdom has no layout, so each chapter here is one page; how the pages look and turn at 390x844 is proven by
  tests/e2e/turn-pages.spec.ts (src/reader/usePages.ts).

  Scenario: Settings > Reading offers Scroll and Turn pages, and Scroll is the default
    Given Lampas is opened on Romans 8 with nothing chosen
    When he opens Settings
    Then the Reading row offers Scroll and Turn pages, with Scroll chosen

  Scenario: Choosing Turn pages lays the chapter out in pages, and it is kept
    Given Lampas is opened on Romans 8 with nothing chosen
    When he opens Settings and chooses Turn pages
    And he goes back to the Reader
    Then the chapter is laid out in pages
    And the place line under the text reads "Romans 8 · Page 1 of 1"
    When Lampas is closed and opened again on Romans 8
    Then the chapter is still laid out in pages

  Scenario: With Scroll the chapter scrolls and there is no page line
    Given Lampas is opened on Romans 8 with nothing chosen
    Then the chapter scrolls as one long text
    And there is no place line
