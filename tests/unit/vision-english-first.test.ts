import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const vision = readFileSync('VISION.md', 'utf8')

describe('VISION.md holds his words on English first', () => {
  it('quotes turn 1 and turn 2 verbatim, dated 2026-10-13', () => {
    expect(vision).toContain(
      "I feel like it's actually a pretty good Bible and people use it without having to learn Greek",
    )
    expect(vision).toContain(
      "if somebody's not interested in learning Greek in the beginning they can just have a really nice app experience like a really nice Bible reading experience",
    )
    expect(vision).toContain('Talk 4787b4d6, 2026-10-13')
  })

  it('says the app is a good Bible in plain English with the Greek one tap away', () => {
    expect(vision).toContain('good Bible in plain English')
    expect(vision).toContain('Greek one tap away')
    expect(vision).toContain('says no to')
  })
})
