---
name: octarine-architecture-guardrail
description: Reafirma o estado do projeto notinhas (clone do Octarine) antes de qualquer trabalho de feature — relê CLAUDE.md, docs/architecture.md e docs/roadmap.md, confirma a fase atual, o Definition of Done e as restrições rígidas (View + Composable colocado, fronteira Pinia/TanStack Query, fora de escopo). Use isto no início de QUALQUER tarefa de código neste repositório, antes de escrever a primeira linha, especialmente em sessões novas sem contexto da conversa anterior.
allowed-tools: Read, Grep, Glob
---

# octarine-architecture-guardrail

## Objetivo

Este é o mecanismo principal anti-desvio do projeto **notinhas**. Sessões de IA resetam
contexto entre conversas; este skill existe para que nenhuma sessão nova comece a escrever
código sem primeiro reler o desenho já acordado com o usuário.

## Quando usar

No início de **qualquer** tarefa que envolva escrever ou modificar código neste repositório —
uma feature nova, um bugfix, uma refatoração. Não pule esta etapa achando a tarefa "pequena
demais": a maior causa de desvio de arquitetura é justamente pular a checagem em tarefas que
pareciam simples.

## Passos

1. Leia `CLAUDE.md` na raiz do repositório inteiro.
2. Leia `docs/roadmap.md` e identifique explicitamente:
   - Qual fase está marcada como 🚧 em andamento (ou a próxima ⬜ se a atual estiver ✅).
   - O checklist de Definition of Done dessa fase especificamente.
3. Leia `docs/architecture.md`, ao menos as seções relevantes à tarefa pedida (storage, query
   keys, stores Pinia, componentes shadcn-vue, teclado/responsividade).
4. Antes de escrever qualquer código, declare em texto para o usuário (ou para si mesmo, se
   autônomo):
   - Qual fase/tarefa isso pertence.
   - Se a tarefa pedida está dentro do escopo da fase atual ou é claramente fora de escopo
     (Git Sync, IA, features de fases futuras) — se estiver fora de escopo, avise antes de
     prosseguir em vez de simplesmente implementar.
5. Reafirme as restrições rígidas que valem para qualquer código escrito a partir daqui:
   - **View + Composable colocado**: nenhum `.vue` recebe lógica de negócio, `useQuery`/
     `useMutation`, acesso a store Pinia ou chamada ao `StorageAdapter` diretamente — tudo isso
     vai num `useNomeDoComponente.ts` colocado no mesmo diretório.
   - **Pinia é só estado de UI/cliente**; conteúdo de arquivo e cache derivado são sempre
     TanStack Query.
   - **Componentes de UI shadcn-vue** são sempre adicionados via
     `pnpm dlx shadcn-vue@latest add <componente>`, nunca escritos à mão.
   - Todo fluxo novo precisa ser operável 100% por teclado e responsivo nos 3 breakpoints
     (375/768/1280), com teste Playwright keyboard-only cobrindo o fluxo.
6. Só depois desses 5 passos, prossiga com a implementação.

## Saída esperada

Um resumo curto confirmando: fase atual, se a tarefa está no escopo dela, e as restrições
rígidas relevantes — antes de qualquer `Write`/`Edit` de código de produção.
