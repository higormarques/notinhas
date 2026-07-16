import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useNotesStore } from '@/shared/stores/notes'
import {
  parseFrontmatter,
  serializeNote,
  stampTimestamps,
  type Frontmatter,
} from '@/entities/Frontmatter'

export interface PropertyEntry {
  key: string
  value: string
}

/** Ciclo de leitura/escrita independente do `useNoteEditor.ts` — os dois consultam a mesma query
 * key (`['file', path]`), mas cada um parseia frontmatter/corpo por conta própria. Não há lock
 * entre os dois: editar uma propriedade aqui enquanto o autosave do editor está em andamento pode
 * perder uma das duas escritas (limitação aceita, ver ADR 0006 — mesma filosofia de eventual
 * consistency via `invalidateQueries` já aceita pela ADR 0004). */
export function useNoteProperties() {
  const { activeNotePath } = storeToRefs(useNotesStore())
  const queryClient = useQueryClient()

  const fileQuery = useQuery({
    queryKey: computed(() => ['file', activeNotePath.value] as const),
    queryFn: async () => {
      const path = activeNotePath.value
      if (!path) throw new Error('Nenhuma nota ativa.')
      return getStorageAdapter().readFile(path)
    },
    enabled: computed(() => activeNotePath.value !== null),
  })

  const parsed = computed(() =>
    fileQuery.data.value !== undefined ? parseFrontmatter(fileQuery.data.value) : null,
  )

  const criado = computed(() => parsed.value?.frontmatter.criado ?? null)
  const atualizado = computed(() => parsed.value?.frontmatter.atualizado ?? null)
  const customEntries = computed<PropertyEntry[]>(() => {
    if (!parsed.value) return []
    return Object.entries(parsed.value.frontmatter)
      .filter(([key, value]) => key !== 'criado' && key !== 'atualizado' && value !== undefined)
      .map(([key, value]) => ({ key, value: value as string }))
  })

  const newKey = ref('')
  const newValue = ref('')

  const saveMutation = useMutation({
    mutationFn: async (vars: { path: string; frontmatter: Frontmatter; body: string }) =>
      getStorageAdapter().writeFile(vars.path, serializeNote(vars.frontmatter, vars.body)),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['file', vars.path] })
    },
  })

  function withUpdatedFrontmatter(mutate: (frontmatter: Frontmatter) => Frontmatter): void {
    const path = activeNotePath.value
    if (!path || !parsed.value) return
    const nextFrontmatter = stampTimestamps(mutate(parsed.value.frontmatter), new Date())
    void saveMutation.mutateAsync({ path, frontmatter: nextFrontmatter, body: parsed.value.body })
  }

  function addProperty(): void {
    const key = newKey.value.trim()
    if (!key) return
    withUpdatedFrontmatter((frontmatter) => ({ ...frontmatter, [key]: newValue.value.trim() }))
    newKey.value = ''
    newValue.value = ''
  }

  function updateProperty(key: string, value: string): void {
    withUpdatedFrontmatter((frontmatter) => ({ ...frontmatter, [key]: value }))
  }

  function removeProperty(key: string): void {
    withUpdatedFrontmatter((frontmatter) =>
      Object.fromEntries(Object.entries(frontmatter).filter(([entryKey]) => entryKey !== key)),
    )
  }

  const isEmptyState = computed(() => activeNotePath.value === null)

  return {
    isEmptyState,
    criado,
    atualizado,
    customEntries,
    newKey,
    newValue,
    addProperty,
    updateProperty,
    removeProperty,
  }
}
