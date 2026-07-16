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

/** Mesma técnica usada em `e2e/note-editor.spec.ts`: navega a árvore só de teclado até o
 * `tabindex="0"` (roving) apontar pro arquivo alvo, na raiz do workspace. */
async function openNote(page: Page, testInfo: TestInfo, name: string) {
  await openTreeOnMobile(page, testInfo)
  await page.locator('[role="treeitem"][tabindex="0"]').focus()
  for (let i = 0; i < 30; i += 1) {
    const { currentIndex, targetIndex } = await page.evaluate((targetPath) => {
      const items = Array.from(document.querySelectorAll('[role="treeitem"]'))
      return {
        currentIndex: items.indexOf(document.activeElement as Element),
        targetIndex: items.findIndex(
          (el) => el.getAttribute('data-tree-path') === targetPath,
        ),
      }
    }, name)
    if (currentIndex === targetIndex) break
    await page.keyboard.press(targetIndex > currentIndex ? 'ArrowDown' : 'ArrowUp')
  }
  await page.keyboard.press('Enter')
  await closeTreeOnMobile(page, testInfo)
}

test('opens each note in its own tab and switches between them via keyboard, showing only one at a time', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'a.md': 'Conteúdo A',
    'b.md': 'Conteúdo B',
  })

  await openNote(page, testInfo, 'a.md')
  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await expect(editorContent).toHaveText('Conteúdo A')

  await openNote(page, testInfo, 'b.md')
  await expect(editorContent).toHaveText('Conteúdo B')

  const tabA = page.getByRole('tab', { name: 'a', exact: true })
  const tabB = page.getByRole('tab', { name: 'b', exact: true })
  await expect(tabA).toBeVisible()
  await expect(tabB).toBeVisible()
  await expect(tabB).toHaveAttribute('aria-selected', 'true')
  await expect(tabA).toHaveAttribute('aria-selected', 'false')

  // A seta move o foco entre as abas sem trocar qual está ativa — igual ao padrão já usado na
  // árvore de arquivos (mover foco != ativar).
  await tabB.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(editorContent).toHaveText('Conteúdo B')
  await expect(tabA).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(editorContent).toHaveText('Conteúdo A')
  await expect(tabA).toHaveAttribute('aria-selected', 'true')
  await expect(tabB).toHaveAttribute('aria-selected', 'false')
})

test('closes the active tab via Delete and falls back to a neighboring tab, keyboard only', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'a.md': 'Conteúdo A',
    'b.md': 'Conteúdo B',
    'c.md': 'Conteúdo C',
  })

  await openNote(page, testInfo, 'a.md')
  await openNote(page, testInfo, 'b.md')
  await openNote(page, testInfo, 'c.md')

  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await expect(editorContent).toHaveText('Conteúdo C')

  await page
    .getByRole('tablist', { name: 'Notas abertas' })
    .locator('[role="tab"][tabindex="0"]')
    .focus()
  await page.keyboard.press('Delete')

  await expect(page.getByRole('tab', { name: 'c', exact: true })).toHaveCount(0)
  await expect(editorContent).toHaveText('Conteúdo B')
  await expect(page.getByRole('tab', { name: 'b', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('closing the last open tab returns to the empty state, keyboard only', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'a.md': 'Conteúdo A' })

  await openNote(page, testInfo, 'a.md')
  await expect(page.getByRole('tablist', { name: 'Notas abertas' })).toBeVisible()

  await page
    .getByRole('tablist', { name: 'Notas abertas' })
    .locator('[role="tab"][tabindex="0"]')
    .focus()
  await page.keyboard.press('Delete')

  await expect(page.getByRole('tablist', { name: 'Notas abertas' })).toHaveCount(0)
  await expect(page.getByText('Selecione uma nota para editar.')).toBeVisible()
})

test('has no critical accessibility violations with multiple tabs open', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'a.md': 'Conteúdo A',
    'b.md': 'Conteúdo B',
  })

  await openNote(page, testInfo, 'a.md')
  await openNote(page, testInfo, 'b.md')

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )
  expect(critical).toEqual([])
})
