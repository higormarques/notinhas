<script setup lang="ts">
import { X } from '@lucide/vue'
import { useNoteTabs } from './useNoteTabs'

const {
  tabs,
  hasTabs,
  focusedPath,
  registerTabEl,
  activateTab,
  closeTab,
  handleTabsKeydown,
} = useNoteTabs()
</script>

<template>
  <div
    v-if="hasTabs"
    role="tablist"
    aria-label="Notas abertas"
    class="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-muted/30 px-1"
    @keydown="handleTabsKeydown"
  >
    <div
      v-for="tab in tabs"
      :key="tab.path"
      :ref="(el) => registerTabEl(tab.path, el as Element | null)"
      role="tab"
      :aria-selected="tab.isActive"
      :aria-label="tab.title"
      :tabindex="tab.path === focusedPath ? 0 : -1"
      class="group flex max-w-48 shrink-0 cursor-pointer items-center gap-1 rounded-t px-2 py-1.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      :class="
        tab.isActive
          ? 'bg-background font-medium text-foreground'
          : 'text-muted-foreground'
      "
      @click="activateTab(tab.path)"
    >
      <span class="truncate">{{ tab.title }}</span>
      <button
        type="button"
        tabindex="-1"
        :aria-label="`Fechar ${tab.title}`"
        class="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 hover:bg-accent-foreground/10"
        :class="{ 'opacity-100': tab.isActive }"
        @click.stop="closeTab(tab.path)"
      >
        <X class="size-3" />
      </button>
    </div>
  </div>
</template>
