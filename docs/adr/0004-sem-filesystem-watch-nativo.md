# 0004 — Sem filesystem watch nativo (limitação aceita do navegador)

- **Status:** aceita
- **Data:** 2026-07-15

## Contexto

O Octarine desktop pode refletir instantaneamente edições feitas por fora do app (outro editor,
sync de terceiros) porque tem acesso a uma API de filesystem watch nativa do SO. Rodando como
Web SPA (ADR 0001), o navegador não expõe uma API equivalente por razões de segurança/sandbox —
isso não é uma lacuna de implementação a ser resolvida, é uma restrição da plataforma escolhida.

## Decisão

O app **não tenta simular** um filesystem watch em tempo real. O substituto adotado é refetch
das queries do TanStack Query no foco/visibilidade da aba (`refetchOnWindowFocus`,
`refetchOnReconnect`), que cobre o caso de uso mais comum (usuário volta para a aba depois de
editar o arquivo em outro programa).

## Motivo

- Não existe uma API de filesystem watch acessível a partir de uma Web SPA sandboxed.
- Refetch em foco é o padrão idiomático do TanStack Query para esse tipo de situação e não exige
  polling constante (que gastaria I/O e bateria sem necessidade).

## Consequências

- Edições feitas por fora do app enquanto a aba do notinhas está em foco e visível **não** são
  refletidas automaticamente até a próxima mudança de foco/visibilidade ou ação que dispare
  refetch.
- Essa limitação deve ser comunicada na UI (ex: em Settings ou onboarding) para não virar uma
  expectativa equivocada do usuário nem, futuramente, de uma sessão de IA tentando "consertar"
  um comportamento que na verdade é intencional.
- Se no futuro surgir uma API de browser padronizada para isso, este ADR deve ser revisitado.
