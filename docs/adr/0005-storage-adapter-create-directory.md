# 0005 — Adicionar `createDirectory` ao contrato `StorageAdapter`

- **Status:** aceita
- **Data:** 2026-07-15

## Contexto

A Fase 2 (árvore de arquivos + CRUD de notas Markdown) precisa criar pastas vazias a partir da
UI (menu de contexto/atalho "Nova pasta" na árvore de arquivos). O contrato original do
`StorageAdapter` (`listDirectory`, `readFile`, `writeFile`, `deleteFile`, `rename`) não tem um
método dedicado para isso — `writeFile` cria diretórios intermediários como efeito colateral de
escrever um arquivo dentro deles, mas não existe forma de criar uma pasta vazia sem também criar
um arquivo dentro dela como workaround, o que vazaria um artefato falso para o usuário na árvore.

## Decisão

O contrato `StorageAdapter` (`src/shared/storage/StorageAdapter.ts`) ganha um método novo:

```ts
createDirectory(path: string): Promise<void>
```

Implementado em `DirectoryHandleStorageAdapter` (base comum de `FileSystemAccessAdapter` e
`OPFSAdapter`) via `resolveDirectoryHandle(this.root, path, { create: true })` — mesmo
mecanismo já usado internamente por `writeFile`, só que sem escrever nenhum arquivo.

## Motivo

- Criar pasta vazia é uma operação legítima e esperada de qualquer árvore de arquivos com CRUD
  (Fase 2), não um caso de borda.
- Reaproveita o helper `resolveDirectoryHandle` já existente em `directoryHandleNavigation.ts`
  com `{ create: true }` — nenhuma lógica nova de baixo nível é necessária, só expor a operação
  no contrato público.
- Alternativa descartada: criar a pasta "implicitamente" escrevendo um arquivo placeholder
  dentro dela (ex. `.gitkeep`) — rejeitada por poluir a árvore com um arquivo que não existe do
  ponto de vista do usuário e por exigir lógica extra para escondê-lo/removê-lo depois.

## Consequências

- Toda feature que cria pastas (Fase 2 em diante) deve chamar `getStorageAdapter().createDirectory(path)`,
  nunca simular isso escrevendo um arquivo temporário.
- `deleteFile` continua servindo tanto para arquivos quanto pastas (o nome é uma imprecisão
  histórica do contrato original — `removeEntry(name, { recursive: true })` já cobre os dois
  casos); não é criado um `deleteDirectory` separado para não duplicar comportamento.
- `docs/architecture.md` e `CLAUDE.md` devem refletir o contrato atualizado do `StorageAdapter`.
