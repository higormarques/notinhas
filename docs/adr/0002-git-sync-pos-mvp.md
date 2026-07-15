# 0002 — Git Sync fica fora do MVP

- **Status:** aceita
- **Data:** 2026-07-15

## Contexto

O Octarine original oferece Git Sync como feature (marcada como "beta" mesmo no produto
original). É uma peça significativamente mais arriscada e complexa que o loop central de notas
(autenticação, resolução de conflitos, operações de rede, tudo isso rodando dentro das
restrições de uma Web SPA).

## Decisão

Git Sync **não faz parte do roadmap do MVP** (fases 0–8 em `docs/roadmap.md`). Fica reservado
como um possível milestone pós-MVP, a ser revisitado com o usuário depois que o loop central
(notas, Daily Desk, busca, organização) estiver validado.

## Motivo

- É "beta" mesmo no produto original — sinal de que é a parte mais instável do design de
  referência.
- Implementar Git dentro de uma Web SPA (sem acesso a um binário `git` nativo) exigiria uma
  implementação de Git em WASM/JS ou um backend de sync próprio — escopo grande o suficiente
  para justificar ser tratado à parte, não espremido dentro de uma fase do MVP.
- Priorizar o loop central maximiza valor demonstrável mais cedo.

## Consequências

- Nenhuma UI, rota, ou estado (Pinia/Query) para Git Sync deve ser criado durante as fases 0–8.
- Sessões de IA não devem "adiantar" esse trabalho espontaneamente — ver `CLAUDE.md`, seção
  "Fora de escopo agora".
- Se o usuário decidir revisitar, isso deve gerar um novo ADR descrevendo a abordagem técnica
  escolhida (provavelmente isomorphic-git ou um backend de sync dedicado).
