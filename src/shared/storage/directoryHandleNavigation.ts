export function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean)
}

export function joinPath(parent: string, name: string): string {
  return splitPath(parent).concat(name).join('/')
}

export async function resolveDirectoryHandle(
  root: FileSystemDirectoryHandle,
  path: string,
  options: { create?: boolean } = {},
): Promise<FileSystemDirectoryHandle> {
  let handle = root
  for (const segment of splitPath(path)) {
    handle = await handle.getDirectoryHandle(segment, { create: options.create ?? false })
  }
  return handle
}

export async function resolveFileHandle(
  root: FileSystemDirectoryHandle,
  path: string,
  options: { create?: boolean } = {},
): Promise<FileSystemFileHandle> {
  const segments = splitPath(path)
  const fileName = segments.pop()
  if (!fileName) {
    throw new Error(`Caminho de arquivo inválido: "${path}"`)
  }
  const parent = await resolveDirectoryHandle(root, segments.join('/'), options)
  return parent.getFileHandle(fileName, { create: options.create ?? false })
}
