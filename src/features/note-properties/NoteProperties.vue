<script setup lang="ts">
import { X } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useNoteProperties } from './useNoteProperties'

const {
  isEmptyState,
  criado,
  atualizado,
  customEntries,
  newKey,
  newValue,
  addProperty,
  updateProperty,
  removeProperty,
} = useNoteProperties()
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-auto p-2">
    <p v-if="isEmptyState" class="p-2 text-sm text-muted-foreground">
      Selecione uma nota para ver suas propriedades.
    </p>
    <template v-else>
      <dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
        <dt class="text-muted-foreground">Criado</dt>
        <dd class="truncate" :title="criado ?? undefined">
          {{ criado ?? '—' }}
        </dd>
        <dt class="text-muted-foreground">Atualizado</dt>
        <dd class="truncate" :title="atualizado ?? undefined">
          {{ atualizado ?? '—' }}
        </dd>
      </dl>
      <p class="text-xs text-muted-foreground">
        "Criado" reflete a primeira vez que o notinhas gravou propriedades nesta nota, não
        necessariamente a data real de criação do arquivo.
      </p>

      <div class="flex flex-col gap-1.5">
        <div
          v-for="entry in customEntries"
          :key="entry.key"
          class="flex items-center gap-1.5"
        >
          <label :for="`property-key-${entry.key}`" class="sr-only">Chave da propriedade</label>
          <Input :id="`property-key-${entry.key}`" :model-value="entry.key" disabled class="h-8 flex-1" />
          <label :for="`property-value-${entry.key}`" class="sr-only">
            Valor de {{ entry.key }}
          </label>
          <Input
            :id="`property-value-${entry.key}`"
            :model-value="entry.value"
            class="h-8 flex-1"
            @change="updateProperty(entry.key, ($event.target as HTMLInputElement).value)"
          />
          <Button
            variant="ghost"
            size="icon"
            :aria-label="`Remover propriedade ${entry.key}`"
            @click="removeProperty(entry.key)"
          >
            <X class="size-4" />
          </Button>
        </div>
      </div>

      <form class="flex items-center gap-1.5" @submit.prevent="addProperty">
        <label for="property-new-key" class="sr-only">Nova chave</label>
        <Input id="property-new-key" v-model="newKey" placeholder="Chave" class="h-8 flex-1" />
        <label for="property-new-value" class="sr-only">Novo valor</label>
        <Input id="property-new-value" v-model="newValue" placeholder="Valor" class="h-8 flex-1" />
        <Button type="submit" variant="outline" size="sm">Adicionar</Button>
      </form>
    </template>
  </div>
</template>
