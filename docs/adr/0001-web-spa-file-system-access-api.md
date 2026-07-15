# 0001 — Web SPA com File System Access API (sem Tauri/Electron)

- **Status:** aceita
- **Data:** 2026-07-15

## Contexto

O Octarine original é um app desktop (Electron/nativo) com acesso irrestrito ao filesystem. O
clone precisa decidir sua plataforma de distribuição antes de qualquer código ser escrito, já
que isso afeta toda a camada de storage.

## Decisão

O app é uma **Web SPA pura** — sem Tauri, sem Electron — construída com o stack pedido
(Vite + Vue 3 + TS). Acesso a arquivos reais no disco usa a **File System Access API**
(`showDirectoryPicker()`), disponível em Chrome/Edge. Navegadores sem suporte (Firefox, Safari)
caem em um fallback via **OPFS** (`navigator.storage.getDirectory()`), sandboxed ao navegador.

Ver contrato completo em `docs/architecture.md` (`StorageAdapter`,
`FileSystemAccessAdapter`, `OPFSAdapter`).

## Motivo

- Mantém o stack solicitado (Vite/Vue/TS puro) sem introduzir um runtime nativo adicional.
- File System Access API cobre o caso de uso central (pasta real no disco) para a maioria dos
  usuários-alvo (Chrome/Edge).
- OPFS garante que o app funciona em qualquer navegador moderno, com uma limitação clara e
  comunicada ao usuário (banner), em vez de quebrar silenciosamente.

## Consequências

- Usuários em Firefox/Safari têm uma experiência degradada (arquivos presos ao navegador) até
  que, se algum dia fizer sentido, se considere um wrapper nativo — isso não está no roadmap.
- Nenhum código de feature deve assumir acesso irrestrito a filesystem; tudo passa pelo
  `StorageAdapter`.
- Ver também ADR 0004 (sem filesystem watch nativo), consequência direta de estar rodando no
  navegador.
