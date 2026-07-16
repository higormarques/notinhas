import { del, get, set } from 'idb-keyval'
import { reactive, ref } from 'vue'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'
import { parseFrontmatter } from '@/entities/Frontmatter'
import { docLinkTargets } from '@/entities/DocLink'
import { uniqueTagNames } from '@/entities/Tag'

export interface SearchIndexEntry {
  path: string
  title: string
  /** Corpo da nota, com o bloco de frontmatter já removido (ver `Frontmatter.ts`) — assim
   * `criado`/`atualizado`/propriedades customizadas nunca poluem a busca full-text nem a
   * extração de tags/links. */
  content: string
  /** Nomes únicos de `#tag` (minúsculas), extraídos de `content`. */
  tags: string[]
  /** Alvos únicos de `[[link]]` (texto bruto, não resolvido), extraídos de `content`. */
  links: string[]
}

export interface TagCount {
  tag: string
  count: number
}

export interface SearchResult {
  path: string
  title: string
  snippet: string
}

export type SearchIndexStatus = 'empty' | 'building' | 'ready'

const STORAGE_KEY = 'notinhas:search-index'

const entries = reactive(new Map<string, SearchIndexEntry>())
const status = ref<SearchIndexStatus>('empty')
let hydration: Promise<void> | null = null

/** Exportada (além de usada internamente) para que quem já tem um path resolvido — como o
 * autocomplete de `[[link]]` em `useNoteEditor.ts`, que resolve via `buildTitleIndex` — consiga
 * exibir o título no formato original (a chave de `buildTitleIndex` é sempre minúscula, para
 * comparação case-insensitive; o path preserva o nome de arquivo real). */
