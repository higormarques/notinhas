import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { connectMockWorkspace } from './mockWorkspace'

async function openSearchViaShortcut(page: Page) {
  await page.keyboard.press('Control+Shift+F')
  await expect(page.getByRole('dialog', { name: 'Buscar em notas' })).toBeVisible()
}

/** Nenhum item vem destacado por padrão nas listas de resultado (Daily Desk é a exceção, com um
 * dia pré-selecionado) — a primeira seta já move o destaque para o primeiro item da coleção.
 * Repete `ArrowDown` até o item alvo ficar destacado em vez de assumir um número fixo de
 * pressionamentos, o que manteria o teste frágil a mudanças na ordem dos itens. */
async function pressArrowDownUntilHighlighted(
  page: Page,
  target: Locator,
  maxPresses = 10,
) {
  for (let i = 0; i < maxPresses; i += 1) {
    if ((await target.getAttribute('data-highlighted')) !== null) return
    await page.keyboard.press('ArrowDown')
    // Dá um instante para o Vue re-renderizar o destaque antes da próxima checagem — sem isso,
    // uma checagem lida antes do re-render assentar pode levar a um `ArrowDown` extra que
    // avança o destaque além do item alvo.
    await page.waitForTimeout(30)
  }
  await expect(target).toHaveAttribute('data-highlighted', '')
}

test('finds notes by content, ranks title matches first, navigates results by keyboard only, and opens the selected one', async ({
  page,
}) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'cachorros.md': 'nada sobre o outro animal aqui',
    'gatos.md': 'notas sobre gatos e cachorros',
  })

  await openSearchViaShortcut(page)
  await page.keyboard.type('cachorros')

  const titleMatch = page.getByRole('option', { name: /^cachorros/ })
  const contentMatch = page.getByRole('option', { name: /^gatos/ })
  await expect(titleMatch).toBeVisible()
  await expect(contentMatch).toBeVisible()

  await pressArrowDownUntilHighlighted(page, titleMatch)
  await pressArrowDownUntilHighlighted(page, contentMatch)
  await page.keyboard.press('Enter')

  await expect(page.getByRole('dialog', { name: 'Buscar em notas' })).toBeHidden()
  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota' })).toHaveText(
    'notas sobre gatos e cachorros',
  )
})

test('returns no results for text that matches nothing', async ({ page }) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'nota.md': 'conteúdo qualquer' })

  await openSearchViaShortcut(page)
  await page.keyboard.type('inexistente')

  await expect(page.getByText('Nenhum resultado encontrado.')).toBeVisible()
})

test('finds a daily note by content as well as a regular note', async ({ page }) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    Daily: { '2026-07-15.md': 'lembrar de revisar o relatório trimestral' },
  })

  await openSearchViaShortcut(page)
  await page.keyboard.type('relatório trimestral')

  const result = page.getByRole('option', { name: /2026-07-15/ })
  await expect(result).toBeVisible()
  await pressArrowDownUntilHighlighted(page, result)
  await page.keyboard.press('Enter')

  await expect(
    page.getByRole('heading', { name: '2026-07-15.md', level: 2 }),
  ).toBeVisible()
})

test('is reachable via the header button, the shortcut, and the command palette', async ({
  page,
}) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'nota.md': 'conteúdo' })

  await page.getByRole('button', { name: 'Buscar em todas as notas' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Buscar em notas' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.keyboard.press('Control+k')
  await page.keyboard.type('Buscar em notas')
  const searchOption = page.getByRole('option', { name: 'Buscar em notas', exact: true })
  await searchOption.waitFor()
  // O texto digitado também bate com "Criar nota" (nenhuma nota real se chama assim) e com os
  // outros itens estáticos do grupo "Aplicativo" — navega até o item alvo em vez de assumir que
  // ele já vem destacado.
  await pressArrowDownUntilHighlighted(page, searchOption)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Buscar em notas' })).toBeVisible()
})

test('closes with Escape without taking any action', async ({ page }) => {
  await connectMockWorkspace(page)

  await openSearchViaShortcut(page)
  await page.keyboard.press('Escape')

  await expect(page.getByRole('dialog', { name: 'Buscar em notas' })).toBeHidden()
})

test('has no critical accessibility violations with the search dialog open', async ({
  page,
}) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'nota.md': 'conteúdo' })

  await openSearchViaShortcut(page)
  await page.keyboard.type('conteúdo')
  await page.getByRole('option').first().waitFor()

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
