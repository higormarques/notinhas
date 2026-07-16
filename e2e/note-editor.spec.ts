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

/** A árvore de arquivos guarda o item "roving tabindex" ativo em `focusedPath` (estado do
 * composable), não em `document.activeElement` — chamar `.focus()` direto num treeitem
 * arbitrário move o foco do DOM mas não sincroniza `focusedPath`, então `Enter` reativaria o
 * item antigo. Foca o item com `tabindex="0"` (o item "roving" atual) e navega com
 * `ArrowUp`/`ArrowDown` até alcançar o alvo (na direção certa, já que o alvo pode estar antes ou
 * depois do item atual na lista), do mesmo jeito que um usuário real navegaria só de teclado.
 * Assume que `name` é um arquivo na raiz do workspace (sem pasta), única forma usada neste
 * arquivo de teste — `data-tree-path` de um item na raiz é igual ao seu nome. */
async function openNote(page: Page, testInfo: TestInfo, name: string) {
  await openTreeOnMobile(page, testInfo)
  await page.locator('[role="treeitem"][tabindex="0"]').focus()
  for (let i = 0; i < 30; i += 1) {
    const { currentIndex, targetIndex } = await page.evaluate((targetPath) => {
      const items = Array.from(document.querySelectorAll('[role="treeitem"]'))
      return {
        currentIndex: items.indexOf(document.activeElement as Element),
        targetIndex: items.findIndex((el) => el.getAttribute('data-tree-path') === targetPath),
      }
    }, name)
    if (currentIndex === targetIndex) break
    await page.keyboard.press(targetIndex > currentIndex ? 'ArrowDown' : 'ArrowUp')
  }
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

test('switching notes mid-edit shows only the newly opened note\'s content and saves the pending edit to its own file', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'a.md': '',
    'b.md': 'conteúdo original de B',
  })

  await openNote(page, testInfo, 'a.md')
  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await editorContent.focus()
  await page.keyboard.type('editado em A')

  // troca para outra nota da árvore sem esperar o autosave (nem o indicador "Salvo") terminar
  await openNote(page, testInfo, 'b.md')

  await expect(editorContent).toHaveText('conteúdo original de B')

  await expect(page.getByText('Salvo')).toBeVisible({ timeout: 3000 })
  await openNote(page, testInfo, 'a.md')
  await expect(editorContent).toHaveText('editado em A')

  await openNote(page, testInfo, 'b.md')
  await expect(editorContent).toHaveText('conteúdo original de B')
})

test('switching to the Daily Desk mid-edit shows only the daily note\'s content and saves the pending edit to its own file', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'a.md': '' })
  await page.clock.setFixedTime(new Date(2026, 6, 15, 12, 0, 0))

  await openNote(page, testInfo, 'a.md')
  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await editorContent.focus()
  await page.keyboard.type('editado em A')

  await page.keyboard.press('Control+j')
  await page.getByRole('button', { name: /15 de julho de 2026/ }).focus()
  await page.keyboard.press('Enter')
  await closeTreeOnMobile(page, testInfo)

  await expect(page.getByRole('heading', { name: '2026-07-15.md', level: 2 })).toBeVisible()
  await expect(editorContent).toHaveText('')

  await expect(page.getByText('Salvo')).toBeVisible({ timeout: 3000 })
  await openNote(page, testInfo, 'a.md')
  await expect(editorContent).toHaveText('editado em A')
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