export function titleFromPath(path: string): string {
  const name = path.split('/').pop() ?? path
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

/** Monta uma entrada de índice a partir do conteúdo bruto do arquivo (com frontmatter, se
 * houver) — separa o frontmatter antes de computar `content`/`tags`/`links`, único ponto que
 * faz essa separação para `rebuildIndex`/`upsertEntry`. */
function buildEntry(path: string, rawContent: string): SearchIndexEntry {
  const { body } = parseFrontmatter(rawContent)
  return {
    path,
    title: titleFromPath(path),
    content: body,
    tags: uniqueTagNames(body),
    links: docLinkTargets(body),
  }
}

async function persist(): Promise<void> {
  try {
    await set(STORAGE_KEY, Array.from(entries.values()))
  } catch {
    // Persistência é best-effort, mesmo padrão do handle do workspace (handleStore.ts) — se
    // falhar, a sessão atual continua funcionando com o índice só em memória.
  }
}

/** Carrega o índice persistido (se houver) uma única vez por sessão da aplicação. Memoizado via
 * `hydration` para que chamadas concorrentes de `ensureIndexReady` não disparem leituras
 * duplicadas do IndexedDB. */
function hydrate(): Promise<void> {
  if (!hydration) {
    hydration = (async () => {
      try {
        const persisted = await get<SearchIndexEntry[]>(STORAGE_KEY)
        if (persisted && persisted.length > 0) {
          for (const entry of persisted) entries.set(entry.path, entry)
          status.value = 'ready'
        }
      } catch {
        // Sem índice persistido utilizável — segue vazio, `ensureIndexReady` reconstrói.
      }
    })()
  }
  return hydration
}

async function listAllFiles(adapter: StorageAdapter, path: string): Promise<string[]> {
  const children = await adapter.listDirectory(path)
  const files: string[] = []
  for (const child of children) {
    if (child.kind === 'file') {
      files.push(child.path)
    } else {
      files.push(...(await listAllFiles(adapter, child.path)))
    }
  }
  return files
}

/** Varredura completa do workspace, substituindo o índice inteiro. Usada na primeira vez que a
 * busca é aberta numa sessão sem índice persistido utilizável — depois disso, o índice é mantido
 * incrementalmente por `upsertEntry`/`removeSubtree`/`renameSubtree` (ver
 * `IndexingStorageAdapter`), sem precisar de nova varredura completa. */
export async function rebuildIndex(adapter: StorageAdapter): Promise<void> {
  status.value = 'building'
  const paths = await listAllFiles(adapter, '')
  const next = new Map<string, SearchIndexEntry>()
  for (const path of paths) {
    try {
      const content = await adapter.readFile(path)
      next.set(path, buildEntry(path, content))
    } catch {
      // Arquivo pode ter sido removido durante a varredura — ignora.
    }
  }
  entries.clear()
  for (const [path, entry] of next) entries.set(path, entry)
  status.value = 'ready'
  await persist()
}

/** Garante que o índice esteja pronto para busca: hidrata do IndexedDB se ainda não tentou nesta
 * sessão e, se mesmo assim não houver nada utilizável, faz a varredura completa. */
export async function ensureIndexReady(adapter: StorageAdapter): Promise<void> {
  await hydrate()
  if (status.value === 'ready') return
  await rebuildIndex(adapter)
}

export async function upsertEntry(path: string, content: string): Promise<void> {
  entries.set(path, buildEntry(path, content))
  await persist()
}

export async function removeSubtree(path: string): Promise<void> {
  for (const key of Array.from(entries.keys())) {
    if (key === path || key.startsWith(`${path}/`)) entries.delete(key)
  }
  await persist()
}

/** Remapeia as entradas já indexadas de `fromPath` para `toPath` (arquivo único ou pasta
 * inteira). Não relê o conteúdo do `StorageAdapter` — o conteúdo não muda numa renomeação/
 * movimentação, só o caminho, então basta reaproveitar o que já está indexado. */
export async function renameSubtree(fromPath: string, toPath: string): Promise<void> {
  const toRemap = Array.from(entries.entries()).filter(
    ([key]) => key === fromPath || key.startsWith(`${fromPath}/`),
  )
  for (const [oldPath, entry] of toRemap) {
    entries.delete(oldPath)
    const newPath =
      oldPath === fromPath ? toPath : toPath + oldPath.slice(fromPath.length)
    entries.set(newPath, { ...entry, path: newPath, title: titleFromPath(newPath) })
  }
  await persist()
}

function buildSnippet(content: string, matchIndex: number): string {
  if (matchIndex === -1) return content.slice(0, 100).trim()
  const start = Math.max(0, matchIndex - 30)
  const end = Math.min(content.length, matchIndex + 70)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end).trim()}${suffix}`
}

/** Busca case-insensitive por substring em título e conteúdo. Resultados com match no título
 * vêm primeiro; o snippet é recortado ao redor da primeira ocorrência no conteúdo (ou os
 * primeiros caracteres da nota, se o match foi só no título). */
export function search(query: string): SearchResult[] {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length === 0) return []

  const matches: {
    entry: SearchIndexEntry
    titleMatch: boolean
    contentIndex: number
  }[] = []
  for (const entry of entries.values()) {
    const titleMatch = entry.title.toLowerCase().includes(trimmed)
    const contentIndex = entry.content.toLowerCase().indexOf(trimmed)
    if (titleMatch || contentIndex !== -1) {
      matches.push({ entry, titleMatch, contentIndex })
    }
  }

  matches.sort((a, b) => {
    if (a.titleMatch !== b.titleMatch) return a.titleMatch ? -1 : 1
    return a.entry.path.localeCompare(b.entry.path)
  })

  return matches.map(({ entry, contentIndex }) => ({
    path: entry.path,
    title: entry.title,
    snippet: buildSnippet(entry.content, contentIndex),
  }))
}

export function getIndexStatus() {
  return status
}

/** Todas as tags conhecidas com a contagem de notas que as usam, ordenadas por contagem
 * decrescente e depois por nome — alimenta o painel de tags. */
export function listTagsWithCounts(): TagCount[] {
  const counts = new Map<string, number>()
  for (const entry of entries.values()) {
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** Notas que carregam a tag dada (case-insensitive), ordenadas por título. */
export function notesForTag(tag: string): SearchIndexEntry[] {
  const normalized = tag.trim().toLowerCase()
  return Array.from(entries.values())
    .filter((entry) => entry.tags.includes(normalized))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Mapa título (minúsculas) → path, construído a partir do estado atual do índice — usado tanto
 * para resolver `[[link]]` (decoração/clique no editor, autocomplete) quanto para achar
 * backlinks. Em caso de duas notas com o mesmo título em pastas diferentes, "o último ganha"
 * (limitação aceita — não há suporte a links qualificados por caminho nesta fase). */
export function buildTitleIndex(): Map<string, string> {
  const titleToPath = new Map<string, string>()
  for (const entry of entries.values()) {
    titleToPath.set(entry.title.toLowerCase(), entry.path)
  }
  return titleToPath
}

/** Notas cujo `links` contém um alvo que resolve (via `buildTitleIndex`) para `path` — alimenta o
 * painel de Backlinks. A resolução acontece aqui, sempre contra os títulos ATUAIS, não é
 * guardada no momento da indexação — então não exige re-escanear o conteúdo de quem linka
 * quando outra coisa muda no índice. **Limitação aceita**: o texto de um `[[link]]` não é
 * reescrito automaticamente quando a nota-alvo é renomeada (isso exigiria editar o arquivo de
 * quem linka, fora do escopo desta fase) — um link para o título antigo simplesmente para de
 * resolver após o rename, até o usuário atualizar o texto manualmente. */
export function notesLinkingTo(path: string): SearchIndexEntry[] {
  const titleToPath = buildTitleIndex()
  return Array.from(entries.values())
    .filter((entry) =>
      entry.links.some((target) => titleToPath.get(target.toLowerCase()) === path),
    )
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Limpa o índice (memória + IndexedDB + status de hidratação). Usado tanto em testes (estado em
 * módulo, mesmo padrão de `useShortcuts`/`useTheme`, precisa ser resetado entre casos) quanto em
 * produção por `forgetPersistedWorkspace` — trocar de workspace não pode deixar entradas do
 * workspace anterior contaminando a busca do novo (inclusive via hidratação do IndexedDB: sem
 * apagar a chave persistida, a próxima `ensureIndexReady` reidratria os dados do workspace
 * antigo em vez de reconstruir do zero). */
export async function resetSearchIndex(): Promise<void> {
  entries.clear()
  status.value = 'empty'
  hydration = null
  try {
    await del(STORAGE_KEY)
  } catch {
    // Best-effort, mesmo padrão de `persist()`.
  }
}
