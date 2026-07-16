<script setup lang="ts">
import { CalendarDays, Menu, PanelRight, Moon, Search, Sun, TriangleAlert } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/ui/resizable'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import CommandPalette from '@/features/command-palette/CommandPalette.vue'
import DailyDesk from '@/features/daily-desk/DailyDesk.vue'
import FileTree from '@/features/file-tree/FileTree.vue'
import NoteEditor from '@/features/note-editor/NoteEditor.vue'
import WorkspaceConnect from '@/features/workspace-connect/WorkspaceConnect.vue'
import { useAppShell } from './useAppShell'

const {
  breakpoint,
  theme,
  toggleTheme,
  isLeftPanelOpen,
  isRightPanelOpen,
  toggleLeftPanel,
  toggleRightPanel,
  isLeftSheetOpen,
  isRightSheetOpen,
  isWorkspaceConnected,
  isOpfsFallback,
  openCommandPalette,
  openDailyDesk,
} = useAppShell()
</script>

<template>
  <WorkspaceConnect v-if="!isWorkspaceConnected" />

  <div v-else class="flex h-svh w-full flex-col bg-background text-foreground">
    <CommandPalette />
    <DailyDesk />

    <Alert v-if="isOpfsFallback" class="shrink-0 rounded-none border-x-0 border-t-0">
      <TriangleAlert class="size-4" />
      <AlertTitle>Navegador sem suporte a pasta local</AlertTitle>
      <AlertDescription>
        Seus arquivos ficam restritos a este navegador — não é uma pasta real no disco.
      </AlertDescription>
    </Alert>

    <header class="flex shrink-0 items-center justify-between border-b px-3 py-2">
      <div class="flex items-center gap-2">
        <Button
          v-if="breakpoint === 'mobile'"
          variant="ghost"
          size="icon"
          aria-label="Abrir navegação"
          @click="isLeftSheetOpen = true"
        >
          <Menu class="size-4" />
        </Button>
        <Button
          v-if="breakpoint === 'tablet'"
          variant="ghost"
          size="icon"
          aria-label="Alternar navegação"
          @click="toggleLeftPanel"
        >
          <Menu class="size-4" />
        </Button>
        <span class="font-semibold">notinhas</span>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="breakpoint === 'mobile'"
          variant="ghost"
          size="icon"
          aria-label="Abrir painel contextual"
          @click="isRightSheetOpen = true"
        >
          <PanelRight class="size-4" />
        </Button>
        <Button
          v-if="breakpoint === 'tablet'"
          variant="ghost"
          size="icon"
          aria-label="Alternar painel contextual"
          @click="toggleRightPanel"
        >
          <PanelRight class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir Daily Desk"
          @click="openDailyDesk"
        >
          <CalendarDays class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir paleta de comandos"
          @click="openCommandPalette"
        >
          <Search class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'"
          @click="toggleTheme"
        >
          <Sun v-if="theme === 'dark'" class="size-4" />
          <Moon v-else class="size-4" />
        </Button>
      </div>
    </header>

    <ResizablePanelGroup
      v-if="breakpoint === 'desktop'"
      direction="horizontal"
      class="flex-1"
    >
      <ResizablePanel :default-size="20" :min-size="15" :max-size="35">
        <div class="h-full overflow-hidden">
          <FileTree />
        </div>
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel :default-size="55" :min-size="30">
        <div class="h-full overflow-hidden">
          <NoteEditor />
        </div>
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel :default-size="25" :min-size="15" :max-size="35">
        <div class="h-full overflow-auto p-4 text-sm text-muted-foreground">
          Painel contextual (backlinks/propriedades — Fase 7)
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>

    <div v-else-if="breakpoint === 'tablet'" class="flex flex-1 overflow-hidden">
      <aside v-if="isLeftPanelOpen" class="w-56 shrink-0 overflow-hidden border-r">
        <FileTree />
      </aside>
      <main class="flex-1 overflow-hidden">
        <NoteEditor />
      </main>
      <aside
        v-if="isRightPanelOpen"
        class="w-64 shrink-0 overflow-auto border-l p-4 text-sm text-muted-foreground"
      >
        Painel contextual (backlinks/propriedades — Fase 7)
      </aside>
    </div>

    <main v-else class="flex-1 overflow-hidden">
      <NoteEditor />
    </main>

    <Sheet v-model:open="isLeftSheetOpen">
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navegação</SheetTitle>
          <SheetDescription class="sr-only"
            >Árvore de arquivos do workspace</SheetDescription
          >
        </SheetHeader>
        <div class="h-full overflow-hidden">
          <FileTree />
        </div>
      </SheetContent>
    </Sheet>

    <Sheet v-model:open="isRightSheetOpen">
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Painel contextual</SheetTitle>
          <SheetDescription class="sr-only">
            Backlinks e propriedades da nota atual
          </SheetDescription>
        </SheetHeader>
        <div class="p-4 text-sm text-muted-foreground">
          Backlinks/propriedades — Fase 7
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
