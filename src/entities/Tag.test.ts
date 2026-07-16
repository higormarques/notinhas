import { describe, expect, it } from 'vitest'
import { extractTags, uniqueTagNames } from './Tag'

describe('extractTags', () => {
  it('extracts a simple tag', () => {
    const matches = extractTags('nota com #projeto aqui')
    expect(matches).toEqual([{ tag: 'projeto', from: 9, to: 17 }])
  })

  it('excludes ATX headings (space right after #)', () => {
    expect(extractTags('# Heading')).toEqual([])
    expect(extractTags('## Outro heading')).toEqual([])
  })

  it('excludes a # glued to a preceding word', () => {
    expect(extractTags('foo#tag')).toEqual([])
  })

  it('excludes ## before a tag-like word', () => {
    expect(extractTags('##tag')).toEqual([])
  })

  it('excludes tags inside inline code', () => {
    expect(extractTags('veja `#tag` aqui')).toEqual([])
  })

  it('excludes tags inside fenced code blocks', () => {
    expect(extractTags('```\n#include <stdio.h>\n```')).toEqual([])
  })

  it('includes accented characters', () => {
    const matches = extractTags('#ação')
    expect(matches.map((m) => m.tag)).toEqual(['ação'])
  })

  it('matches multiple tags on the same line', () => {
    const matches = extractTags('#um #dois #tres')
    expect(matches.map((m) => m.tag)).toEqual(['um', 'dois', 'tres'])
  })

  it('matches a tag at the very start of the content', () => {
    expect(extractTags('#inicio texto').map((m) => m.tag)).toEqual(['inicio'])
  })
})

describe('uniqueTagNames', () => {
  it('deduplicates case-insensitively and sorts', () => {
    expect(uniqueTagNames('#Projeto #tarefa #projeto')).toEqual(['projeto', 'tarefa'])
  })

  it('returns an empty array when there are no tags', () => {
    expect(uniqueTagNames('texto sem tags')).toEqual([])
  })
})
