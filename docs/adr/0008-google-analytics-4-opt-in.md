# 0008 — Google Analytics 4 com opt-in, restrito ao build publicado

- **Status:** aceita
- **Data:** 2026-07-20

## Contexto

O app publicado no GitHub Pages (workflow de deploy em `.github/workflows/ci.yml`) não tinha
nenhuma telemetria de uso. O usuário pediu para configurar o Google Analytics 4 (propriedade já
criada, Measurement ID `G-J8CV11N1PP`) para entender tráfego/uso da página publicada.

Isso tensiona com o posicionamento "local-first" do produto (ADR 0001): as notas do usuário
nunca tocam a rede, mas o GA4 é um script de terceiro que usa cookies/identificadores para medir
navegação na própria página (não o conteúdo das notas, que nunca sai do dispositivo). Essa
distinção precisa ficar clara para quem ler o código depois.

## Decisão

- GA4 é carregado dinamicamente (`src/shared/analytics/ga4.ts`, `gtag.js` injetado via
  `<script>`) só quando `import.meta.env.VITE_GA4_MEASUREMENT_ID` está definido —
  **nenhum literal do Measurement ID no código-fonte**. Essa env var só é setada no passo
  `pnpm build` do job `deploy` do CI (mesmo padrão já usado por `VITE_BASE_PATH`, ver ADR 0001/
  workflow), nunca em `pnpm dev`/`pnpm build`/`pnpm preview` locais. Não há checagem adicional de
  `import.meta.env.PROD` — a presença da env var já é o único e suficiente gate, e checar `PROD`
  também quebraria a testabilidade do composable em Vitest (que roda em modo `test`).
- Carregamento é **opt-in**: `useAnalyticsConsent` (`src/shared/composables/`) guarda a decisão
  do usuário (`'granted' | 'denied' | 'unknown'`) em `localStorage`
  (`notinhas-analytics-consent`, mesmo padrão de `useTheme`). Um banner
  (`src/features/analytics-consent/AnalyticsConsentBanner.vue` +
  `useAnalyticsConsentBanner.ts`) só aparece quando o Measurement ID está configurado **e** a
  decisão ainda é `'unknown'`; o GA4 só é efetivamente injetado depois de `grantConsent()`.
  `denyConsent()` só grava a recusa — nunca carrega o script.
- `gtag('config', ..., { anonymize_ip: true })` — IP anonimizado por padrão.
- App é uma SPA de rota única (`src/app/router.ts` só tem `/`) — não existe tracking de
  mudança de rota via `router.afterEach`; o `page_view` automático do `gtag.js` no carregamento
  da página já é suficiente.

## Motivo

- Reaproveitar o padrão já estabelecido (env var só-CI, igual `VITE_BASE_PATH`) evita introduzir
  um mecanismo de configuração novo só para isso.
- Opt-in (em vez de carregar direto) é a escolha mais coerente com o posicionamento
  "local-first"/privacy-friendly do produto, mesmo custando uma peça de UI a mais — decisão
  explícita do usuário durante esta sessão, não uma inferência da IA.
- Gate único via env var (sem checar `PROD`) evita duplicar a mesma decisão em dois lugares e
  mantém o composable testável em Vitest sem precisar mockar `import.meta.env.PROD`.

## Consequências

- Nenhum código deve importar/chamar `gtag`/GA4 diretamente fora de `shared/analytics/ga4.ts` —
  qualquer evento novo de analytics passa a exigir uma função exportada desse módulo, nunca uma
  chamada solta a `window.dataLayer`.
- **Cobertura de teste é parcial, por decisão explícita**: `ga4.ts` e `useAnalyticsConsent`/
  `useAnalyticsConsentBanner` têm teste unitário Vitest (lógica de gate/consentimento/injeção do
  script). **Não existe teste Playwright end-to-end do banner** — ele só renderiza quando
  `VITE_GA4_MEASUREMENT_ID` está setado, o que nunca acontece no servidor de dev usado pelo
  `webServer` do `playwright.config.ts`, e testes de e2e não devem depender de bater no domínio
  real do Google (`googletagmanager.com`) de qualquer forma. Isso é um desvio consciente do
  Definition of Done padrão (que exige Playwright keyboard-only + axe nos 3 breakpoints para todo
  fluxo novo) — mesmo precedente já registrado no roadmap (Fase 1 tem um item de verificação
  manual explicitamente marcado como não-automatizável). Se o usuário quiser fechar essa lacuna
  depois, a forma correta é um segundo `webServer`/projeto Playwright isolado (porta dedicada,
  `VITE_GA4_MEASUREMENT_ID` de teste, sem tocar os demais specs) — não vale a pena construir isso
  a menos que seja pedido.
- Se no futuro o app ganhar mais de uma rota, `router.afterEach` deve ganhar uma chamada a
  `trackPageView` (a ser adicionada em `ga4.ts`) — hoje isso seria código morto.
