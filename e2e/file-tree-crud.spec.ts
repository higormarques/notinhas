import type { Page, TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { connectMockWorkspace } from './mockWorkspace'

async function openTreeOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.getByRole('button', { name: 'Abrir navegação' }).focus()
  await page.keyboard.press('Enter')
}

async function closeTreeOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.keyboard.press('Escape')
}

async function clearFocusedInput(page: Page) {
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.keyboard.press('Backspace')
}

test('creates, edits, renames, and deletes a note entirely via keyboard', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  await openTreeOnMobile(page, testInfo)
  await page.getByRole('button', { name: 'Nova nota' }).focus()
  await page.keyboard.press('Enter')

  const createInput = page.getByLabel('Nome')
  await createInput.waitFor()
  await createInput.focus()
  await page.keyboard.type('Primeira nota')
  await page.keyboard.press('Enter')

  const noteItem = page.getByRole('treeitem', { name: 'Primeira nota.md', exact: true })
  await expect(noteItem).toBeVisible()

  await closeTreeOnMobile(page, testInfo)

  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await editorContent.focus()
  await page.keyboard.type('Olá mundo')
  await expect(page.getByText('Salvo')).toBeVisible({ timeout: 3000 })

  await openTreeOnMobile(page, testInfo)
  await noteItem.focus()
  await page.keyboard.press('F2')

  const renameInput = page.getByLabel('Novo caminho')
  await renameInput.waitFor()
  await renameInput.focus()
  await clearFocusedInput(page)
  await page.keyboard.type('Renomeada.md')
  await page.keyboard.press('Enter')

  const renamedItem = page.getByRole('treeitem', { name: 'Renomeada.md', exact: true })
  await expect(renamedItem).toBeVisible()
  await expect(noteItem).toHaveCount(0)

  await closeTreeOnMobile(page, testInfo)
  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota' })).toHaveText('Olá mundo')

  await openTreeOnMobile(page, testInfo)
  await renamedItem.focus()
  await page.keyboard.press('Delete')

  const deleteButton = page.getByRole('button', { name: 'Excluir' })
  await deleteButton.waitFor()
  await deleteButton.focus()
  await page.keyboard.press('Enter')

  await expect(renamedItem).toHaveCount(0)

  await closeTreeOnMobile(page, testInfo)
  await expect(page.getByText('Selecione uma nota para editar.')).toBeVisible()
})

test('creates a folder, a nested note inside it, and navigates the tree with arrow keys', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  await openTreeOnMobile(page, testInfo)
  await page.getByRole('button', { name: 'Nova pasta' }).focus()
  await page.keyboard.press('Enter')

  const folderInput = page.getByLabel('Nome')
  await folderInput.waitFor()
  await folderInput.focus()
  await page.keyboard.type('Diario')
  await page.keyboard.press('Enter')

  const folderItem = page.getByRole('treeitem', { name: 'Diario', exact: true })
  await expect(folderItem).toBeVisible()
  await expect(folderItem).toHaveAttribute('aria-expanded', 'false')

  await folderItem.focus()
  await page.keyboard.press('ArrowRight')
  await expect(folderItem).toHaveAttribute('aria-expanded', 'true')

  await page.getByRole('button', { name: 'Nova nota' }).focus()
  await page.keyboard.press('Enter')

  const nestedInput = page.getByLabel('Nome')
  await nestedInput.waitFor()
  await nestedInput.focus()
  await page.keyboard.type('2026-07-15')
  await page.keyboard.press('Enter')

  const nestedItem = page.getByRole('treeitem', { name: '2026-07-15.md', exact: true })
  await expect(nestedItem).toBeVisible()
  await expect(nestedItem).toHaveAttribute('aria-level', '2')

  await nestedItem.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(folderItem).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(folderItem).toHaveAttribute('aria-expanded', 'false')
  await expect(nestedItem).toHaveCount(0)
})

test('has no critical accessibility violations with a dialog open', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  await openTreeOnMobile(page, testInfo)
  await page.getByRole('button', { name: 'Nova nota' }).focus()
  await page.keyboard.press('Enter')
  await page.getByLabel('Nome').waitFor()

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
