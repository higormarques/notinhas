<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { ListboxContent, ListboxFilter, ListboxItem, ListboxRoot } from 'reka-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { InputGroup, InputGroupAddon } from '@/shared/ui/input-group'
import { useSearch } from './useSearch'

const { isOpen, handleOpenChange, query, results, isBuildingIndex, showEmptyState, selectResult } =
  useSearch()
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0" :show-close-button="false">
      <DialogHeader class="sr-only">
        <DialogTitle>Buscar em notas</DialogTitle>
        <DialogDescription>Busque por título ou conteúdo em todas as notas</DialogDescription>
      </DialogHeader>

      <ListboxRoot highlight-on-hover class="flex size-full flex-col overflow-hidden p-1">
        <div class="p-1 pb-0">
          <InputGroup
            class="bg-input/30 border-input/30 h-8! rounded-lg! shadow-none! *:data-[slot=input-group-addon]:pl-2!"
          >
            <ListboxFilter
              v-model="query"
              auto-focus
              placeholder="Buscar por título ou conteúdo..."
              aria-label="Buscar por título ou conteúdo em todas as notas"
              class="w-full text-sm outline-hidden"
            />
            <InputGroupAddon>
              <SearchIcon class="size-4 shrink-0 opacity-50" />
            </InputGroupAddon>
          </InputGroup>
        </div>

        <ListboxContent class="no-scrollbar mt-1 max-h-80 overflow-x-hidden overflow-y-auto outline-none">
          <p v-if="isBuildingIndex" class="px-3 py-6 text-center text-sm text-muted-foreground">
            Construindo índice de busca…
          </p>
          <p v-else-if="showEmptyState" class="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhum resultado encontrado.
          </p>
          <ListboxItem
            v-for="result in results"
            :key="result.path"
            :value="result.path"
            class="data-highlighted:bg-muted data-highlighted:text-foreground relative m-1 flex cursor-default flex-col gap-0.5 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
            @select="selectResult(result.path)"
          >
            <span class="truncate font-medium">{{ result.title }}</span>
            <span class="truncate text-xs text-muted-foreground">{{ result.snippet }}</span>
          </ListboxItem>
        </ListboxContent>
      </ListboxRoot>
    </DialogContent>
  </Dialog>
</template>
