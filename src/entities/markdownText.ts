const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g
const INLINE_CODE_PATTERN = /`[^`\n]*`/g

function blank(match: string): string {
  return match.replace(/[^\n]/g, ' ')
}

/** Substitui blocos de código fenced (```…```) e inline (`…`) por espaços do mesmo tamanho,
 * preservando quebras de linha e offsets — usado por `Tag`/`DocLink` para que `#tag`/`[[link]]`
 * dentro de código não sejam capturados, sem deslocar as posições usadas depois pelas extensões
 * do editor para posicionar decorações. */
export function stripCode(content: string): string {
  return content.replace(FENCED_CODE_BLOCK_PATTERN, blank).replace(INLINE_CODE_PATTERN, blank)
}
