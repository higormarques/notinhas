import type { Page, TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { connectMockWorkspace } from './mockWorkspace'

const PALETTE_PLACEHOLDER = 'Buscar notas ou executar um comando...'

async function openTreeOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.getByRole('button', { name: 'Abrir navegação' }).focus()
  await page.keyboard.press('Enter')
}

async function closeTreeOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.keyboard.press('Escape')
}

test('opens an existing note via the command palette, keyboard only', async ({ page }) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'bemvindo.md': 'Olá mundo' })

  await page.keyboard.press('Control+k')
  const input = page.getByPlaceholder(PALETTE_PLACEHOLDER)
  await expect(input).toBeFocused()

  await page.keyboard.type('bemvindo')
  const noteOption = page.getByRole('option', { name: 'bemvindo.md' })
  await expect(noteOption).toBeVisible()
  await expect(noteOption).toHaveAttribute('data-highlighted', '')
  await page.keyboard.press('Enter')

  await expect(input).toBeHidden()
  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota' })).toHaveText('Olá mundo')
})

test('creates a new note from the command palette when there is no match, keyboard only', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  await page.keyboard.press('Control+k')
  await page.keyboard.type('Ideia nova')

  const createOption = page.getByText('Criar nota "Ideia nova"', { exact: true })
  await expect(createOption).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(page.getByPlaceholder(PALETTE_PLACEHOLDER)).toBeHidden()
  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota' })).toHaveText('')

  await openTreeOnMobile(page, testInfo)
  await expect(
    page.getByRole('treeitem', { name: 'Ideia nova.md', exact: true }),
  ).toBeVisible()
  await closeTreeOnMobile(page, testInfo)
})

test('toggles the theme from the command palette, keyboard only', async ({ page }) => {
  await connectMockWorkspace(page)
  const html = page.locator('html')
  const before = (await html.getAttribute('class')) ?? ''

  await page.keyboard.press('Control+k')
  await page.getByText(/Ativar tema (claro|escuro)/).waitFor()
  await page.keyboard.press('Enter')

  await expect(html).not.toHaveClass(before)
  await expect(page.getByPlaceholder(PALETTE_PLACEHOLDER)).toBeHidden()
})

test('closes the palette with Escape without taking any action', async ({ page }) => {
  await connectMockWorkspace(page)

  await page.keyboard.press('Control+k')
  const input = page.getByPlaceholder(PALETTE_PLACEHOLDER)
  await expect(input).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(input).toBeHidden()
})

test('is reachable via the header search button as well as the shortcut', async ({ page }) => {
  await connectMockWorkspace(page)

  await page.getByRole('button', { name: 'Abrir paleta de comandos' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByPlaceholder(PALETTE_PLACEHOLDER)).toBeVisible()
})

test('has no critical accessibility violations with the palette open', async ({ page }) => {
  await connectMockWorkspace(page)

  await page.keyboard.press('Control+k')
  await page.getByPlaceholder(PALETTE_PLACEHOLDER).waitFor()

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
