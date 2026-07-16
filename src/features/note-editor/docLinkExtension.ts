import { Extension } from '@tiptap/core'
import { exitSuggestion, Suggestion } from '@tiptap/suggestion'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { extractDocLinks } from '@/entities/DocLink'
import { renderDocLinkSuggestion } from './docLinkSuggestionPopup'

export interface DocLinkOptions {
  /** Resolve o texto bruto de um `[[link]]` para o path de uma nota existente, ou `null` se não
   * houver nota com esse título — decide o estilo (resolvido/não-resolvido) e se o clique navega. */
  resolveTarget: (target: string) => string | null
  /** Chamado ao clicar num link resolvido — tipicamente `useNotesStore().openNote(path)`. */
  onNavigate: (path: string) => void
  /** Fonte dos títulos sugeridos ao digitar `[[` — filtrados pelo texto já digitado. Assíncrona
   * porque a primeira chamada numa sessão pode precisar esperar `ensureIndexReady` terminar de
   * construir o índice antes de ter qualquer título para sugerir. */
  getSuggestions: (query: string) => string[] | Promise<string[]>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    docLink: {
      /** Navega para a nota de um `[[link]]` resolvido sob o cursor — equivalente por teclado ao
       * clique num link (`handleClick`), já que nem todo fluxo de navegação por clique tem uma
       * alternativa nativa de teclado no ProseMirror. Vinculado a `Mod-Enter`. */
      followDocLinkAtCursor: () => ReturnType
    }
  }
}

const DOC_LINK_TARGET_ATTR = 'data-doclink-target'
const docLinkDecorationPluginKey = new PluginKey<DecorationSet>('docLinkDecoration')

/** Mesma lógica de exclusão de código do `tagHighlightExtension.ts` — o doc ProseMirror já
 * separa código estruturalmente (nó `codeBlock`, marca `code`), então não precisa re-detectar
 * cercas de código por regex como faz `stripCode` para o markdown bruto indexado. */
function isInsideCode(node: ProseMirrorNode, parent: ProseMirrorNode | null): boolean {
  if (parent?.type.name === 'codeBlock') return true
  return node.marks.some((mark) => mark.type.name === 'code')
}

function buildDecorations(
  doc: ProseMirrorNode,
  resolveTarget: DocLinkOptions['resolveTarget'],
): DecorationSet {
  const decorations: Decoration[] = []
  doc.descendants((node, pos, parent) => {
    if (!node.isText || isInsideCode(node, parent)) return
    for (const match of extractDocLinks(node.text ?? '')) {
      const resolvedPath = resolveTarget(match.target)
      decorations.push(
        Decoration.inline(pos + match.from, pos + match.to, {
          class: resolvedPath
            ? 'note-doclink note-doclink-resolved'
            : 'note-doclink note-doclink-unresolved',
          [DOC_LINK_TARGET_ATTR]: match.target,
        }),
      )
    }
  })
  return DecorationSet.create(doc, decorations)
}

/** Resolve o `[[link]]` (se houver) cuja extensão cobre `pos` — usado tanto pelo comando
 * `followDocLinkAtCursor` quanto poderia ser usado por qualquer outro gatilho por teclado
 * futuro que precise saber "em qual link o cursor está". */
function resolveLinkAtPos(
  doc: ProseMirrorNode,
  pos: number,
  resolveTarget: DocLinkOptions['resolveTarget'],
): string | null {
  let resolved: string | null = null
  doc.descendants((node, nodePos, parent) => {
    if (resolved || !node.isText || isInsideCode(node, parent)) return
    for (const match of extractDocLinks(node.text ?? '')) {
      const from = nodePos + match.from
      const to = nodePos + match.to
      if (pos >= from && pos <= to) {
        resolved = resolveTarget(match.target)
      }
    }
  })
  return resolved
}

/** Decoração de `[[Nota]]` (resolvida/não-resolvida) + navegação por clique num link resolvido
 * (link não-resolvido é sempre no-op — decisão de escopo já validada: não cria nota a partir de
 * link quebrado) + autocomplete ao digitar `[[` via `@tiptap/suggestion`. */
export const DocLink = Extension.create<DocLinkOptions>({
  name: 'docLink',

  addOptions() {
    return {
      resolveTarget: () => null,
      onNavigate: () => {},
      getSuggestions: () => [],
    }
  },

  addCommands() {
    return {
      followDocLinkAtCursor:
        () =>
        ({ editor }) => {
          const { resolveTarget, onNavigate } = this.options
          const path = resolveLinkAtPos(
            editor.state.doc,
            editor.state.selection.from,
            resolveTarget,
          )
          if (!path) return false
          onNavigate(path)
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.followDocLinkAtCursor(),
    }
  },

  addProseMirrorPlugins() {
    const { resolveTarget, onNavigate, getSuggestions } = this.options

    const decorationPlugin = new Plugin({
      key: docLinkDecorationPluginKey,
      state: {
        init: (_, state) => buildDecorations(state.doc, resolveTarget),
        apply(tr, old) {
          return tr.docChanged ? buildDecorations(tr.doc, resolveTarget) : old
        },
      },
      props: {
        decorations(state) {
          return docLinkDecorationPluginKey.getState(state)
        },
        handleClick(_view, _pos, event) {
          const element = (event.target as HTMLElement | null)?.closest(
            '.note-doclink-resolved',
          )
          const target = element?.getAttribute(DOC_LINK_TARGET_ATTR)
          if (!target) return false
          const path = resolveTarget(target)
          if (!path) return false
          onNavigate(path)
          return true
        },
      },
    })

    const suggestionPluginKey = new PluginKey('docLinkSuggestion')

    const suggestionPlugin = Suggestion({
      editor: this.editor,
      char: '[[',
      pluginKey: suggestionPluginKey,
      items: async ({ query }) => (await getSuggestions(query)).slice(0, 10),
      command: ({ editor, range, props }) => {
        editor.chain().focus().insertContentAt(range, `[[${props}]]`).run()
        // Sem isto, um título de uma única palavra (sem espaço) faz o texto recém-inserido
        // ("[[Titulo]]") continuar batendo com o padrão de gatilho do @tiptap/suggestion — que
        // só considera espaço/`[` como delimitadores de fim de busca, não `]` — mantendo o popup
        // aberto (agora filtrando por uma query que já inclui os colchetes de fechamento) em vez
        // de fechar como esperado depois de uma seleção.
        exitSuggestion(editor.view, suggestionPluginKey)
      },
      render: renderDocLinkSuggestion,
    })

    return [decorationPlugin, suggestionPlugin]
  },
})
