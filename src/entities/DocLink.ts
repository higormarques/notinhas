import { stripCode } from './markdownText'

export interface DocLinkMatch {
  /** Texto bruto entre `[[` e `]]`, sem trim. */
  target: string
  /** Offset (no texto de entrada) do primeiro `[` de abertura. */
  from: number
  /** Offset (no texto de entrada) logo após o `]]` de fechamento. */
  to: number
}

// Não permite colchetes/quebra de linha aninhados dentro do alvo — escopo mínimo aprovado, sem
// suporte a `[[Nota|Apelido]]` (alias) nem links com caminho de pasta qualificado.
const DOC_LINK_PATTERN = /\[\[([^[\]\n]*)\]\]/g

/** Extrai as ocorrências de `[[Nome da Nota]]` de um texto markdown puro. Roda sobre
 * `stripCode(content)` para que links dentro de blocos de código fenced/inline não sejam
 * capturados. */
export function extractDocLinks(content: string): DocLinkMatch[] {
  const stripped = stripCode(content)
  const matches: DocLinkMatch[] = []
  for (const match of stripped.matchAll(DOC_LINK_PATTERN)) {
    const from = match.index
    matches.push({ target: match[1], from, to: from + match[0].length })
  }
  return matches
}

/** Alvos únicos (trim aplicado), preservando a ordem em que aparecem no conteúdo — usado para
 * popular o índice de busca (`links` em `SearchIndexEntry`). */
export function docLinkTargets(content: string): string[] {
  const seen = new Set<string>()
  const targets: string[] = []
  for (const match of extractDocLinks(content)) {
    const trimmed = match.target.trim()
    if (trimmed.length === 0 || seen.has(trimmed)) continue
    seen.add(trimmed)
    targets.push(trimmed)
  }
  return targets
}

/** Resolve um alvo bruto de `[[link]]` para o path de uma nota, casando por título de forma
 * case-insensitive. Pura — quem chama monta o mapa título→path (tipicamente a partir do índice
 * de busca via `buildTitleIndex`), então este módulo nunca toca IO.
 *
 * Se dois notas em pastas diferentes tiverem o mesmo título, a resolução depende de qual delas
 * "ganhou" no mapa fornecido pelo caller — limitação aceita do escopo mínimo desta fase (não há
 * suporte a links qualificados por caminho, ex. `[[Projetos/Ideias]]`, para desambiguar). */
export function resolveDocLinkTarget(
  target: string,
  titleToPath: ReadonlyMap<string, string>,
): string | null {
  return titleToPath.get(target.trim().toLowerCase()) ?? null
}

// A extensão oficial `@tiptap/markdown` faz backslash-escape de `[`/`]` em qualquer texto plano
// na hora de serializar para markdown (`editor.getMarkdown()`), para não ambiguar com sintaxe de
// link real (`[texto](url)`) numa releitura futura. Este projeto ainda não tem uma extensão de
// link real (nenhum `@tiptap/extension-link` registrado em `useNoteEditor.ts`), então um
// `[[Nota]]` digitado pelo usuário sempre sai serializado como `\[\[Nota\]\]` — sem desfazer isso
// antes de gravar no arquivo, a sintaxe de doclink nunca sobreviveria ao autosave (o texto salvo
// em disco não bateria mais com `DOC_LINK_PATTERN`, quebrando indexação/backlinks/decoração na
// próxima vez que o arquivo fosse lido).
const ESCAPED_DOC_LINK_PATTERN = /\\\[\\\[/g
const ESCAPED_DOC_LINK_CLOSE_PATTERN = /\\\]\\\]/g

/** Desfaz o escape de colchetes duplos que `editor.getMarkdown()` aplica — chamado no autosave
 * do editor antes de gravar no arquivo, para que `[[Nota]]` sobreviva ao round-trip como texto
 * literal. Não mexe em colchetes simples (fora do escopo desta correção). */
export function unescapeDocLinkMarkdown(markdown: string): string {
  return markdown
    .replace(ESCAPED_DOC_LINK_PATTERN, '[[')
    .replace(ESCAPED_DOC_LINK_CLOSE_PATTERN, ']]')
}
