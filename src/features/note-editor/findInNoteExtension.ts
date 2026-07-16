import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface FindInNoteMatch {
  from: number
  to: number
}

export interface FindInNoteStorage {
  query: string
  results: FindInNoteMatch[]
  activeIndex: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findInNote: {
      setSearchTerm: (query: string) => ReturnType
      goToSearchResult: (direction: 'next' | 'previous') => ReturnType
      clearSearchTerm: () => ReturnType
    }
  }

  interface Storage {
    findInNote: FindInNoteStorage
  }
}

const findInNotePluginKey = new PluginKey<DecorationSet>('findInNote')

function findMatches(doc: ProseMirrorNode, query: string): FindInNoteMatch[] {
  if (!query) return []
  const results: FindInNoteMatch[] = []
  const lowerQuery = query.toLowerCase()

  doc.descendants((node, pos) => {
    if (!node.isText) return
    const text = node.text ?? ''
    const lowerText = text.toLowerCase()
    let fromIndex = 0
    for (;;) {
      const foundAt = lowerText.indexOf(lowerQuery, fromIndex)
      if (foundAt === -1) break
      results.push({ from: pos + foundAt, to: pos + foundAt + query.length })
      fromIndex = foundAt + query.length
    }
  })

  return results
}

function buildDecorations(
  doc: ProseMirrorNode,
  storage: FindInNoteStorage,
): DecorationSet {
  const decorations = storage.results.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class:
        index === storage.activeIndex
          ? 'note-search-match note-search-match-active'
          : 'note-search-match',
    }),
  )
  return DecorationSet.create(doc, decorations)
}

export const FindInNote = Extension.create<Record<string, never>, FindInNoteStorage>({
  name: 'findInNote',

  addStorage() {
    return { query: '', results: [], activeIndex: -1 }
  },

  addCommands() {
    return {
      setSearchTerm:
        (query: string) =>
        ({ editor, dispatch }) => {
          const results = findMatches(editor.state.doc, query)
          editor.storage.findInNote.query = query
          editor.storage.findInNote.results = results
          editor.storage.findInNote.activeIndex = results.length > 0 ? 0 : -1

          if (dispatch) {
            editor.view.dispatch(editor.state.tr.setMeta(findInNotePluginKey, true))
          }
          return true
        },

      goToSearchResult:
        (direction: 'next' | 'previous') =>
        ({ editor, dispatch }) => {
          const storage = editor.storage.findInNote as FindInNoteStorage
          if (storage.results.length === 0) return false

          const delta = direction === 'next' ? 1 : -1
          storage.activeIndex =
            (storage.activeIndex + delta + storage.results.length) %
            storage.results.length

          if (dispatch) {
            const match = storage.results[storage.activeIndex]
            const tr = editor.state.tr
              .setSelection(TextSelection.create(editor.state.doc, match.from, match.to))
              .setMeta(findInNotePluginKey, true)
              .scrollIntoView()
            editor.view.dispatch(tr)
          }
          return true
        },

      clearSearchTerm:
        () =>
        ({ editor, dispatch }) => {
          editor.storage.findInNote.query = ''
          editor.storage.findInNote.results = []
          editor.storage.findInNote.activeIndex = -1

          if (dispatch) {
            editor.view.dispatch(editor.state.tr.setMeta(findInNotePluginKey, true))
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const { storage } = this

    return [
      new Plugin({
        key: findInNotePluginKey,
        state: {
          init: (_, state) => buildDecorations(state.doc, storage),
          apply(tr, old) {
            if (tr.getMeta(findInNotePluginKey)) {
              return buildDecorations(tr.doc, storage)
            }
            if (tr.docChanged) {
              return old.map(tr.mapping, tr.doc)
            }
            return old
          },
        },
        props: {
          decorations(state) {
            return findInNotePluginKey.getState(state)
          },
        },
      }),
    ]
  },
})
