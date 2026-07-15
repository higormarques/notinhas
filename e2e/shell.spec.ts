import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { connectMockWorkspace } from './mockWorkspace'

test('shell collapses correctly for the current breakpoint', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  if (testInfo.project.name === 'desktop') {
    await expect(page.getByText('Navegação (árvore de arquivos — Fase 2)')).toBeVisible()
    await expect(page.getByText('Editor de notas (Fase 2/4)')).toBeVisible()
    await expect(
      page.getByText('Painel contextual (backlinks/propriedades — Fase 7)'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Alternar navegação' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Abrir navegação' })).toHaveCount(0)
  }

  if (testInfo.project.name === 'tablet') {
    const toggle = page.getByRole('button', { name: 'Alternar navegação' })
    await expect(toggle).toBeVisible()
    await expect(page.getByText('Navegação (árvore de arquivos — Fase 2)')).toBeVisible()

    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Navegação (árvore de arquivos — Fase 2)')).toBeHidden()

    await page.keyboard.press('Enter')
    await expect(page.getByText('Navegação (árvore de arquivos — Fase 2)')).toBeVisible()
  }

  if (testInfo.project.name === 'mobile') {
    const openLeft = page.getByRole('button', { name: 'Abrir navegação' })
    await expect(openLeft).toBeVisible()
    await expect(page.getByText('Árvore de arquivos — Fase 2')).toBeHidden()

    await openLeft.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Árvore de arquivos — Fase 2')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByText('Árvore de arquivos — Fase 2')).toBeHidden()
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

test('has no critical accessibility violations', async ({ page }) => {
  await connectMockWorkspace(page)
  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
