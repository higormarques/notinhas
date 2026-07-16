<script setup lang="ts">
import { useBacklinksPanel } from './useBacklinksPanel'

const { backlinks, isEmptyState, focusedPath, registerRowEl, openNote, handleKeydown } =
  useBacklinksPanel()
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <p v-if="isEmptyState" class="p-2 text-sm text-muted-foreground">
      Selecione uma nota para ver os backlinks.
    </p>
    <p v-else-if="backlinks.length === 0" class="p-2 text-sm text-muted-foreground">
      Nenhuma nota linka para esta.
    </p>
    <ul
      v-else
      role="listbox"
      aria-label="Notas que linkam para esta"
      class="flex-1 overflow-auto"
    >
      <li v-for="entry in backlinks" :key="entry.path" role="none">
        <div
          :ref="(el) => registerRowEl(entry.path, el as Element | null)"
          role="option"
          :aria-selected="entry.path === focusedPath"
          :tabindex="entry.path === focusedPath ? 0 : -1"
          class="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          @click="openNote(entry.path)"
          @keydown="handleKeydown"
        >
          <span class="truncate">{{ entry.title }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>
