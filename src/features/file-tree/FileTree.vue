<script setup lang="ts">
import { File, FilePlus, Folder, FolderPlus } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/shared/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { useFileTree } from './useFileTree'

const {
  rows,
  focusedPath,
  isRootLoading,
  isRootEmpty,
  errorMessage,
  registerRowEl,
  activateRow,
  handleTreeKeydown,
  openCreateNoteDialog,
  openCreateFolderDialog,
  openRenameDialog,
  openDeleteDialog,
  dialog,
  isDialogOpen,
  isCreateDialog,
  isRenameDialog,
  isDeleteDialog,
  dialogTitle,
  dialogDescription,
  isSubmitting,
  submitDialog,
  handleDialogOpenChange,
} = useFileTree()
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex shrink-0 gap-1 border-b pb-2">
      <Button variant="outline" size="sm" class="flex-1" @click="openCreateNoteDialog">
        <FilePlus class="size-4" />
        Nova nota
      </Button>
      <Button variant="outline" size="sm" class="flex-1" @click="openCreateFolderDialog">
        <FolderPlus class="size-4" />
        Nova pasta
      </Button>
    </div>

    <p v-if="isRootLoading" class="p-2 text-sm text-muted-foreground">Carregando…</p>
    <p v-else-if="isRootEmpty" class="p-2 text-sm text-muted-foreground">
      Nenhuma nota ainda. Crie uma nota para começar.
    </p>

    <ul v-else role="tree" aria-label="Árvore de arquivos" class="flex-1 overflow-auto">
      <li v-for="row in rows" :key="row.entry.path" role="none">
        <ContextMenu>
          <ContextMenuTrigger as-child>
            <div
              :ref="(el) => registerRowEl(row.entry.path, el as Element | null)"
              role="treeitem"
              :aria-expanded="row.entry.kind === 'directory' ? row.isExpanded : undefined"
              :aria-level="row.depth + 1"
              :aria-selected="row.entry.path === focusedPath"
              :data-tree-path="row.entry.path"
              :tabindex="row.entry.path === focusedPath ? 0 : -1"
              class="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              :style="{ paddingLeft: `${row.depth * 16 + 6}px` }"
              @click="activateRow(row)"
              @keydown="handleTreeKeydown"
            >
              <Folder v-if="row.entry.kind === 'directory'" class="size-4 shrink-0" />
              <File v-else class="size-4 shrink-0" />
              <span class="truncate">{{ row.entry.name }}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              v-if="row.entry.kind === 'directory'"
              @select="openCreateNoteDialog"
            >
              Nova nota
            </ContextMenuItem>
            <ContextMenuItem
              v-if="row.entry.kind === 'directory'"
              @select="openCreateFolderDialog"
            >
              Nova pasta
            </ContextMenuItem>
            <ContextMenuItem @select="openRenameDialog(row.entry.path)">
              Renomear/mover
              <ContextMenuShortcut>F2</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              @select="openDeleteDialog(row.entry.path)"
            >
              Excluir
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </li>
    </ul>

    <Dialog :open="isDialogOpen" @update:open="handleDialogOpenChange">
      <DialogContent v-if="isCreateDialog || isRenameDialog || isDeleteDialog">
        <DialogHeader>
          <DialogTitle>{{ dialogTitle }}</DialogTitle>
          <DialogDescription class="sr-only">{{ dialogDescription }}</DialogDescription>
        </DialogHeader>

        <form
          v-if="isCreateDialog || isRenameDialog"
          class="space-y-2"
          @submit.prevent="submitDialog"
        >
          <label for="file-tree-dialog-name" class="text-sm text-muted-foreground">
            {{ isRenameDialog ? 'Novo caminho' : 'Nome' }}
          </label>
          <Input id="file-tree-dialog-name" v-model="dialog.name" autofocus />
        </form>

        <p v-else-if="isDeleteDialog" class="text-sm">
          Excluir <strong>{{ dialog.name }}</strong> permanentemente? Essa ação não pode
          ser desfeita.
        </p>

        <p v-if="errorMessage" role="alert" class="text-sm text-destructive">
          {{ errorMessage }}
        </p>

        <DialogFooter>
          <Button
            :variant="isDeleteDialog ? 'destructive' : 'default'"
            :disabled="isSubmitting"
            @click="submitDialog"
          >
            {{ isDeleteDialog ? 'Excluir' : 'Salvar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
