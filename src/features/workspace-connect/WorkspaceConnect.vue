<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { useWorkspaceConnect } from './useWorkspaceConnect'

const {
  status,
  errorMessage,
  isOpfsFallback,
  supportsFileSystemAccess,
  connect,
  requestPermission,
} = useWorkspaceConnect()
</script>

<template>
  <div
    class="flex h-svh w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
  >
    <div class="max-w-sm space-y-2">
      <h1 class="text-lg font-semibold">notinhas</h1>
      <p class="text-sm text-muted-foreground">
        Conecte uma pasta local para guardar suas notas em Markdown.
      </p>
    </div>

    <Alert v-if="isOpfsFallback" class="max-w-sm text-left">
      <TriangleAlert class="size-4" />
      <AlertTitle>Navegador sem suporte a pasta local</AlertTitle>
      <AlertDescription>
        Seus arquivos ficarão restritos a este navegador — não é uma pasta real no disco.
      </AlertDescription>
    </Alert>

    <p v-if="errorMessage" role="alert" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>

    <Button v-if="status === 'disconnected' && supportsFileSystemAccess" @click="connect">
      Escolher pasta do workspace
    </Button>

    <div v-else-if="status === 'permission-required'" class="space-y-2">
      <p class="text-sm text-muted-foreground">
        Encontramos seu workspace anterior. Conceda permissão novamente para continuar.
      </p>
      <Button @click="requestPermission">Reconectar workspace</Button>
    </div>

    <div v-else-if="status === 'permission-denied'" class="space-y-2">
      <p class="text-sm text-destructive">Permissão negada para o workspace anterior.</p>
      <Button @click="connect">Escolher outra pasta</Button>
    </div>

    <p
      v-else-if="status === 'connecting'"
      class="text-sm text-muted-foreground"
      aria-live="polite"
    >
      Conectando…
    </p>
  </div>
</template>
