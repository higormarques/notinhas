import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockDirectoryPicker } from './mockWorkspace'

test('connecting to a workspace is reachable and operable by keyboard alone', async ({
  page,
}) => {
  await mockDirectoryPicker(page, 'minhas-notas')
  await page.goto('/')

  await expect(page.getByText('Editor de notas (Fase 2/4)')).toBeHidden()

  const connectButton = page.getByRole('button', { name: 'Escolher pasta do workspace' })
  await connectButton.waitFor()
  await page.keyboard.press('Tab')
  await expect(connectButton).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByText('Editor de notas (Fase 2/4)')).toBeVisible()
})

test('has no critical accessibility violations on the connect screen', async ({
  page,
}) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})

test('falls back to OPFS automatically and shows the sandbox banner when unsupported', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })
  await page.goto('/')

  await expect(page.getByText('Editor de notas (Fase 2/4)')).toBeVisible()
  await expect(page.getByText('Navegador sem suporte a pasta local')).toBeVisible()
})
