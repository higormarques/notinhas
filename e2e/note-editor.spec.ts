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

async function openNote(page: Page, testInfo: TestInfo, name: string) {
  await openTreeOnMobile(page, testInfo)
  await page.getByRole('treeitem', { name, exact: true }).focus()
  await page.keyboard.press('Enter')
  await closeTreeOnMobile(page, testInfo)
}

test('formats a note with heading, lists, code block and table entirely via keyboard, and it survives switching notes', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'nota.md': '', 'outra.md': '' })

  await openNote(page, testInfo, 'nota.md')

  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await editorContent.focus()

  await page.keyboard.type('# Título')
  await page.keyboard.press('Enter')

  await page.keyboard.type('- item um')
  await page.keyboard.press('Enter')
  await page.keyboard.type('item dois')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')

  await page.keyboard.type('``` ')
  await page.keyboard.type('const x = 1')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')

  await page.getByRole('button', { name: 'Inserir tabela' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByText('Salvo')).toBeVisible({ timeout: 3000 })

  await expect(editorContent.getByRole('heading', { level: 1, name: 'Título' })).toBeVisible()
  await expect(editorContent.getByRole('listitem').filter({ hasText: 'item um' })).toBeVisible()
  await expect(editorContent.getByRole('listitem').filter({ hasText: 'item dois' })).toBeVisible()
  await expect(editorContent.locator('pre code')).toContainText('const x = 1')
  await expect(editorContent.locator('table')).toBeVisible()
  await expect(editorContent.locator('table td, table th')).toHaveCount(9)

  await openNote(page, testInfo, 'outra.md')
  await openNote(page, testInfo, 'nota.md')

  const reopenedContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await expect(reopenedContent.getByRole('heading', { level: 1, name: 'Título' })).toBeVisible()
  await expect(reopenedContent.getByRole('listitem').filter({ hasText: 'item um' })).toBeVisible()
  await expect(reopenedContent.getByRole('listitem').filter({ hasText: 'item dois' })).toBeVisible()
  await expect(reopenedContent.locator('pre code')).toContainText('const x = 1')
  await expect(reopenedContent.locator('table td, table th')).toHaveCount(9)
})

test('finds and cycles through matches inside a note, keyboard only', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'nota.md': 'gato cachorro gato passaro gato',
  })

  await openNote(page, testInfo, 'nota.md')

  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await expect(editorContent).toHaveText('gato cachorro gato passaro gato')

  await editorContent.focus()
  await page.keyboard.press('Control+f')

  const findInput = page.getByLabel('Termo de busca')
  await findInput.waitFor()
  await findInput.focus()
  await page.keyboard.type('gato')

  await expect(page.getByText('1/3')).toBeVisible()

  await page.keyboard.press('Enter')
  await expect(page.getByText('2/3')).toBeVisible()

  await page.keyboard.press('Enter')
  await expect(page.getByText('3/3')).toBeVisible()

  await page.keyboard.press('Enter')
  await expect(page.getByText('1/3')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(findInput).toBeHidden()
})

test('has no critical accessibility violations while editing a formatted note', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'nota.md': '# Título\n\n- item um\n- item dois\n',
  })

  await openNote(page, testInfo, 'nota.md')
  await page.getByRole('textbox', { name: 'Conteúdo da nota' }).waitFor()

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter((violation) => violation.impact === 'critical')

  expect(critical).toEqual([])
})
