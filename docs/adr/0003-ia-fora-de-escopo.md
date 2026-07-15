# 0003 — Recursos de IA fora de escopo

- **Status:** aceita
- **Data:** 2026-07-15

## Contexto

Ferramentas de PKM modernas frequentemente agregam recursos de IA (resumo automático,
autocompletar, chat sobre as notas). O Octarine original não é o foco desta decisão — a decisão
é sobre o que este clone deve ou não incluir, independentemente do produto de referência.

## Decisão

Recursos de IA estão **inteiramente fora de escopo** deste projeto, sem exceção e sem menção nas
fases do MVP.

## Motivo

- Todo o esforço de engenharia vai para os 4 pilares centrais do clone (notas Markdown,
  editor WYSIWYG, Daily Desk, organização/busca) e para os dois pilares de UX não-negociáveis
  (navegação por teclado, responsividade) — ver `PLANO.md`.
- Adicionar IA multiplicaria a superfície de decisão (qual provider, custo, privacidade dos
  dados do usuário sendo enviados a um serviço externo) sem estar alinhado ao objetivo do
  projeto.

## Consequências

- Nenhuma dependência, rota, composable ou store relacionada a chamadas de LLM deve ser
  adicionada durante o desenvolvimento deste clone.
- Se o usuário explicitamente revisitar essa decisão no futuro, isso exige um novo ADR — não
  deve ser assumido implicitamente por nenhuma sessão de IA.
