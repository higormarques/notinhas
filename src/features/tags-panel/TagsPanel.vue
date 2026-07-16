<script setup lang="ts">
import { ChevronLeft, Tag as TagIcon } from '@lucide/vue'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { useTagsPanel } from './useTagsPanel'

const {
  tags,
  selectedTag,
  notesForSelectedTag,
  focusedKey,
  indexStatus,
  registerRowEl,
  selectTag,
  clearSelectedTag,
  openNote,
  handleKeydown,
} = useTagsPanel()
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div v-if="selectedTag" class="flex shrink-0 items-center gap-1 border-b pb-2">
      <Button variant="ghost" size="sm" aria-label="Voltar para a lista de tags" @click="clearSelectedTag">
        <ChevronLeft class="size-4" />
      </Button>
      <Badge variant="secondary">#{{ selectedTag }}</Badge>
    </div>

    <p v-if="indexStatus === 'building'" class="p-2 text-sm text-muted-foreground">
      Construindo índice de tags…
    </p>
    <p v-else-if="!selectedTag && tags.length === 0" class="p-2 text-sm text-muted-foreground">
      Nenhuma tag ainda. Use <code>#tag</code> no corpo de uma nota para criar uma.
    </p>
    <p
      v-else-if="selectedTag && notesForSelectedTag.length === 0"
      class="p-2 text-sm text-muted-foreground"
    >
      Nenhuma nota com esta tag.
    </p>

    <ul
      v-else
      role="listbox"
      :aria-label="selectedTag ? `Notas com a tag ${selectedTag}` : 'Tags'"
      class="flex-1 overflow-auto"
    >
      <template v-if="!selectedTag">
        <li v-for="tagCount in tags" :key="`tag:${tagCount.tag}`" role="none">
          <div
            :ref="(el) => registerRowEl(`tag:${tagCount.tag}`, el as Element | null)"
            role="option"
            :aria-selected="`tag:${tagCount.tag}` === focusedKey"
            :tabindex="`tag:${tagCount.tag}` === focusedKey ? 0 : -1"
            class="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            @click="selectTag(tagCount.tag)"
            @keydown="handleKeydown"
          >
            <TagIcon class="size-4 shrink-0" />
            <span class="truncate">{{ tagCount.tag }}</span>
            <Badge variant="secondary" class="ml-auto">{{ tagCount.count }}</Badge>
          </div>
        </li>
      </template>
      <template v-else>
        <li v-for="entry in notesForSelectedTag" :key="`note:${entry.path}`" role="none">
          <div
            :ref="(el) => registerRowEl(`note:${entry.path}`, el as Element | null)"
            role="option"
            :aria-selected="`note:${entry.path}` === focusedKey"
            :tabindex="`note:${entry.path}` === focusedKey ? 0 : -1"
            class="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            @click="openNote(entry.path)"
            @keydown="handleKeydown"
          >
            <span class="truncate">{{ entry.title }}</span>
          </div>
        </li>
      </template>
    </ul>
  </div>
</template>
