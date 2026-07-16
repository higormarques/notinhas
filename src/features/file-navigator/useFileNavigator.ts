import { ref } from 'vue'

export type FileNavigatorTab = 'files' | 'tags'

/** Estado puramente local (qual aba está ativa) — a navegação por teclado entre abas já é
 * fornecida pelo `TabsRoot` da Reka UI (padrão WAI-ARIA de tabs), então não há nada além disso
 * para este composable coordenar. `FileTree`/`TagsPanel` continuam sendo features independentes,
 * este componente só as compõe. */
export function useFileNavigator() {
  const activeTab = ref<FileNavigatorTab>('files')
  return { activeTab }
}
