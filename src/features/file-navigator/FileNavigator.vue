<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import FileTree from '@/features/file-tree/FileTree.vue'
import TagsPanel from '@/features/tags-panel/TagsPanel.vue'
import { useFileNavigator } from './useFileNavigator'

const { activeTab } = useFileNavigator()
</script>

<template>
  <Tabs v-model="activeTab" class="flex h-full flex-col">
    <TabsList class="mx-2 mt-2 shrink-0 self-start">
      <TabsTrigger value="files">Arquivos</TabsTrigger>
      <TabsTrigger value="tags">Tags</TabsTrigger>
    </TabsList>
    <TabsContent value="files" class="min-h-0 overflow-hidden">
      <FileTree />
    </TabsContent>
    <TabsContent value="tags" class="min-h-0 overflow-hidden">
      <TagsPanel />
    </TabsContent>
  </Tabs>
</template>
