---
name: octarine-adr
description: Cria um novo Architecture Decision Record (ADR) em docs/adr/ a partir do template já usado pelos ADRs 0001-0004, quando uma decisão arquitetural não trivial surgir no meio do projeto notinhas. Use quando o usuário tomar ou pedir para registrar uma decisão de arquitetura nova (escolha de biblioteca, mudança de contrato do StorageAdapter, revisão de escopo), não para decisões triviais de implementação.
allowed-tools: Read, Write, Glob, Bash
---

# octarine-adr

## Objetivo

Evitar que a mesma discussão arquitetural se repita em sessões futuras com contexto resetado.
Toda decisão não trivial (escolha entre duas abordagens técnicas concorrentes, mudança de
contrato entre camadas, revisão de uma decisão anterior) deve virar um ADR, não só um comentário
de código ou uma menção perdida na conversa.

## Quando usar

- O usuário tomou uma decisão arquitetural nova durante a conversa (ex: qual biblioteca de
  parsing de datas usar no Smart Dates da Fase 5, ou uma mudança no contrato do
  `StorageAdapter`).
- Uma decisão registrada em ADR anterior está sendo revisitada (ex: usuário decide reconsiderar
  Git Sync antes do MVP — ver ADR 0002).
- **Não use** para decisões triviais de implementação (nome de variável, escolha entre dois
  jeitos equivalentes de escrever um `v-if`) — isso não precisa de ADR.

## Passos

1. Rode `ls docs/adr/` para achar o próximo número sequencial (4 dígitos, ex. próximo depois de
   `0004-...` é `0005-...`).
2. Crie `docs/adr/NNNN-titulo-curto-em-kebab-case.md` com esta estrutura (mesmo formato dos
   ADRs 0001–0004 já existentes):

   ```markdown
   # NNNN — Título da decisão

   - **Status:** proposta | aceita | substituída por NNNN
   - **Data:** YYYY-MM-DD

   ## Contexto

   O que motivou a decisão — o problema, a tensão entre alternativas, ou o que mudou desde a
   última decisão registrada.

   ## Decisão

   O que foi decidido, de forma direta e verificável.

   ## Motivo

   Por que essa opção e não as alternativas — trade-offs considerados.

   ## Consequências

   O que isso implica para o código existente e para trabalho futuro; o que fica proibido ou
   obrigatório a partir de agora.
   ```

3. Se o ADR novo substitui ou altera um ADR anterior, atualize o `Status` do ADR antigo para
   `substituída por NNNN` e linke o novo.
4. Se a decisão afeta regras rígidas do dia-a-dia (não só uma nota histórica), atualize também
   `CLAUDE.md` e/ou `docs/architecture.md` para refletir a nova regra — o ADR registra o
   _porquê_, o `CLAUDE.md`/`docs/architecture.md` registram o _o que fazer agora_.
