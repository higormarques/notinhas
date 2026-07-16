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

/** Mesma mecânica de `openNote` em `note-editor.spec.ts`: o item roving-tabindex ativo vive em
 * `focusedPath` (estado do composable), não em `document.activeElement` — foca o item com
 * `tabindex="0"` e navega com `ArrowUp`/`ArrowDown` até o alvo, como um usuário real faria. */
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

async function openContextPanelOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.getByRole('button', { name: 'Abrir painel contextual' }).focus()
  await page.keyboard.press('Enter')
}

test('creates a [[link]] via keyboard-only autocomplete and it renders as resolved', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'Projeto X.md': 'conteúdo do projeto',
    'Origem.md': '',
  })

  await openNote(page, testInfo, 'Origem.md')
  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await editorContent.focus()

  await page.keyboard.type('veja ')
  await page.keyboard.type('[[')

  const popup = page.getByRole('listbox', { name: 'Sugestões de notas para linkar' })
  await expect(popup).toBeVisible()
  const suggestion = page.getByRole('option', { name: 'Projeto X' })
  await expect(suggestion).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(popup).toBeHidden()
  await expect(editorContent).toHaveText('veja [[Projeto X]]')
  await expect(editorContent.locator('.note-doclink-resolved')).toHaveText(
    '[[Projeto X]]',
  )
})

test('Escape cancels the autocomplete popup without inserting anything', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'Origem.md': '' })

  await openNote(page, testInfo, 'Origem.md')
  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await editorContent.focus()

  await page.keyboard.type('[[')
  const popup = page.getByRole('listbox', { name: 'Sugestões de notas para linkar' })
  await expect(popup).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
})

test('a [[link]] with no matching note renders as unresolved and is a no-op', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'Origem.md': '' })

  await openNote(page, testInfo, 'Origem.md')
  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await editorContent.focus()

  await page.keyboard.type('[[Inexistente')
  await page.keyboard.press('Escape')
  await page.keyboard.type(']]')

  await expect(page.getByText('Salvo')).toBeVisible({ timeout: 3000 })
  await expect(editorContent.locator('.note-doclink-unresolved')).toHaveText(
    '[[Inexistente]]',
  )
  await expect(editorContent.locator('.note-doclink-resolved')).toHaveCount(0)
})

test("the origin note appears in the target note's Backlinks tab, keyboard only", async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'Alvo.md': 'conteúdo do alvo',
    'Origem.md': 'veja [[Alvo]] aqui',
  })

  await openNote(page, testInfo, 'Alvo.md')
  await openContextPanelOnMobile(page, testInfo)

  await page.getByRole('tab', { name: 'Backlinks' }).focus()
  await page.keyboard.press('Enter')

  const backlinkOption = page.getByRole('option', { name: 'Origem' })
  await expect(backlinkOption).toBeVisible()

  await backlinkOption.focus()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Origem.md', level: 2 })).toBeVisible()
})

test('has no critical accessibility violations while the [[ autocomplete popup is open', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'Projeto X.md': 'conteúdo',
    'Origem.md': '',
  })

  await openNote(page, testInfo, 'Origem.md')
  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await editorContent.waitFor()
  await editorContent.focus()
  await page.keyboard.type('[[')
  await expect(
    page.getByRole('listbox', { name: 'Sugestões de notas para linkar' }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
