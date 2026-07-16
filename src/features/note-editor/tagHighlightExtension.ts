import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { extractTags } from '@/entities/Tag'

const tagHighlightPluginKey = new PluginKey<DecorationSet>('tagHighlight')

/** `stripCode` (usado por `extractTags` para o índice) opera sobre o markdown bruto — aqui
 * caminhamos direto pelo doc ProseMirror, que já separa código estruturalmente (nó `codeBlock`
 * próprio, marca `code` em texto inline), então basta pular esses nós/marcas em vez de
 * re-detectar cercas de código por regex. */
function isInsideCode(node: ProseMirrorNode, parent: ProseMirrorNode | null): boolean {
  if (parent?.type.name === 'codeBlock') return true
  return node.marks.some((mark) => mark.type.name === 'code')
}

function buildDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = []
  doc.descendants((node, pos, parent) => {
    if (!node.isText || isInsideCode(node, parent)) return
    for (const match of extractTags(node.text ?? '')) {
      decorations.push(Decoration.inline(pos + match.from, pos + match.to, { class: 'note-tag' }))
    }
  })
  return DecorationSet.create(doc, decorations)
}

/** Decoração somente-visual de `#tag` no corpo da nota — sem interatividade (o painel de Tags é
 * quem lida com navegar/filtrar). Molde idêntico ao `FindInNote`, mas sem `Storage`/`Commands`:
 * não há estado externo a espelhar, as decorações vêm sempre do próprio texto do documento. */
export const TagHighlight = Extension.create({
  name: 'tagHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tagHighlightPluginKey,
        state: {
          init: (_, state) => buildDecorations(state.doc),
          apply(tr, old) {
            return tr.docChanged ? buildDecorations(tr.doc) : old
          },
        },
        props: {
          decorations(state) {
            return tagHighlightPluginKey.getState(state)
          },
        },
      }),
    ]
  },
})
