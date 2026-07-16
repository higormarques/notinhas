import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildTitleIndex,
  ensureIndexReady,
  getIndexStatus,
  listTagsWithCounts,
  notesForTag,
  notesLinkingTo,
  rebuildIndex,
  removeSubtree,
  renameSubtree,
  resetSearchIndex,
  search,
  upsertEntry,
} from './searchIndex'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'

const idbStore = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(idbStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    idbStore.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    idbStore.delete(key)
    return Promise.resolve()
  }),
}))

function createFakeAdapter(files: Record<string, string>): StorageAdapter {
  function listChildren(path: string) {
    const prefix = path ? `${path}/` : ''
    const byName = new Map<string, { name: string; path: string; kind: 'file' | 'directory' }>()
    for (const filePath of Object.keys(files)) {
      if (!filePath.startsWith(prefix)) continue
      const rest = filePath.slice(prefix.length)
      const [first] = rest.split('/')
      if (rest.includes('/')) {
        byName.set(first, { name: first, path: prefix + first, kind: 'directory' })
      } else {
        byName.set(first, { name: first, path: filePath, kind: 'file' })
      }
    }
    return Array.from(byName.values())
  }

  return {
    listDirectory: vi.fn(async (path: string) => listChildren(path)),
    readFile: vi.fn(async (path: string) => {
      const content = files[path]
      if (content === undefined) throw new Error(`not found: ${path}`)
      return content
    }),
    writeFile: vi.fn(async () => {}),
    createDirectory: vi.fn(async () => {}),
    deleteFile: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
  }
}

