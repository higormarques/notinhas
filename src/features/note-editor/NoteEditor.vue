<script setup lang="ts">
import { Textarea } from '@/shared/ui/textarea'
import { useNoteEditor } from './useNoteEditor'

const { content, saveStatus, noteName, isEmptyState, isLoading } = useNoteEditor()
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
          <template v-if="saveStatus === 'saving'">Salvando…</template>
          <template v-else-if="saveStatus === 'saved'">Salvo</template>
          <template v-else-if="saveStatus === 'error'">Erro ao salvar</template>
        </span>
      </div>
      <label for="note-editor-textarea" class="sr-only">Conteúdo da nota</label>
      <Textarea
        id="note-editor-textarea"
        v-model="content"
        class="h-full flex-1 resize-none font-mono"
        placeholder="Comece a escrever…"
      />
    </div>
  </div>
</template>
