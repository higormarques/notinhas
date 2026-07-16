import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import { Markdown } from '@tiptap/markdown'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useNotesStore } from '@/shared/stores/notes'
import { useShortcuts } from '@/shared/composables/useShortcuts'
import { parseFrontmatter, serializeNote, stampTimestamps, type Frontmatter } from '@/entities/Frontmatter'
import { resolveDocLinkTarget, unescapeDocLinkMarkdown } from '@/entities/DocLink'
import { HELP_NOTE_PATH } from '@/entities/HelpNote'
import { buildTitleIndex, ensureIndexReady, titleFromPath } from '@/shared/search/searchIndex'
import { FindInNote } from './findInNoteExtension'
import { TagHighlight } from './tagHighlightExtension'
import { DocLink } from './docLinkExtension'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DEBOUNCE_MS = 300
const FIND_SHORTCUT_ID = 'note-editor:find'
const HEADING_LEVELS = [1, 2, 3] as const
const lowlight = createLowlight(common)

export function useNoteEditor() {
  const notesStore = useNotesStore()
  const { activeNotePath } = storeToRefs(notesStore)
  const { register, unregister } = useShortcuts()

  const content = ref('')
  // Frontmatter da nota ativa, separado do corpo antes de entrar no editor (ver watcher de
  // `fileQuery.data` abaixo) e recomposto a cada autosave (`flushAutosave`). Local à composable —
  // não exposto no retorno, já que o painel de Propriedades (`note-properties`) faz seu próprio
  // ciclo independente de leitura/escrita (ver ADR 0006 sobre a reconciliação entre os dois).
  const frontmatter = ref<Frontmatter>({})
  const saveStatus = ref<SaveStatus>('idle')
  const updateTick = ref(0)
  const isFindOpen = ref(false)
  const findQuery = ref('')
  let lastSavedContent = ''
  let lastSavedPath: string | null = null
  let suppressAutosave = false
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  const fileQuery = useQuery({
    queryKey: computed(() => ['file', activeNotePath.value] as const),
    queryFn: async () => {
      const path = activeNotePath.value
      if (!path) throw new Error('Nenhuma nota ativa.')
      return getStorageAdapter().readFile(path)
    },
    enabled: computed(() => activeNotePath.value !== null),
  })

  const saveMutation = useMutation({
    mutationFn: (vars: { path: string; content: string }) =>
      getStorageAdapter().writeFile(vars.path, vars.content),
  })

  function clearAutosaveTimer(): void {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
  }

  /** Salva imediatamente, sempre para o `path`/`value` recebidos como parâmetro — nunca lidos de
   * `activeNotePath`/`content` no momento em que a função roda. Chamada tanto pelo timer de
   * debounce quanto ao trocar de nota (`watch(activeNotePath, ...)` abaixo), justamente para não
   * reintroduzir o bug que motivou esse desenho: ler `activeNotePath.value` só na hora de
   * escrever permitia que uma edição pendente da nota A fosse gravada no arquivo da nota B se o
   * usuário trocasse de nota antes do debounce dessa edição disparar. */
  async function flushAutosave(path: string, value: string): Promise<void> {
    clearAutosaveTimer()
    if (value === lastSavedContent && path === lastSavedPath) return
    saveStatus.value = 'saving'
    try {
      // Recompõe frontmatter+corpo antes de gravar: `atualizado` é sempre re-carimbado, `criado`
      // só na primeira vez. Não há lock com o painel de Propriedades escrevendo o mesmo arquivo
      // em paralelo — limitação aceita, documentada na ADR 0006 (mesma filosofia de eventual
      // consistency via refetch já aceita pela ADR 0004, apropriada para app local-first de
      // usuário único).
      const stamped = stampTimestamps(frontmatter.value, new Date())
      const fullContent = serializeNote(stamped, value)
      await saveMutation.mutateAsync({ path, content: fullContent })
      frontmatter.value = stamped
      lastSavedContent = value
      lastSavedPath = path
      saveStatus.value = 'saved'
    } catch {
      saveStatus.value = 'error'
    }
  }

  function scheduleAutosave(path: string, value: string): void {
    clearAutosaveTimer()
    autosaveTimer = setTimeout(() => {
      void flushAutosave(path, value)
    }, AUTOSAVE_DEBOUNCE_MS)
  }

  function resolveTarget(target: string): string | null {
    return resolveDocLinkTarget(target, buildTitleIndex())
  }

  async function getSuggestions(query: string): Promise<string[]> {
    // `await` aqui (em vez de fire-and-forget) importa: na primeira vez que o usuário digita
    // `[[` numa sessão, o índice pode ainda não estar construído — sem esperar, `items()` do
    // `@tiptap/suggestion` veria sempre uma lista vazia nessa primeira vez, mesmo com notas
    // existentes. `@tiptap/suggestion` já suporta `items` assíncrono nativamente.
    await ensureIndexReady(getStorageAdapter())
    const lowerQuery = query.trim().toLowerCase()
    const ownPath = activeNotePath.value
    return Array.from(buildTitleIndex().entries())
      .filter(([lowerTitle, path]) => path !== ownPath && lowerTitle.includes(lowerQuery))
      .map(([, path]) => titleFromPath(path))
      .sort()
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, heading: { levels: [...HEADING_LEVELS] } }),
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Markdown,
      FindInNote,
      TagHighlight,
      DocLink.configure({
        resolveTarget,
        onNavigate: (path) => notesStore.openNote(path),
        getSuggestions,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Conteúdo da nota',
        'aria-multiline': 'true',
        class: 'note-editor-content',
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (suppressAutosave) return
      const path = activeNotePath.value
      // `getMarkdown()` faz backslash-escape de colchetes duplos (`\[\[`/`\]\]`) — desfeito aqui
      // para que `[[Nota]]` sobreviva ao autosave como texto literal (ver `DocLink.ts`).
      const value = unescapeDocLinkMarkdown(instance.getMarkdown())
      content.value = value
      // A nota de ajuda nunca é salva de volta — `editable: false` (ver `watch(activeNotePath,
      // ...)` abaixo) já bloqueia edição via teclado/mouse, isto aqui é defesa extra contra
      // qualquer comando disparado programaticamente (a toolbar já fica escondida pra ela).
      if (path && path !== HELP_NOTE_PATH) scheduleAutosave(path, value)
    },
    onTransaction: () => {
      updateTick.value += 1
    },
  })

  // Troca de nota: dispara qualquer autosave pendente imediatamente (para o path antigo, nunca
  // esperando o debounce natural, que já poderia estar rodando com o path novo por engano) e
  // limpa o editor na hora — sem isso, o conteúdo da nota anterior continua na tela até o
  // `fileQuery` da nota nova resolver, mesmo já tendo "trocado" de nota.
  watch(activeNotePath, (newPath, oldPath) => {
    if (oldPath && autosaveTimer !== null) {
      void flushAutosave(oldPath, content.value)
    }
    if (newPath !== oldPath) {
      suppressAutosave = true
      editor.value?.commands.setContent('', { emitUpdate: false })
      suppressAutosave = false
      content.value = ''
    }
  })

  // Separado do watch acima (não pode reaproveitar o mesmo callback): `useEditor()` só cria a
  // instância dentro de `onMounted`, então no primeiro disparo (síncrono, durante o setup)
  // `editor.value` ainda é `undefined` — um `watch(activeNotePath, ..., { immediate: true })`
  // perderia esse primeiro `setEditable` silenciosamente. `watchEffect` reconecta as duas
  // dependências (`editor.value` e `activeNotePath.value`) e roda de novo assim que o editor
  // fica disponível, cobrindo tanto "nota de ajuda já ativa no mount" quanto trocas de nota
  // subsequentes. A nota de ajuda pertence ao core do app — fica read-only, sem depender só da
  // toolbar escondida (ver `NoteEditor.vue`) pra impedir edição.
  watchEffect(() => {
    editor.value?.setEditable(activeNotePath.value !== HELP_NOTE_PATH, false)
  })

  watch(
    [() => fileQuery.data.value, editor],
    ([data, editorInstance]) => {
      if (data === undefined || !editorInstance) return
      const { frontmatter: parsedFrontmatter, body } = parseFrontmatter(data)
      frontmatter.value = parsedFrontmatter
      suppressAutosave = true
      editorInstance.commands.setContent(body, { contentType: 'markdown', emitUpdate: false })
      suppressAutosave = false
      content.value = body
      lastSavedContent = body
      lastSavedPath = activeNotePath.value
      saveStatus.value = 'idle'
    },
    { immediate: true },
  )

  function isActive(name: string, attrs?: Record<string, unknown>): boolean {
    void updateTick.value
    return editor.value?.isActive(name, attrs) ?? false
  }

  const isBoldActive = computed(() => isActive('bold'))
  const isItalicActive = computed(() => isActive('italic'))
  const isStrikeActive = computed(() => isActive('strike'))
  const isCodeActive = computed(() => isActive('code'))
  const isBlockquoteActive = computed(() => isActive('blockquote'))
  const isCodeBlockActive = computed(() => isActive('codeBlock'))
  const isBulletListActive = computed(() => isActive('bulletList'))
  const isOrderedListActive = computed(() => isActive('orderedList'))
  const isTaskListActive = computed(() => isActive('taskList'))
  const activeHeadingLevel = computed(() => {
    void updateTick.value
    return HEADING_LEVELS.find((level) => editor.value?.isActive('heading', { level }) ?? false) ?? null
  })
  const canUndo = computed(() => {
    void updateTick.value
    return editor.value?.can().undo() ?? false
  })
  const canRedo = computed(() => {
    void updateTick.value
    return editor.value?.can().redo() ?? false
  })

  function toggleBold() {
    editor.value?.chain().focus().toggleBold().run()
  }
  function toggleItalic() {
    editor.value?.chain().focus().toggleItalic().run()
  }
  function toggleStrike() {
    editor.value?.chain().focus().toggleStrike().run()
  }
  function toggleCode() {
    editor.value?.chain().focus().toggleCode().run()
  }
  function toggleHeading(level: (typeof HEADING_LEVELS)[number]) {
    editor.value?.chain().focus().toggleHeading({ level }).run()
  }
  function toggleBlockquote() {
    editor.value?.chain().focus().toggleBlockquote().run()
  }
  function toggleCodeBlock() {
    editor.value?.chain().focus().toggleCodeBlock().run()
  }
  function toggleBulletList() {
    editor.value?.chain().focus().toggleBulletList().run()
  }
  function toggleOrderedList() {
    editor.value?.chain().focus().toggleOrderedList().run()
  }
  function toggleTaskList() {
    editor.value?.chain().focus().toggleTaskList().run()
  }
  function insertTable() {
    editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }
  function undo() {
    editor.value?.chain().focus().undo().run()
  }
  function redo() {
    editor.value?.chain().focus().redo().run()
  }

  const findMatchCount = computed(() => {
    void updateTick.value
    return editor.value?.storage.findInNote.results.length ?? 0
  })
  const findActiveIndex = computed(() => {
    void updateTick.value
    return editor.value?.storage.findInNote.activeIndex ?? -1
  })

  function openFind() {
    isFindOpen.value = true
  }
  function closeFind() {
    isFindOpen.value = false
    findQuery.value = ''
    editor.value?.commands.clearSearchTerm()
    editor.value?.commands.focus()
  }
  function findNext() {
    editor.value?.commands.goToSearchResult('next')
  }
  function findPrevious() {
    editor.value?.commands.goToSearchResult('previous')
  }

  watch(findQuery, (query) => {
    editor.value?.commands.setSearchTerm(query)
  })

  register({
    id: FIND_SHORTCUT_ID,
    keys: 'mod+f',
    description: 'Buscar dentro da nota',
    handler: () => {
      if (!editor.value || isEmptyState.value) return
      openFind()
    },
  })

  onBeforeUnmount(() => {
    unregister(FIND_SHORTCUT_ID)
    const path = activeNotePath.value
    if (path && autosaveTimer !== null) {
      void flushAutosave(path, content.value)
    } else {
      clearAutosaveTimer()
    }
  })

  const noteName = computed(() => activeNotePath.value?.split('/').pop() ?? '')
  const isEmptyState = computed(() => activeNotePath.value === null)
  const isLoading = computed(() => fileQuery.isLoading.value)
  const isReadOnly = computed(() => activeNotePath.value === HELP_NOTE_PATH)

  return {
    editor,
    saveStatus,
    noteName,
    isEmptyState,
    isLoading,
    isReadOnly,
    isBoldActive,
    isItalicActive,
    isStrikeActive,
    isCodeActive,
    isBlockquoteActive,
    isCodeBlockActive,
    isBulletListActive,
    isOrderedListActive,
    isTaskListActive,
    activeHeadingLevel,
    canUndo,
    canRedo,
    toggleBold,
    toggleItalic,
    toggleStrike,
    toggleCode,
    toggleHeading,
    toggleBlockquote,
    toggleCodeBlock,
    toggleBulletList,
    toggleOrderedList,
    toggleTaskList,
    insertTable,
    undo,
    redo,
    isFindOpen,
    findQuery,
    findMatchCount,
    findActiveIndex,
    openFind,
    closeFind,
    findNext,
    findPrevious,
  }
}
