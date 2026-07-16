import { stripCode } from './markdownText'

export interface TagMatch {
  /** Nome normalizado da tag, sem o `#`, em minúsculas — usado para indexação/comparação. */
  tag: string
  /** Offset (no texto de entrada) do caractere `#`. */
  from: number
  /** Offset (no texto de entrada) logo após o fim do nome da tag. */
  to: number
}

// Exige que o '#' não seja precedido por letra/dígito/'#' (evita "foo#tag" e "##tag") e seja
// seguido imediatamente por uma letra, sem espaço — isso já exclui headings ATX do CommonMark
// ("# Heading" sempre tem espaço depois do '#', então nunca bate com este padrão).
const TAG_PATTERN = /(?<![#\w])#([A-Za-zÀ-ÿ][\wÀ-ÿ-]*)/g

/** Extrai as ocorrências de `#tag` de um texto markdown puro. Roda sobre `stripCode(content)`
 * para que `#` dentro de blocos de código fenced/inline não sejam capturados. */
export function extractTags(content: string): TagMatch[] {
  const stripped = stripCode(content)
  const matches: TagMatch[] = []
  for (const match of stripped.matchAll(TAG_PATTERN)) {
    const from = match.index
    matches.push({ tag: match[1].toLowerCase(), from, to: from + match[0].length })
  }
  return matches
}

/** Nomes únicos de tags (minúsculas, ordenados) presentes no conteúdo — usado para popular o
 * índice de busca (`tags` em `SearchIndexEntry`). */
export function uniqueTagNames(content: string): string[] {
  return Array.from(new Set(extractTags(content).map((match) => match.tag))).sort()
}
