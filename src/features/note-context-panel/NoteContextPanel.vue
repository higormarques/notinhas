<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import BacklinksPanel from '@/features/backlinks-panel/BacklinksPanel.vue'
import NoteProperties from '@/features/note-properties/NoteProperties.vue'
import { useNoteContextPanel } from './useNoteContextPanel'

const { activeTab } = useNoteContextPanel()
</script>

<template>
  <Tabs v-model="activeTab" class="flex h-full flex-col">
    <TabsList class="mx-2 mt-2 shrink-0 self-start">
      <TabsTrigger value="backlinks">Backlinks</TabsTrigger>
      <TabsTrigger value="properties">Propriedades</TabsTrigger>
    </TabsList>
    <TabsContent value="backlinks" class="min-h-0 overflow-hidden">
      <BacklinksPanel />
    </TabsContent>
    <TabsContent value="properties" class="min-h-0 overflow-hidden">
      <NoteProperties />
    </TabsContent>
  </Tabs>
</template>