describe('searchIndex', () => {
  beforeEach(async () => {
    idbStore.clear()
    await resetSearchIndex()
    vi.clearAllMocks()
  })

  describe('rebuildIndex', () => {
    it('scans the workspace recursively and indexes every file', async () => {
      const adapter = createFakeAdapter({
        'bemvindo.md': 'Olá mundo',
        'Projetos/ideia.md': 'Uma ideia genial',
      })

      await rebuildIndex(adapter)

      expect(getIndexStatus().value).toBe('ready')
      expect(search('ideia')).toEqual([
        { path: 'Projetos/ideia.md', title: 'ideia', snippet: 'Uma ideia genial' },
      ])
    })

    it('persists the rebuilt index to IndexedDB', async () => {
      const adapter = createFakeAdapter({ 'nota.md': 'conteudo' })
      await rebuildIndex(adapter)
      expect(idbStore.get('notinhas:search-index')).toEqual([
        { path: 'nota.md', title: 'nota', content: 'conteudo', tags: [], links: [] },
      ])
    })

    it('strips frontmatter before computing content/tags/links', async () => {
      const adapter = createFakeAdapter({
        'nota.md': '---\ncriado: 2026-07-15\n---\ncorpo com #tag e [[Outra]]',
      })
      await rebuildIndex(adapter)
      expect(search('criado')).toEqual([])
      expect(notesForTag('tag').map((e) => e.path)).toEqual(['nota.md'])
      expect(notesForTag('tag')[0].links).toEqual(['Outra'])
    })
  })

  describe('ensureIndexReady', () => {
    it('rebuilds when there is no persisted index', async () => {
      const adapter = createFakeAdapter({ 'a.md': 'conteudo a' })
      await ensureIndexReady(adapter)
      expect(getIndexStatus().value).toBe('ready')
      expect(search('conteudo')).toHaveLength(1)
    })

    it('hydrates from the persisted index instead of rescanning when available', async () => {
      idbStore.set('notinhas:search-index', [
        { path: 'persisted.md', title: 'persisted', content: 'já estava aqui' },
      ])
      const adapter = createFakeAdapter({ 'outra.md': 'não deveria varrer isso' })

      await ensureIndexReady(adapter)

      expect(adapter.listDirectory).not.toHaveBeenCalled()
      expect(search('persisted')).toHaveLength(1)
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      await rebuildIndex(
        createFakeAdapter({
          'gatos.md': 'Notas sobre cachorros também',
          'cachorros.md': 'Nada sobre o outro animal aqui',
        }),
      )
    })

    it('ranks a title match above a content-only match', () => {
      const results = search('cachorros')
      expect(results.map((r) => r.path)).toEqual(['cachorros.md', 'gatos.md'])
    })

    it('is case-insensitive', () => {
      expect(search('GATOS')).toHaveLength(1)
    })

    it('returns an empty array for an empty query', () => {
      expect(search('   ')).toEqual([])
    })

    it('returns no results for text that matches nothing', () => {
      expect(search('inexistente')).toEqual([])
    })
  })

  describe('upsertEntry', () => {
    it('adds a new entry to the index', async () => {
      await upsertEntry('nova.md', 'conteúdo novo')
      expect(search('conteúdo novo')).toEqual([
        { path: 'nova.md', title: 'nova', snippet: 'conteúdo novo' },
      ])
    })

    it('replaces an existing entry', async () => {
      await upsertEntry('nota.md', 'primeira versão')
      await upsertEntry('nota.md', 'segunda versão')
      expect(search('primeira')).toEqual([])
      expect(search('segunda')).toHaveLength(1)
    })
  })

  describe('removeSubtree', () => {
    it('removes a single file entry', async () => {
      await upsertEntry('nota.md', 'conteudo')
      await removeSubtree('nota.md')
      expect(search('conteudo')).toEqual([])
    })

    it('removes every entry under a folder', async () => {
      await upsertEntry('Pasta/a.md', 'conteudo a')
      await upsertEntry('Pasta/b.md', 'conteudo b')
      await upsertEntry('outra.md', 'conteudo c')

      await removeSubtree('Pasta')

      expect(search('conteudo').map((r) => r.path)).toEqual(['outra.md'])
    })
  })

  describe('renameSubtree', () => {
    it('remaps a single file without re-reading its content', async () => {
      await upsertEntry('velho.md', 'mesmo conteúdo')
      await renameSubtree('velho.md', 'novo.md')

      const results = search('mesmo conteúdo')
      expect(results).toEqual([{ path: 'novo.md', title: 'novo', snippet: 'mesmo conteúdo' }])
    })

    it('remaps every entry under a renamed/moved folder', async () => {
      await upsertEntry('Origem/a.md', 'conteudo a')
      await upsertEntry('Origem/sub/b.md', 'conteudo b')

      await renameSubtree('Origem', 'Destino')

      expect(search('conteudo').map((r) => r.path).sort()).toEqual([
        'Destino/a.md',
        'Destino/sub/b.md',
      ])
    })
  })

  describe('listTagsWithCounts', () => {
    it('counts tags across notes and sorts by count desc, then name', async () => {
      await upsertEntry('a.md', '#projeto #urgente')
      await upsertEntry('b.md', '#projeto')
      await upsertEntry('c.md', '#zeta')

      expect(listTagsWithCounts()).toEqual([
        { tag: 'projeto', count: 2 },
        { tag: 'urgente', count: 1 },
        { tag: 'zeta', count: 1 },
      ])
    })
  })

  describe('notesForTag', () => {
    it('is case-insensitive and sorts by title', async () => {
      await upsertEntry('b.md', '#projeto')
      await upsertEntry('a.md', '#Projeto')

      expect(notesForTag('PROJETO').map((e) => e.path)).toEqual(['a.md', 'b.md'])
    })
  })

  describe('buildTitleIndex', () => {
    it('maps lowercase title to path, last write winning on collision', async () => {
      await upsertEntry('Pasta1/Ideias.md', 'uma')
      await upsertEntry('Pasta2/Ideias.md', 'outra')

      expect(buildTitleIndex().get('ideias')).toBe('Pasta2/Ideias.md')
    })
  })

  describe('notesLinkingTo', () => {
    it('resolves notes whose [[link]] target the given note by title', async () => {
      await upsertEntry('Alvo.md', 'conteudo')
      await upsertEntry('Origem.md', 'veja [[Alvo]] aqui')

      expect(notesLinkingTo('Alvo.md').map((e) => e.path)).toEqual(['Origem.md'])
    })

    it('resolves by the CURRENT title, not a path recorded at index time', async () => {
      // notesLinkingTo nunca guarda o path resolvido — resolve o texto do link contra o título
      // atual a cada chamada, então uma nota cujo título já era "Renomeada" desde sempre resolve
      // normalmente (a limitação real de renomear uma nota-alvo depois de outras já linkarem
      // para o título antigo é documentada na ADR 0006: o texto do link não é reescrito
      // automaticamente, então vira um link não-resolvido até o usuário atualizar manualmente).
      await upsertEntry('Renomeada.md', 'conteudo')
      await upsertEntry('Origem.md', 'veja [[Renomeada]] aqui')

      expect(notesLinkingTo('Renomeada.md').map((e) => e.path)).toEqual(['Origem.md'])
    })

    it('stops resolving old link text once the target note is renamed (documented limitation)', async () => {
      await upsertEntry('Alvo.md', 'conteudo')
      await upsertEntry('Origem.md', 'veja [[Alvo]] aqui')

      await renameSubtree('Alvo.md', 'Renomeada.md')

      expect(notesLinkingTo('Renomeada.md')).toEqual([])
    })

    it('returns an empty array when nothing links to the note', async () => {
      await upsertEntry('Sozinha.md', 'conteudo')
      expect(notesLinkingTo('Sozinha.md')).toEqual([])
    })
  })
})
