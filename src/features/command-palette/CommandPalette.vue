<script setup lang="ts">
import { CalendarDays, Moon, Plus, Sun } from '@lucide/vue'
import { ListboxItem } from 'reka-ui'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
} from '@/shared/ui/command'
import { useCommandPalette } from './useCommandPalette'

const {
  isOpen,
  handleOpenChange,
  handleQueryInput,
  notes,
  showCreateOption,
  createLabel,
  selectNote,
  createNote,
  showSmartDateOption,
  smartDateLabel,
  goToSmartDate,
  openDailyDesk,
  runToggleTheme,
  theme,
} = useCommandPalette()
</script>

<template>
  <CommandDialog
    :open="isOpen"
    title="Paleta de comandos"
    description="Busque uma nota ou execute uma ação"
    @update:open="handleOpenChange"
  >
    <div @input="handleQueryInput">
      <CommandInput placeholder="Buscar notas ou executar um comando..." />
      <CommandList>
        <CommandGroup heading="Notas">
          <CommandItem
            v-for="note in notes"
            :key="note.path"
            :value="note.path"
            @select="selectNote(note.path)"
          >
            {{ note.path }}
          </CommandItem>
        </CommandGroup>

        <!--
          "Criar nota" não pode ser um CommandItem comum: o texto exibido muda a cada tecla
          digitada, mas o Command.vue registra o textContent do item apenas uma vez, no mount —
          então a busca embutida do Reka UI fica sempre uma tecla atrasada em relação à
          digitação real. Usamos o ListboxItem "cru" (mesma navegação por teclado/roving
          highlight do Reka UI, sem entrar no índice de busca por texto) e deixamos
          `showCreateOption` ser a única fonte de verdade sobre visibilidade. Fica listado DEPOIS
          das notas existentes de propósito: se alguma nota já corresponde à busca, ela — e não
          a opção de criar — deve ser o item destacado por padrão ao abrir a paleta.
        -->
        <ListboxItem
          v-if="showCreateOption"
          value="__create-note__"
          data-slot="command-item"
          class="data-highlighted:bg-muted data-highlighted:text-foreground data-highlighted:*:[svg]:text-foreground relative m-1 flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          @select="createNote"
        >
          <Plus />
          {{ createLabel }}
        </ListboxItem>
        <CommandEmpty v-else-if="!showSmartDateOption">Nenhum resultado encontrado.</CommandEmpty>

        <!-- Mesmo motivo do item "Criar nota" acima: o rótulo muda a cada tecla digitada. -->
        <ListboxItem
          v-if="showSmartDateOption"
          value="__smart-date__"
          data-slot="command-item"
          class="data-highlighted:bg-muted data-highlighted:text-foreground data-highlighted:*:[svg]:text-foreground relative m-1 flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          @select="goToSmartDate"
        >
          <CalendarDays />
          {{ smartDateLabel }}
        </ListboxItem>

        <CommandGroup heading="Aplicativo">
          <CommandItem value="alternar-tema" @select="runToggleTheme">
            <Sun v-if="theme === 'dark'" class="size-4" />
            <Moon v-else class="size-4" />
            {{ theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro' }}
          </CommandItem>
          <CommandItem value="ir-para-daily-desk" @select="openDailyDesk">
            <CalendarDays class="size-4" />
            Ir para Daily Desk
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </div>
  </CommandDialog>
</template>
