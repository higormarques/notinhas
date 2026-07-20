<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { useAnalyticsConsentBanner } from './useAnalyticsConsentBanner'

const { isBannerVisible, grantConsent, denyConsent } = useAnalyticsConsentBanner()
</script>

<template>
  <div
    v-if="isBannerVisible"
    class="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4"
  >
    <Alert
      class="max-w-xl bg-popover shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-4"
    >
      <div>
        <AlertTitle>Análise de uso</AlertTitle>
        <AlertDescription>
          Usamos o Google Analytics para entender como o notinhas é usado. Nenhuma nota ou
          conteúdo de arquivo é enviado — só dados de navegação nesta página. Você pode
          recusar sem perder nenhuma funcionalidade.
        </AlertDescription>
      </div>
      <div class="mt-3 flex shrink-0 justify-end gap-2 sm:mt-0">
        <Button variant="outline" size="sm" @click="denyConsent">Recusar</Button>
        <Button size="sm" @click="grantConsent">Aceitar</Button>
      </div>
    </Alert>
  </div>
</template>
