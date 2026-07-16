import { describe, expect, it } from 'vitest'
import {
  docLinkTargets,
  extractDocLinks,
  resolveDocLinkTarget,
  unescapeDocLinkMarkdown,
} from './DocLink'

describe('extractDocLinks', () => {
  it('extracts a simple link', () => {
    const matches = extractDocLinks('veja [[Minha Nota]] aqui')
    expect(matches).toEqual([{ target: 'Minha Nota', from: 5, to: 19 }])
  })

  it('does not match an unterminated [[', () => {
    expect(extractDocLinks('texto [[sem fechar')).toEqual([])
  })

  it('does not match across a newline', () => {
    expect(extractDocLinks('[[quebrado\nsem fechar]]')).toEqual([])
  })

  it('excludes links inside inline code', () => {
    expect(extractDocLinks('veja `[[Nota]]` aqui')).toEqual([])
  })

  it('excludes links inside fenced code blocks', () => {
    expect(extractDocLinks('```\n[[Nota]]\n```')).toEqual([])
  })

  it('matches multiple links', () => {
    const matches = extractDocLinks('[[A]] e [[B]]')
    expect(matches.map((m) => m.target)).toEqual(['A', 'B'])
  })
})

describe('docLinkTargets', () => {
  it('deduplicates and preserves first-seen order, trimming whitespace', () => {
    expect(docLinkTargets('[[ Nota A ]] e [[Nota B]] e [[Nota A]]')).toEqual(['Nota A', 'Nota B'])
  })

  it('ignores empty targets', () => {
    expect(docLinkTargets('[[]]')).toEqual([])
  })
})

describe('resolveDocLinkTarget', () => {
  it('resolves case-insensitively', () => {
    const titleToPath = new Map([['minha nota', 'Pasta/Minha Nota.md']])
    expect(resolveDocLinkTarget('Minha Nota', titleToPath)).toBe('Pasta/Minha Nota.md')
    expect(resolveDocLinkTarget('  minha nota  ', titleToPath)).toBe('Pasta/Minha Nota.md')
  })

  it('returns null when there is no match', () => {
    expect(resolveDocLinkTarget('Inexistente', new Map())).toBeNull()
  })
})

describe('unescapeDocLinkMarkdown', () => {
  it('undoes the double-bracket escaping applied by @tiptap/markdown serialization', () => {
    expect(unescapeDocLinkMarkdown('texto \\[\\[Nota\\]\\] aqui')).toBe('texto [[Nota]] aqui')
  })

  it('leaves single escaped brackets untouched', () => {
    expect(unescapeDocLinkMarkdown('veja \\[isso\\] aqui')).toBe('veja \\[isso\\] aqui')
  })

  it('leaves plain text without escaped brackets untouched', () => {
    expect(unescapeDocLinkMarkdown('texto normal')).toBe('texto normal')
  })
})
