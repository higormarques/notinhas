<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import {
  Bold,
  ChevronDown,
  ChevronUp,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Redo2,
  Search,
  Strikethrough,
  Table2,
  Undo2,
  X,
} from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Toggle } from '@/shared/ui/toggle'
import { useNoteEditor } from './useNoteEditor'

const {
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
} = useNoteEditor()
</script>

<template>
  <div class="flex h-full flex-col">
    <p v-if="isEmptyState" class="p-4 text-sm text-muted-foreground">
      Selecione uma nota para editar.
    </p>
    <p v-else-if="isLoading" class="p-4 text-sm text-muted-foreground">Carregando…</p>
    <div v-else class="flex h-full flex-col gap-2 p-2">
      <div class="flex shrink-0 items-center justify-between px-1">
        <h2 class="truncate text-sm font-medium">{{ noteName }}</h2>
        <span class="text-xs text-muted-foreground" aria-live="polite">
          <template v-if="isReadOnly">Nota protegida — somente leitura</template>
          <template v-else-if="saveStatus === 'saving'">Salvando…</template>
          <template v-else-if="saveStatus === 'saved'">Salvo</template>
          <template v-else-if="saveStatus === 'error'">Erro ao salvar</template>
        </span>
      </div>

      <div
        v-if="!isReadOnly"
        class="flex shrink-0 flex-wrap items-center gap-1 border-b pb-2"
        role="toolbar"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Desfazer"
          :disabled="!canUndo"
          @click="undo"
        >
          <Undo2 class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refazer"
          :disabled="!canRedo"
          @click="redo"
        >
          <Redo2 class="size-4" />
        </Button>

        <div class="mx-1 h-5 w-px bg-border" />

        <Toggle
          :model-value="activeHeadingLevel === 1"
          size="sm"
          aria-label="Título 1"
          @update:model-value="toggleHeading(1)"
        >
          <Heading1 class="size-4" />
        </Toggle>
        <Toggle
          :model-value="activeHeadingLevel === 2"
          size="sm"
          aria-label="Título 2"
          @update:model-value="toggleHeading(2)"
        >
          <Heading2 class="size-4" />
        </Toggle>
        <Toggle
          :model-value="activeHeadingLevel === 3"
          size="sm"
          aria-label="Título 3"
          @update:model-value="toggleHeading(3)"
        >
          <Heading3 class="size-4" />
        </Toggle>

        <div class="mx-1 h-5 w-px bg-border" />

        <Toggle
          :model-value="isBoldActive"
          size="sm"
          aria-label="Negrito"
          @update:model-value="toggleBold"
        >
          <Bold class="size-4" />
        </Toggle>
        <Toggle
          :model-value="isItalicActive"
          size="sm"
          aria-label="Itálico"
          @update:model-value="toggleItalic"
        >
          <Italic class="size-4" />
        </Toggle>
        <Toggle
          :model-value="isStrikeActive"
          size="sm"
          aria-label="Tachado"
          @update:model-value="toggleStrike"
        >
          <Strikethrough class="size-4" />
        </Toggle>
        <Toggle
          :model-value="isCodeActive"
          size="sm"
          aria-label="Código inline"
          @update:model-value="toggleCode"
        >
          <Code class="size-4" />
        </Toggle>

        <div class="mx-1 h-5 w-px bg-border" />

        <Toggle
          :model-value="isBulletListActive"
          size="sm"
          aria-label="Lista com marcadores"
          @update:model-value="toggleBulletList"
        >
          <List class="size-4" />
        </Toggle>
        <Toggle
          :model-value="isOrderedListActive"
          size="sm"
          aria-label="Lista numerada"
          @update:model-value="toggleOrderedList"
        >
          <ListOrdered class="size-4" />
        </Toggle>
        <Toggle
          :model-value="isTaskListActive"
          size="sm"
          aria-label="Lista de tarefas"
          @update:model-value="toggleTaskList"
        >
          <ListTodo class="size-4" />
        </Toggle>
        <Toggle
          :model-value="isBlockquoteActive"
          size="sm"
          aria-label="Citação"
          @update:model-value="toggleBlockquote"
        >
          <Quote class="size-4" />
        </Toggle>
        <Toggle
          :model-value="isCodeBlockActive"
          size="sm"
          aria-label="Bloco de código"
          @update:model-value="toggleCodeBlock"
        >
          <Code class="size-4" />
        </Toggle>

        <div class="mx-1 h-5 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          aria-label="Inserir tabela"
          @click="insertTable"
        >
          <Table2 class="size-4" />
        </Button>

        <div class="mx-1 h-5 w-px bg-border" />

        <Button variant="ghost" size="icon" aria-label="Buscar na nota" @click="openFind">
          <Search class="size-4" />
        </Button>
      </div>

      <div
        v-if="isFindOpen"
        class="flex shrink-0 items-center gap-2 rounded border bg-muted/40 p-2"
      >
        <label for="note-editor-find-input" class="sr-only">Termo de busca</label>
        <Input
          id="note-editor-find-input"
          v-model="findQuery"
          autofocus
          placeholder="Buscar…"
          class="h-8 flex-1"
          @keydown.enter.prevent="findNext"
          @keydown.escape.prevent="closeFind"
        />
        <span class="whitespace-nowrap text-xs text-muted-foreground" aria-live="polite">
          {{
            findMatchCount > 0
              ? `${findActiveIndex + 1}/${findMatchCount}`
              : 'Nenhum resultado'
          }}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Resultado anterior"
          :disabled="findMatchCount === 0"
          @click="findPrevious"
        >
          <ChevronUp class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Próximo resultado"
          :disabled="findMatchCount === 0"
          @click="findNext"
        >
          <ChevronDown class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Fechar busca" @click="closeFind">
          <X class="size-4" />
        </Button>
      </div>

      <EditorContent :editor="editor" class="min-h-0 flex-1 overflow-auto" />
    </div>
  </div>
