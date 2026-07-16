import { describe, expect, it } from 'vitest'
import { parseFrontmatter, serializeNote, stampTimestamps } from './Frontmatter'

describe('parseFrontmatter', () => {
  it('returns empty frontmatter and the content unchanged when there is no leading block', () => {
    expect(parseFrontmatter('# Título\ncorpo')).toEqual({
      frontmatter: {},
      body: '# Título\ncorpo',
    })
  })

  it('parses a leading frontmatter block and strips exactly one following blank line', () => {
    const content =
      '---\ncriado: 2026-07-15T00:00:00.000Z\natualizado: 2026-07-16T00:00:00.000Z\n---\n\ncorpo'
    expect(parseFrontmatter(content)).toEqual({
      frontmatter: {
        criado: '2026-07-15T00:00:00.000Z',
        atualizado: '2026-07-16T00:00:00.000Z',
      },
      body: 'corpo',
    })
  })

  it('parses custom keys alongside managed ones', () => {
    const content = '---\ncriado: 2026-07-15T00:00:00.000Z\nprioridade: alta\n---\ncorpo'
    expect(parseFrontmatter(content).frontmatter).toEqual({
      criado: '2026-07-15T00:00:00.000Z',
      prioridade: 'alta',
    })
  })

  it('preserves a value containing a colon by splitting only on the first one', () => {
    const content = '---\nurl: http://example.com\n---\ncorpo'
    expect(parseFrontmatter(content).frontmatter.url).toBe('http://example.com')
  })

  it('treats an unterminated block as plain body', () => {
    const content = '---\ncriado: 2026-07-15\ncorpo sem fechar'
    expect(parseFrontmatter(content)).toEqual({ frontmatter: {}, body: content })
  })

  it('skips malformed lines without a colon', () => {
    const content = '---\nlinha sem dois pontos\ncriado: 2026-07-15\n---\ncorpo'
    expect(parseFrontmatter(content).frontmatter).toEqual({ criado: '2026-07-15' })
  })

  it('handles an empty body after the closing delimiter', () => {
    expect(parseFrontmatter('---\ncriado: 2026-07-15\n---\n')).toEqual({
      frontmatter: { criado: '2026-07-15' },
      body: '',
    })
  })
})

describe('serializeNote', () => {
  it('emits nothing when frontmatter has no keys', () => {
    expect(serializeNote({}, 'corpo')).toBe('corpo')
  })

  it('orders criado/atualizado first, then custom keys alphabetically', () => {
    const result = serializeNote(
      { zeta: '1', criado: '2026-07-15', alfa: '2', atualizado: '2026-07-16' },
      'corpo',
    )
    expect(result).toBe(
      '---\ncriado: 2026-07-15\natualizado: 2026-07-16\nalfa: 2\nzeta: 1\n---\ncorpo',
    )
  })

  it('round-trips through parseFrontmatter', () => {
    const frontmatter = { criado: '2026-07-15T00:00:00.000Z', prioridade: 'alta' }
    const serialized = serializeNote(frontmatter, 'corpo da nota')
    expect(parseFrontmatter(serialized)).toEqual({ frontmatter, body: 'corpo da nota' })
  })
})

describe('stampTimestamps', () => {
  const now = new Date('2026-07-16T12:00:00.000Z')

  it('sets both criado and atualizado when criado is absent', () => {
    expect(stampTimestamps({}, now)).toEqual({
      criado: '2026-07-16T12:00:00.000Z',
      atualizado: '2026-07-16T12:00:00.000Z',
    })
  })

  it('preserves an existing criado while always bumping atualizado', () => {
    expect(stampTimestamps({ criado: '2026-07-01T00:00:00.000Z' }, now)).toEqual({
      criado: '2026-07-01T00:00:00.000Z',
      atualizado: '2026-07-16T12:00:00.000Z',
    })
  })

  it('preserves other custom keys untouched', () => {
    expect(stampTimestamps({ prioridade: 'alta' }, now)).toEqual({
      prioridade: 'alta',
      criado: '2026-07-16T12:00:00.000Z',
      atualizado: '2026-07-16T12:00:00.000Z',
    })
  })
})
