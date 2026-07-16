import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutation, useQueries, useQueryClient } from '@tanstack/vue-query'
import type { DirectoryEntry } from '@/shared/storage/StorageAdapter'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useNotesStore } from '@/shared/stores/notes'
import { DAILY_DIRECTORY } from '@/entities/DailyNote'
import { HELP_NOTE_PATH } from '@/entities/HelpNote'

export interface FileTreeRow {
  entry: DirectoryEntry
  depth: number
  isExpanded: boolean
  displayName: string
}

type DialogKind = 'closed' | 'create-note' | 'create-folder' | 'rename' | 'delete'

interface DialogState {
  kind: DialogKind
  /** create: pasta-pai onde o novo item entra · rename/delete: caminho do item alvo */
  path: string
  /** create: nome do novo item · rename: novo caminho completo · delete: nome de exibição */
  name: string
}

const CLOSED_DIALOG: DialogState = { kind: 'closed', path: '', name: '' }

function parentOf(path: string): string {
  const segments = path.split('/').filter(Boolean)
  segments.pop()
  return segments.join('/')
}

function joinPath(parent: string, name: string): string {
  return [parent, name].filter(Boolean).join('/')
}

function isWithin(path: string, ancestorPath: string): boolean {
  return path === ancestorPath || path.startsWith(`${ancestorPath}/`)
}

function remapPath(path: string, fromBase: string, toBase: string): string {
  if (path === fromBase) return toBase
  return toBase + path.slice(fromBase.length)
}

function displayNameFor(entry: DirectoryEntry): string {
  if (entry.kind === 'directory' || !entry.name.endsWith('.md')) return entry.name
  return entry.name.slice(0, -'.md'.length)
}

