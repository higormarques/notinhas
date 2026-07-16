export interface Frontmatter {
  /** ISO 8601 — primeira vez que o notinhas gravou frontmatter neste arquivo. Não é a data real
   * de criação no sistema de arquivos: File System Access API/OPFS não expõem essa metadata de
   * forma confiável entre navegadores, então esta é a única aproximação honesta disponível. */
  criado?: string
  /** ISO 8601 — atualizado a cada autosave do editor ou edição de propriedades. */
  atualizado?: string
  [key: string]: string | undefined
}

export interface ParsedNote {
  frontmatter: Frontmatter
  body: string
}

const FRONTMATTER_DELIMITER = '---'
const MANAGED_KEYS = ['criado', 'atualizado']

/** Interpreta um bloco líder `---\nchave: valor\n---\n`. Parser linha-a-linha (sem lib de YAML —
 * fora de escopo para "propriedades mínimas"): só pares chave:valor simples, sem aninhamento,
 * sem listas. Se o conteúdo não começar com o delimitador, ou o bloco nunca fechar, retorna
 * `frontmatter: {}` e `body` igual ao conteúdo original, inalterado. */
export function parseFrontmatter(content: string): ParsedNote {
  const lines = content.split('\n')
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return { frontmatter: {}, body: content }
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER,
  )
  if (closingIndex === -1) {
    return { frontmatter: {}, body: content }
  }

  const frontmatter: Frontmatter = {}
  for (const line of lines.slice(1, closingIndex)) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    if (key.length > 0) frontmatter[key] = value
  }

  const rest = lines.slice(closingIndex + 1)
  if (rest[0] === '') rest.shift()
  return { frontmatter, body: rest.join('\n') }
}

/** Inverso de `parseFrontmatter`. Não emite bloco nenhum se `frontmatter` não tiver chaves (nota
 * sem propriedades continua markdown puro, sem ruído de `--- ---` vazio). Ordem estável:
 * `criado`/`atualizado` primeiro, depois as chaves customizadas em ordem alfabética. */
export function serializeNote(frontmatter: Frontmatter, body: string): string {
  const keys = Object.keys(frontmatter).filter((key) => frontmatter[key] !== undefined)
  if (keys.length === 0) return body

  const orderedKeys = [
    ...MANAGED_KEYS.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !MANAGED_KEYS.includes(key)).sort(),
  ]
  const block = [
    FRONTMATTER_DELIMITER,
    ...orderedKeys.map((key) => `${key}: ${frontmatter[key]}`),
    FRONTMATTER_DELIMITER,
  ]
  return `${block.join('\n')}\n${body}`
}

/** Sempre atualiza `atualizado` para `now`; só seta `criado` se ainda estiver ausente. `now` é
 * recebido como parâmetro (não lido de `new Date()` internamente) para manter a função pura e
 * testável, mesma convenção de `referenceDate` em `DailyNote.ts`. */
export function stampTimestamps(frontmatter: Frontmatter, now: Date): Frontmatter {
  const iso = now.toISOString()
  return { ...frontmatter, criado: frontmatter.criado ?? iso, atualizado: iso }
}
