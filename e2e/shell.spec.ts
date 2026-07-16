import type { Page, TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { connectMockWorkspace } from './mockWorkspace'

async function openTreeOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.getByRole('button', { name: 'Abrir navegação' }).focus()
  await page.keyboard.press('Enter')
}

test('shell collapses correctly for the current breakpoint', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  const emptyTree = 'Nenhuma nota ainda. Crie uma nota para começar.'

  if (testInfo.project.name === 'desktop') {
    await expect(page.getByText(emptyTree)).toBeVisible()
    await expect(page.getByText('Selecione uma nota para editar.')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Backlinks' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Propriedades' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Alternar navegação' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Abrir navegação' })).toHaveCount(0)
  }

  if (testInfo.project.name === 'tablet') {
    const toggle = page.getByRole('button', { name: 'Alternar navegação' })
    await expect(toggle).toBeVisible()
    await expect(page.getByText(emptyTree)).toBeVisible()

    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText(emptyTree)).toBeHidden()

    await page.keyboard.press('Enter')
    await expect(page.getByText(emptyTree)).toBeVisible()
  }

  if (testInfo.project.name === 'mobile') {
    const openLeft = page.getByRole('button', { name: 'Abrir navegação' })
    await expect(openLeft).toBeVisible()
    await expect(page.getByText(emptyTree)).toBeHidden()

    await openLeft.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText(emptyTree)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByText(emptyTree)).toBeHidden()
  }
})

test('theme toggle is reachable and operable by keyboard alone', async ({ page }) => {
  await connectMockWorkspace(page)
  const html = page.locator('html')
  const before = (await html.getAttribute('class')) ?? ''

  await page.getByRole('button', { name: /Ativar tema (claro|escuro)/ }).focus()
  await page.keyboard.press('Enter')

  await expect(html).not.toHaveClass(before)
})

test('opens the help guide as a note tab via the header button, keyboard only, and hides it from the file tree', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  await page.getByRole('button', { name: 'Abrir guia de uso' }).focus()
  await page.keyboard.press('Enter')

  const helpTab = page.getByRole('tab', { name: 'Guia do notinhas', exact: true })
  await expect(helpTab).toBeVisible()
  await expect(helpTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota' })).toContainText(
    'Bem-vindo(a) ao notinhas',
  )

  // Clicar de novo reaproveita a mesma aba/nota em vez de duplicar.
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tab', { name: 'Guia do notinhas', exact: true })).toHaveCount(1)

  // A nota pertence ao core do app — não aparece na árvore, e por isso não tem como ser
  // renomeada/apagada pela UI (a única ação de renomear/excluir do app é a da árvore).
  await openTreeOnMobile(page, testInfo)
  await expect(
    page.getByRole('treeitem', { name: 'Guia do notinhas', exact: true }),
  ).toHaveCount(0)
})

test('the help guide is read-only: no formatting toolbar and typing does not change its content', async ({
  page,
}) => {
  await connectMockWorkspace(page)

  await page.getByRole('button', { name: 'Abrir guia de uso' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByText('Nota protegida — somente leitura')).toBeVisible()
  await expect(page.getByRole('toolbar')).toHaveCount(0)

  const editorContent = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  const before = await editorContent.textContent()
  await editorContent.focus()
  await page.keyboard.type('tentativa de edição')
  await expect(editorContent).toHaveText(before ?? '')
})

test('has no critical accessibility violations', async ({ page }) => {
  await connectMockWorkspace(page)
  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