export function useFileTree() {
  const notesStore = useNotesStore()
  const { openTabs } = storeToRefs(notesStore)
  const queryClient = useQueryClient()

  const expandedPaths = ref<Set<string>>(new Set(['']))
  const focusedPath = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)
  const dialog = ref<DialogState>(CLOSED_DIALOG)

  const rowElements = new Map<string, HTMLElement>()

  const directoryPaths = computed(() => Array.from(expandedPaths.value))

  const directoryQueries = useQueries({
    queries: () =>
      directoryPaths.value.map((path) => ({
        queryKey: ['directory', path] as const,
        queryFn: () => getStorageAdapter().listDirectory(path),
      })),
  })

  function isHiddenRootEntry(path: string, entry: DirectoryEntry): boolean {
    if (path !== '') return false
    // A pasta Daily/ é navegada pelo Daily Desk e pela paleta de comandos ("ir para data"), não
    // pela árvore de arquivos — escondida aqui em vez de filtrada no StorageAdapter para não
    // afetar outros consumidores da mesma listagem (ex.: notes-index da paleta).
    if (entry.kind === 'directory' && entry.name === DAILY_DIRECTORY) return true
    // A nota de ajuda pertence ao core do app (conteúdo embutido no bundle, ver
    // `entities/HelpNote.ts`) — escondida da árvore pelo mesmo motivo, e isso também é o que a
    // torna impossível de renomear/apagar pela UI (a única ação de renomear/excluir do app é a
    // da árvore de arquivos). Continua indexada normalmente pra busca/paleta, como uma nota
    // diária qualquer.
    if (entry.kind === 'file' && entry.name === HELP_NOTE_PATH) return true
    return false
  }

  const entriesByPath = computed(() => {
    const map = new Map<string, DirectoryEntry[]>()
    directoryPaths.value.forEach((path, index) => {
      const entries = directoryQueries.value[index]?.data ?? []
      map.set(
        path,
        entries.filter((entry) => !isHiddenRootEntry(path, entry)),
      )
    })
    return map
  })

  const rows = computed<FileTreeRow[]>(() => {
    function walk(path: string, depth: number): FileTreeRow[] {
      const entries = entriesByPath.value.get(path) ?? []
      return entries.flatMap((entry) => {
        const isExpanded =
          entry.kind === 'directory' && expandedPaths.value.has(entry.path)
        const row: FileTreeRow = {
          entry,
          depth,
          isExpanded,
          displayName: displayNameFor(entry),
        }
        return isExpanded ? [row, ...walk(entry.path, depth + 1)] : [row]
      })
    }
    return walk('', 0)
  })

  const isRootLoading = computed(() => {
    const index = directoryPaths.value.indexOf('')
    return index === -1 ? false : (directoryQueries.value[index]?.isLoading ?? false)
  })

  const isRootEmpty = computed(() => rows.value.length === 0 && !isRootLoading.value)

  watch(
    rows,
    (currentRows) => {
      if (currentRows.length === 0) {
        focusedPath.value = null
        return
      }
      if (!currentRows.some((row) => row.entry.path === focusedPath.value)) {
        focusedPath.value = currentRows[0].entry.path
      }
    },
    { immediate: true },
  )

  function registerRowEl(path: string, el: Element | null) {
    if (el instanceof HTMLElement) {
      rowElements.set(path, el)
    } else {
      rowElements.delete(path)
    }
  }

  function focusRow(path: string) {
    focusedPath.value = path
    void nextTick(() => {
      rowElements.get(path)?.focus()
    })
  }

  function expand(path: string) {
    if (expandedPaths.value.has(path)) return
    const next = new Set(expandedPaths.value)
    next.add(path)
    expandedPaths.value = next
  }

  function collapse(path: string) {
    if (!expandedPaths.value.has(path)) return
    const next = new Set(expandedPaths.value)
    next.delete(path)
    expandedPaths.value = next
  }

  function toggleExpanded(path: string) {
    if (expandedPaths.value.has(path)) {
      collapse(path)
    } else {
      expand(path)
    }
  }

  function activateRow(row: FileTreeRow) {
    if (row.entry.kind === 'file') {
      notesStore.openNote(row.entry.path)
    } else {
      toggleExpanded(row.entry.path)
    }
  }

  function defaultParentPath(): string {
    const row = rows.value.find((r) => r.entry.path === focusedPath.value)
    if (!row) return ''
    // Uma pasta só é "o diretório atual" quando está expandida (você navegou para dentro
    // dela). Uma pasta colapsada é tratada como qualquer outro item: o novo item nasce como
    // irmã dela (no pai), não dentro — senão criar vários itens na raiz fica impossível depois
    // do primeiro, porque o foco migra para o item recém-criado.
    if (row.entry.kind === 'directory' && row.isExpanded) return row.entry.path
    return parentOf(row.entry.path)
  }

  function openCreateNoteDialog() {
    dialog.value = { kind: 'create-note', path: defaultParentPath(), name: '' }
    errorMessage.value = null
  }

  function openCreateFolderDialog() {
    dialog.value = { kind: 'create-folder', path: defaultParentPath(), name: '' }
    errorMessage.value = null
  }

  function openRenameDialog(path?: string) {
    const target = path ?? focusedPath.value
    if (!target) return
    dialog.value = { kind: 'rename', path: target, name: target }
    errorMessage.value = null
  }

  function openDeleteDialog(path?: string) {
    const target = path ?? focusedPath.value
    if (!target) return
    dialog.value = {
      kind: 'delete',
      path: target,
      name: target.split('/').pop() ?? target,
    }
    errorMessage.value = null
  }

  function closeDialog() {
    dialog.value = CLOSED_DIALOG
    errorMessage.value = null
  }

  const createMutation = useMutation({
    mutationFn: async (vars: { path: string; kind: 'file' | 'directory' }) => {
      if (vars.kind === 'file') {
        await getStorageAdapter().writeFile(vars.path, '')
      } else {
        await getStorageAdapter().createDirectory(vars.path)
      }
    },
  })

  const renameMutation = useMutation({
    mutationFn: async (vars: { fromPath: string; toPath: string }) =>
      getStorageAdapter().rename(vars.fromPath, vars.toPath),
  })

  const deleteMutation = useMutation({
    mutationFn: async (path: string) => getStorageAdapter().deleteFile(path),
  })

  const isSubmitting = computed(
    () =>
      createMutation.isPending.value ||
      renameMutation.isPending.value ||
      deleteMutation.isPending.value,
  )

  async function submitCreate() {
    const isFolder = dialog.value.kind === 'create-folder'
    const parentPath = dialog.value.path
    const trimmed = dialog.value.name.trim()
    if (!trimmed) return
    const leafName = !isFolder && !trimmed.endsWith('.md') ? `${trimmed}.md` : trimmed
    const path = joinPath(parentPath, leafName)

    try {
      await createMutation.mutateAsync({ path, kind: isFolder ? 'directory' : 'file' })
      await queryClient.invalidateQueries({ queryKey: ['directory', parentPath] })
      expand(parentPath)
      closeDialog()
      focusRow(path)
      if (!isFolder) {
        notesStore.openNote(path)
      }
    } catch {
      errorMessage.value = isFolder
        ? 'Não foi possível criar a pasta. Tente outro nome.'
        : 'Não foi possível criar a nota. Tente outro nome.'
    }
  }

  function remapExpandedAndOpenTabs(fromPath: string, toPath: string) {
    const next = new Set<string>()
    for (const path of expandedPaths.value) {
      next.add(isWithin(path, fromPath) ? remapPath(path, fromPath, toPath) : path)
    }
    expandedPaths.value = next

    // Nem só a nota ativa: qualquer aba aberta em segundo plano dentro do caminho movido
    // também precisa apontar pro novo caminho, senão ela passa a referenciar um arquivo que
    // não existe mais.
    for (const path of [...openTabs.value]) {
      if (isWithin(path, fromPath)) {
        notesStore.renameTab(path, remapPath(path, fromPath, toPath))
      }
    }
  }

  async function moveEntry(fromPath: string, toPath: string) {
    await renameMutation.mutateAsync({ fromPath, toPath })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['directory', parentOf(fromPath)] }),
      queryClient.invalidateQueries({ queryKey: ['directory', parentOf(toPath)] }),
    ])
    remapExpandedAndOpenTabs(fromPath, toPath)
  }

  async function submitRename() {
    const fromPath = dialog.value.path
    const toPath = dialog.value.name.trim()
    if (!toPath || toPath === fromPath) {
      closeDialog()
      return
    }

    try {
      await moveEntry(fromPath, toPath)
      closeDialog()
      focusRow(toPath)
    } catch {
      errorMessage.value =
        'Não foi possível renomear/mover. Verifique o caminho informado.'
    }
  }

  // Reorganização via drag-and-drop. Interação só por mouse — o caminho equivalente por
  // teclado (F2 → editar caminho, ver submitRename acima) já cobre a mesma capacidade de
  // mover, então isso é um atalho adicional, não um fluxo novo sem alternativa por teclado.
  const draggedPath = ref<string | null>(null)
  const dragOverPath = ref<string | null>(null)

  // Dropar sobre uma pasta sempre move para dentro dela, esteja expandida ou não — diferente
  // do "onde criar por padrão" (defaultParentPath), aqui o alvo visual do drop é
  // inequívoco. Dropar sobre um arquivo move para o mesmo diretório desse arquivo (irmão).
  function dropTargetFor(row: FileTreeRow): string {
    return row.entry.kind === 'directory' ? row.entry.path : parentOf(row.entry.path)
  }

  function canDropInto(sourcePath: string, targetParentPath: string): boolean {
    if (isWithin(targetParentPath, sourcePath)) return false
    if (parentOf(sourcePath) === targetParentPath) return false
    return true
  }

  function handleDragStart(path: string) {
    draggedPath.value = path
  }

  function handleDragEnd() {
    draggedPath.value = null
    dragOverPath.value = null
  }

  function handleRowDragOver(event: DragEvent, row: FileTreeRow) {
    if (!draggedPath.value || !canDropInto(draggedPath.value, dropTargetFor(row))) return
    event.preventDefault()
    event.stopPropagation()
    dragOverPath.value = row.entry.path
  }

  function handleRowDragLeave(row: FileTreeRow) {
    if (dragOverPath.value === row.entry.path) dragOverPath.value = null
  }

  function handleRootDragOver(event: DragEvent) {
    if (!draggedPath.value || !canDropInto(draggedPath.value, '')) return
    event.preventDefault()
    dragOverPath.value = ''
  }

  async function performDrop(targetParentPath: string) {
    const sourcePath = draggedPath.value
    handleDragEnd()
    if (!sourcePath || !canDropInto(sourcePath, targetParentPath)) return

    const leafName = sourcePath.split('/').pop() ?? sourcePath
    const toPath = joinPath(targetParentPath, leafName)

    try {
      await moveEntry(sourcePath, toPath)
      focusRow(toPath)
    } catch {
      errorMessage.value =
        'Não foi possível mover. Verifique se já existe um item com esse nome no destino.'
    }
  }

  function handleRowDrop(event: DragEvent, row: FileTreeRow) {
    event.preventDefault()
    event.stopPropagation()
    void performDrop(dropTargetFor(row))
  }

  function handleRootDrop(event: DragEvent) {
    event.preventDefault()
    void performDrop('')
  }

  async function confirmDelete() {
    const path = dialog.value.path

    try {
      await deleteMutation.mutateAsync(path)
      await queryClient.invalidateQueries({ queryKey: ['directory', parentOf(path)] })

      const next = new Set(expandedPaths.value)
      for (const p of next) {
        if (isWithin(p, path)) next.delete(p)
      }
      expandedPaths.value = next

      // Fecha toda aba aberta dentro da pasta/arquivo apagado, não só a nota ativa — uma aba em
      // segundo plano também ficaria apontando pra um arquivo que não existe mais.
      for (const openPath of [...openTabs.value]) {
        if (isWithin(openPath, path)) {
          notesStore.closeTab(openPath)
        }
      }
      closeDialog()
    } catch {
      errorMessage.value = 'Não foi possível excluir.'
    }
  }

  async function submitDialog() {
    if (dialog.value.kind === 'create-note' || dialog.value.kind === 'create-folder') {
      await submitCreate()
    } else if (dialog.value.kind === 'rename') {
      await submitRename()
    } else if (dialog.value.kind === 'delete') {
      await confirmDelete()
    }
  }

  const isDialogOpen = computed(() => dialog.value.kind !== 'closed')
  const isCreateDialog = computed(
    () => dialog.value.kind === 'create-note' || dialog.value.kind === 'create-folder',
  )
  const isRenameDialog = computed(() => dialog.value.kind === 'rename')
  const isDeleteDialog = computed(() => dialog.value.kind === 'delete')
  const dialogTitle = computed(() => {
    switch (dialog.value.kind) {
      case 'create-note':
        return 'Nova nota'
      case 'create-folder':
        return 'Nova pasta'
      case 'rename':
        return 'Renomear ou mover'
      case 'delete':
        return 'Excluir'
      default:
        return ''
    }
  })
  const dialogDescription = computed(() => {
    switch (dialog.value.kind) {
      case 'create-note':
        return 'Escolha um nome para a nova nota Markdown.'
      case 'create-folder':
        return 'Escolha um nome para a nova pasta.'
      case 'rename':
        return 'Edite o caminho para renomear ou mover o item.'
      case 'delete':
        return 'Confirme a exclusão permanente do item.'
      default:
        return ''
    }
  })

  function handleDialogOpenChange(open: boolean) {
    if (!open) closeDialog()
  }

  function handleTreeKeydown(event: KeyboardEvent) {
    const currentIndex = rows.value.findIndex(
      (row) => row.entry.path === focusedPath.value,
    )
    if (currentIndex === -1) return
    const currentRow = rows.value[currentIndex]

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        const next = rows.value[currentIndex + 1]
        if (next) focusRow(next.entry.path)
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        const prev = rows.value[currentIndex - 1]
        if (prev) focusRow(prev.entry.path)
        break
      }
      case 'ArrowRight': {
        event.preventDefault()
        if (currentRow.entry.kind === 'directory') {
          if (!currentRow.isExpanded) {
            expand(currentRow.entry.path)
          } else {
            const next = rows.value[currentIndex + 1]
            if (next) focusRow(next.entry.path)
          }
        }
        break
      }
      case 'ArrowLeft': {
        event.preventDefault()
        if (currentRow.entry.kind === 'directory' && currentRow.isExpanded) {
          collapse(currentRow.entry.path)
        } else {
          const parentPath = parentOf(currentRow.entry.path)
          if (parentPath) focusRow(parentPath)
        }
        break
      }
      case 'Enter': {
        event.preventDefault()
        activateRow(currentRow)
        break
      }
      case 'F2': {
        event.preventDefault()
        openRenameDialog(currentRow.entry.path)
        break
      }
      case 'Delete': {
        event.preventDefault()
        openDeleteDialog(currentRow.entry.path)
        break
      }
      case 'n': {
        event.preventDefault()
        openCreateNoteDialog()
        break
      }
      case 'N': {
        if (event.shiftKey) {
          event.preventDefault()
          openCreateFolderDialog()
        }
        break
      }
    }
  }

  return {
    rows,
    focusedPath,
    isRootLoading,
    isRootEmpty,
    errorMessage,
    registerRowEl,
    activateRow,
    handleTreeKeydown,
    openCreateNoteDialog,
    openCreateFolderDialog,
    openRenameDialog,
    openDeleteDialog,
    dialog,
    isDialogOpen,
    isCreateDialog,
    isRenameDialog,
    isDeleteDialog,
    dialogTitle,
    dialogDescription,
    isSubmitting,
    submitDialog,
    handleDialogOpenChange,
    dragOverPath,
    handleDragStart,
    handleDragEnd,
    handleRowDragOver,
    handleRowDragLeave,
    handleRowDrop,
    handleRootDragOver,
    handleRootDrop,
  }
}
