---
name: octarine-new-feature
description: Cria o esqueleto de uma nova fatia de feature do projeto notinhas seguindo o padrão de pastas estabelecido — View + Composable colocados, mais teste do composable — e exige o checklist de teclado/responsividade marcado antes de considerar a tarefa concluída. Use quando o usuário pedir para começar uma feature nova (ex. árvore de arquivos, editor, paleta de comandos, daily desk) que ainda não existe em src/features/.
allowed-tools: Read, Write, Bash, Glob
---

# octarine-new-feature

## Pré-requisito

Rode (ou já tenha rodado nesta sessão) a skill `octarine-architecture-guardrail` antes desta —
ela confirma que a feature pedida realmente pertence à fase atual do roadmap.

## Objetivo

Gerar o esqueleto de uma feature nova em `src/features/<feature-kebab-case>/`, sempre no par
**View + Composable colocado**, nunca um `.vue` sozinho com lógica embutida.

## Estrutura gerada

Para uma feature chamada `NomeDoComponente` (ex. `FileTree`, `NoteEditor`,
`CommandPalette`), dentro de `src/features/<feature-kebab>/`:

```
src/features/<feature-kebab>/
  NomeDoComponente.vue       # só template + <script setup> que chama o composable
  useNomeDoComponente.ts     # toda a lógica: state, queries/mutations, stores, efeitos
  useNomeDoComponente.test.ts  # teste unitário do composable (Vitest)
```

### Template do `.vue`

```vue
<script setup lang="ts">
import { useNomeDoComponente } from './useNomeDoComponente'

const {/* refs/computed/funções que o template precisa */} = useNomeDoComponente()
</script>

<template>
  <!-- só markup + bindings, nenhuma lógica de negócio aqui -->
</template>
```

### Template do composable

```ts
import { computed, ref } from 'vue'
// import { useQuery, useMutation } from '@tanstack/vue-query' — se a feature ler/escrever arquivos
// import { useXStore } from '@/shared/stores/x' — se a feature precisar de estado de UI/cliente

export function useNomeDoComponente() {
  // estado local, queries, mutations, acesso a stores, cálculo derivado, efeitos

  return {
    // interface enxuta consumida pelo template
  }
}
```

### Template do teste do composable

```ts
import { describe, expect, it } from 'vitest'
import { useNomeDoComponente } from './useNomeDoComponente'

describe('useNomeDoComponente', () => {
  it('descreve o comportamento esperado', () => {
    // monte o composable isoladamente (sem montar o componente) e afirme o comportamento
  })
})
```

## Checklist obrigatório antes de considerar a feature pronta

Não marque a tarefa como concluída até confirmar cada item (mesmos critérios do
`CLAUDE.md`):

- [ ] `.vue` contém só template + chamada ao composable — nenhuma lógica de negócio,
      `useQuery`/`useMutation`, acesso a Pinia ou `StorageAdapter` direto no `.vue`.
- [ ] Composable tem teste unitário cobrindo o comportamento principal.
- [ ] Fluxo é 100% operável por teclado (roving tabindex se for lista/árvore; focus trap se for
      modal — Reka UI já cobre isso na maioria dos componentes shadcn-vue).
- [ ] Teste Playwright cobrindo o fluxo com `page.keyboard.press`, sem nenhum `.click()`.
- [ ] Validado nos 3 breakpoints (375/768/1280 — os 3 projects já configurados em
      `playwright.config.ts`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` passam.
- [ ] Nenhuma violação crítica de acessibilidade (`@axe-core/playwright`).

## Se a feature precisar de um componente de UI que ainda não existe

Use a skill `octarine-ui-component` para adicioná-lo via CLI do shadcn-vue — não escreva
primitivos de UI à mão dentro da feature.
