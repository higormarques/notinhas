---
name: octarine-ui-component
description: Adiciona um componente de UI shadcn-vue via CLI oficial (pnpm dlx shadcn-vue@latest add) em vez de escrevê-lo à mão, mantendo tokens de tema e acessibilidade/teclado consistentes. Use sempre que uma feature do notinhas precisar de um primitivo de UI (botão, dialog, dropdown, tooltip, etc.) que ainda não existe em src/shared/ui/.
allowed-tools: Bash, Read, Edit, Glob
---

# octarine-ui-component

## Objetivo

Garantir que **nenhum primitivo de UI é escrito à mão** neste projeto. Todo componente de UI
vem do gerador oficial do shadcn-vue, que já traz tokens de tema (CSS variables claro/escuro) e
comportamento de acessibilidade/teclado corretos (focus trap, roles ARIA, navegação por setas
onde aplicável via Reka UI).

## Quando usar

Sempre que uma feature precisar de um componente que não existe ainda em `src/shared/ui/`
(confira primeiro com `ls src/shared/ui/` — muitos componentes já foram adicionados na Fase 0:
button, calendar, command, context-menu, dialog, input, input-group, native-select, resizable,
sheet, sonner, tabs, textarea, tooltip).

## Passos

1. Confirme que o componente realmente não existe ainda:
   ```
   ls src/shared/ui/
   ```
2. Rode o CLI do shadcn-vue para adicioná-lo:
   ```
   pnpm dlx shadcn-vue@latest add <nome-do-componente> -y
   ```
   (múltiplos componentes podem ser passados na mesma chamada, separados por espaço)
3. **Confira se algum arquivo gerado ainda referencia o alias antigo do template
   (`@/components/ui`, `@/lib/utils`)** em vez dos aliases deste projeto
   (`@/shared/ui`, `@/shared/lib/utils`) — isso já aconteceu na Fase 0 com alguns componentes
   (calendar, command, dialog, sheet, input-group). Corrija com:
   ```
   grep -rl "@/components/ui" src | xargs sed -i '' 's#@/components/ui#@/shared/ui#g'
   grep -rl "@/lib/utils" src | xargs sed -i '' 's#@/lib/utils#@/shared/lib/utils#g'
   ```
4. Rode `pnpm lint && pnpm typecheck` para confirmar que o componente novo não quebrou nada.
5. Use o componente na feature importando de `@/shared/ui/<componente>`.

## Restrições

- Nunca escreva um componente de UI genérico (botão, modal, dropdown) manualmente dentro de
  `src/features/` ou `src/shared/ui/` — sempre pelo CLI.
- `src/shared/ui/**` está fora do escopo do ESLint/Prettier deste projeto (código gerado) — não
  "corrija" estilo ali manualmente; se algo estiver errado, prefira regenerar via
  `--overwrite`/`--reinstall` do CLI.
- Se o componente shadcn-vue precisar de uma dependência que ainda não está instalada (ex.
  `@internationalized/date` para o Calendar), o CLI normalmente instala sozinho — se não
  instalar, adicione manualmente com `pnpm add <pacote>` e rode `pnpm typecheck` de novo.
