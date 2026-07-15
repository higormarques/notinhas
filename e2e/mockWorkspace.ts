import type { Page } from '@playwright/test'

/**
 * O File System Access API real exige um gesto do usuário respondido por um seletor nativo do
 * SO, que não existe em execução headless/automatizada. Mockamos `showDirectoryPicker` para
 * cobrir o fluxo de conexão via Playwright, conforme previsto no DoD da Fase 1.
 */
export async function mockDirectoryPicker(page: Page, directoryName = 'meu-workspace') {
  await page.addInitScript((name) => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: async () => ({ kind: 'directory', name }),
    })
  }, directoryName)
}

export async function connectMockWorkspace(page: Page, directoryName = 'meu-workspace') {
  await mockDirectoryPicker(page, directoryName)
  await page.goto('/')
  await page.getByRole('button', { name: 'Escolher pasta do workspace' }).focus()
  await page.keyboard.press('Enter')
  await page.getByText('Editor de notas (Fase 2/4)').waitFor()
}
