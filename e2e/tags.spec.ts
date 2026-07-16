import type { Page, TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { connectMockWorkspace } from './mockWorkspace'

async function openLeftPanelOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.getByRole('button', { name: 'Abrir navegação' }).focus()
  await page.keyboard.press('Enter')
}

async function switchToTagsTab(page: Page, testInfo: TestInfo) {
  await openLeftPanelOnMobile(page, testInfo)
  await page.getByRole('tab', { name: 'Tags' }).focus()
  await page.keyboard.press('Enter')
}

/** Fecha o Sheet de navegação pelo botão "Close" em vez de `Escape` — dentro da lista de notas
 * de uma tag, `Escape` primeiro volta para a lista de tags (`clearSelectedTag`, ver
 * `useTagsPanel.ts`) e só um segundo `Escape` fecharia o Sheet, já que o `preventDefault` do
 * primeiro suprime o dismiss-on-escape do Sheet (mesmo mecanismo do Reka UI que evita fechar um
 * diálogo inteiro quando `Escape` tem um significado mais local, ex. fechar um combobox aninhado). */
async function closeLeftPanelOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.getByRole('button', { name: 'Close' }).focus()
  await page.keyboard.press('Enter')
}

test('lists tags with counts, filters notes by tag, and opens the selected note, keyboard only', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'projeto.md': 'primeira nota #trabalho',
    'lazer.md': 'segunda nota sem tag',
  })

  await switchToTagsTab(page, testInfo)

  const tagOption = page.getByRole('option', { name: /^trabalho/ })
  await expect(tagOption).toBeVisible()
  await expect(tagOption.getByText('1', { exact: true })).toBeVisible()

  await tagOption.focus()
  await page.keyboard.press('Enter')

  const noteOption = page.getByRole('option', { name: 'projeto' })
  await expect(noteOption).toBeVisible()
  await expect(page.getByRole('option', { name: 'lazer' })).toHaveCount(0)

  await noteOption.focus()
  await page.keyboard.press('Enter')
  await closeLeftPanelOnMobile(page, testInfo)

  await expect(page.getByRole('heading', { name: 'projeto.md', level: 2 })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota' })).toHaveText(
    'primeira nota #trabalho',
  )
})

test('going back from the notes-for-tag list returns to the tag list via Escape', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'projeto.md': '#trabalho' })

  await switchToTagsTab(page, testInfo)

  const tagOption = page.getByRole('option', { name: /^trabalho/ })
  await tagOption.focus()
  await page.keyboard.press('Enter')

  const noteOption = page.getByRole('option', { name: 'projeto' })
  await expect(noteOption).toBeVisible()
  await noteOption.focus()
  await page.keyboard.press('Escape')

  await expect(page.getByRole('option', { name: /^trabalho/ })).toBeVisible()
})

test('shows an empty state when no tag exists yet', async ({ page }, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'nota.md': 'sem tags aqui' })

  await switchToTagsTab(page, testInfo)

  await expect(page.getByText(/Nenhuma tag ainda/)).toBeVisible()
})

test('has no critical accessibility violations with the tags tab open', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'projeto.md': '#trabalho' })

  await switchToTagsTab(page, testInfo)
  await expect(page.getByRole('option', { name: /^trabalho/ })).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