</template>

<style>
.note-editor-content {
  outline: none;
  min-height: 100%;
  padding: 0.5rem 0.25rem;
}

.note-editor-content h1,
.note-editor-content h2,
.note-editor-content h3 {
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.25;
}

.note-editor-content h1 {
  font-size: 1.5em;
}
.note-editor-content h2 {
  font-size: 1.25em;
}
.note-editor-content h3 {
  font-size: 1.1em;
}

.note-editor-content p {
  margin: 0.5em 0;
}

.note-editor-content ul,
.note-editor-content ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.note-editor-content ul[data-type='taskList'] {
  list-style: none;
  padding-left: 0.5em;
}

.note-editor-content ul[data-type='taskList'] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}

.note-editor-content ul[data-type='taskList'] li > label {
  display: flex;
  align-items: center;
  margin-top: 0.2em;
  user-select: none;
}

.note-editor-content ul[data-type='taskList'] li > div {
  flex: 1 1 auto;
  min-width: 0;
}

.note-editor-content ul[data-type='taskList'] li > div > p {
  margin: 0;
}

.note-editor-content ul[data-type='taskList'] li input[type='checkbox'] {
  margin: 0;
  cursor: pointer;
}

.note-editor-content blockquote {
  border-left: 3px solid var(--border);
  padding-left: 1em;
  margin: 0.5em 0;
  color: var(--muted-foreground);
}

.note-editor-content pre {
  background: var(--muted);
  border-radius: 0.375rem;
  padding: 0.75em 1em;
  overflow-x: auto;
  font-family: monospace;
  margin: 0.5em 0;
}

.note-editor-content code {
  font-family: monospace;
  font-size: 0.9em;
}

.note-editor-content pre code {
  background: none;
  padding: 0;
}

.note-editor-content table {
  border-collapse: collapse;
  margin: 0.5em 0;
  width: 100%;
}

.note-editor-content th,
.note-editor-content td {
  border: 1px solid var(--border);
  padding: 0.375em 0.5em;
  text-align: left;
}

.note-editor-content th {
  background: var(--muted);
  font-weight: 600;
}

.note-search-match {
  background-color: color-mix(in srgb, yellow 40%, transparent);
}

.note-search-match-active {
  background-color: color-mix(in srgb, orange 55%, transparent);
}

.note-tag {
  color: var(--accent-foreground);
  background-color: color-mix(in srgb, var(--accent) 60%, transparent);
  border-radius: 0.25em;
  padding: 0 0.2em;
}

.note-doclink {
  border-radius: 0.25em;
  padding: 0 0.2em;
  cursor: pointer;
}

.note-doclink-resolved {
  color: var(--primary);
  background-color: color-mix(in srgb, var(--primary) 12%, transparent);
  text-decoration: underline;
}

.note-doclink-unresolved {
  color: var(--muted-foreground);
  border-bottom: 1px dashed var(--muted-foreground);
  cursor: default;
}

.note-doclink-suggestion-popup {
  z-index: 50;
  min-width: 12rem;
  max-height: 15rem;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--popover);
  color: var(--popover-foreground);
  box-shadow: 0 4px 12px color-mix(in srgb, black 15%, transparent);
  padding: 0.25rem;
}

.note-doclink-suggestion-item {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.note-doclink-suggestion-item.is-selected {
  background: var(--accent);
  color: var(--accent-foreground);
}

.note-doclink-suggestion-empty {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}
</style>
