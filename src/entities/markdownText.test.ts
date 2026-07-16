import { describe, expect, it } from 'vitest'
import { stripCode } from './markdownText'

describe('stripCode', () => {
  it('blanks out fenced code blocks while preserving length and newlines', () => {
    const content = 'antes\n```\ncode #tag\n```\ndepois'
    const stripped = stripCode(content)
    expect(stripped.length).toBe(content.length)
    expect(stripped).not.toContain('#tag')
    expect(stripped.split('\n').length).toBe(content.split('\n').length)
  })

  it('blanks out inline code spans while preserving length', () => {
    const content = 'veja `#tag` aqui'
    const stripped = stripCode(content)
    expect(stripped.length).toBe(content.length)
    expect(stripped).not.toContain('#tag')
  })

  it('leaves plain text untouched', () => {
    expect(stripCode('texto normal sem código')).toBe('texto normal sem código')
  })
})
