import { ref } from 'vue'

export type NoteContextPanelTab = 'backlinks' | 'properties'

/** Estado puramente local (qual aba está ativa) — mesmo papel de `useFileNavigator.ts` no
 * painel esquerdo: só compõe `BacklinksPanel`/`NoteProperties`, cada um já com sua própria
 * lógica de negócio. */
export function useNoteContextPanel() {
  const activeTab = ref<NoteContextPanelTab>('backlinks')
  return { activeTab }
}
