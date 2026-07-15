import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { watchDebounced } from '@vueuse/core'
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
import { FindInNote } from './findInNoteExtension'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DEBOUNCE_MS = 600
const FIND_SHORTCUT_ID = 'note-editor:find'
const HEADING_LEVELS = [1, 2, 3] as const
const lowlight = createLowlight(common)

export function useNoteEditor() {
  const notesStore = useNotesStore()
  const { activeNotePath } = storeToRefs(notesStore)
  const { register, unregister } = useShortcuts()

  const content = ref('')
  const saveStatus = ref<SaveStatus>('idle')
  const updateTick = ref(0)
  const isFindOpen = ref(false)
  const findQuery = ref('')
  let lastSavedContent = ''
  let suppressAutosave = false

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, heading: { levels: [...HEADING_LEVELS] } }),
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Markdown,
      FindInNote,
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
      content.value = instance.getMarkdown()
    },
    onTransaction: () => {
      updateTick.value += 1
    },
  })

  watch(
    [() => fileQuery.data.value, editor],
    ([data, editorInstance]) => {
      if (data === undefined || !editorInstance) return
      suppressAutosave = true
      editorInstance.commands.setContent(data, { contentType: 'markdown', emitUpdate: false })
      suppressAutosave = false
      content.value = data
      lastSavedContent = data
      saveStatus.value = 'idle'
    },
    { immediate: true },
  )

  watchDebounced(
    content,
    async (value) => {
      const path = activeNotePath.value
      if (!path || value === lastSavedContent) return
      saveStatus.value = 'saving'
      try {
        await saveMutation.mutateAsync({ path, content: value })
        lastSavedContent = value
        saveStatus.value = 'saved'
      } catch {
        saveStatus.value = 'error'
      }
    },
    { debounce: AUTOSAVE_DEBOUNCE_MS },
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
  })

  const noteName = computed(() => activeNotePath.value?.split('/').pop() ?? '')
  const isEmptyState = computed(() => activeNotePath.value === null)
  const isLoading = computed(() => fileQuery.isLoading.value)

  return {
    editor,
    saveStatus,
    noteName,
    isEmptyState,
    isLoading,
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
