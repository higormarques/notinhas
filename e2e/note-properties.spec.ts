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

async function openPropertiesTab(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir painel contextual' }).focus()
    await page.keyboard.press('Enter')
  }
  await page.getByRole('tab', { name: 'Propriedades' }).focus()
  await page.keyboard.press('Enter')
}

/** No mobile, o Sheet do painel contextual (direito) fica sobre o conteúdo enquanto aberto — o
 * cabeçalho por trás (incluindo "Abrir navegação") fica inacessível até fechá-lo, então reabrir a
 * árvore de arquivos exige fechar este Sheet primeiro. */
async function closeContextPanelOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.keyboard.press('Escape')
}

test('adds a custom property via keyboard and it persists to the file as frontmatter', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'nota.md': 'corpo da nota' })

  await openNote(page, testInfo, 'nota.md')
  await openPropertiesTab(page, testInfo)

  await page.getByLabel('Nova chave').focus()
  await page.keyboard.type('prioridade')
  await page.keyboard.press('Tab')
  await page.keyboard.type('alta')
  await page.keyboard.press('Enter')

  const valueInput = page.getByLabel('Valor de prioridade')
  await expect(valueInput).toHaveValue('alta')

  // reabre a nota (via árvore) para forçar reler o arquivo do adapter mockado e confirmar que o
  // frontmatter foi realmente persistido em disco, não só refletido no estado da UI
  await closeContextPanelOnMobile(page, testInfo)
  await openNote(page, testInfo, 'nota.md')
  await openPropertiesTab(page, testInfo)
  await expect(page.getByLabel('Valor de prioridade')).toHaveValue('alta')
  await expect(page.getByText('Criado', { exact: true })).toBeVisible()
  await expect(page.getByText('Atualizado', { exact: true })).toBeVisible()
})

test('updates an existing property value via keyboard', async ({ page }, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'nota.md': '---\nprioridade: baixa\n---\ncorpo',
  })

  await openNote(page, testInfo, 'nota.md')
  await openPropertiesTab(page, testInfo)

  const valueInput = page.getByLabel('Valor de prioridade')
  await expect(valueInput).toHaveValue('baixa')
  await valueInput.focus()
  await page.keyboard.press('End')
  for (let i = 0; i < 'baixa'.length; i += 1) {
    await page.keyboard.press('Backspace')
  }
  await page.keyboard.type('alta')
  await page.keyboard.press('Tab')

  await closeContextPanelOnMobile(page, testInfo)
  await openNote(page, testInfo, 'nota.md')
  await openPropertiesTab(page, testInfo)
  await expect(page.getByLabel('Valor de prioridade')).toHaveValue('alta')
})

test('removes a property via its keyboard-focusable remove button', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'nota.md': '---\nprioridade: alta\n---\ncorpo',
  })

  await openNote(page, testInfo, 'nota.md')
  await openPropertiesTab(page, testInfo)

  await expect(page.getByLabel('Valor de prioridade')).toBeVisible()
  await page.getByRole('button', { name: 'Remover propriedade prioridade' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByLabel('Valor de prioridade')).toHaveCount(0)
})

test('shows an empty state when there is no active note', async ({ page }, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', { 'nota.md': 'corpo' })

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir painel contextual' }).focus()
    await page.keyboard.press('Enter')
  }
  await page.getByRole('tab', { name: 'Propriedades' }).focus()
  await page.keyboard.press('Enter')

  await expect(
    page.getByText('Selecione uma nota para ver suas propriedades.'),
  ).toBeVisible()
})

test('has no critical accessibility violations with the properties tab open', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'nota.md': '---\nprioridade: alta\n---\ncorpo',
  })

  await openNote(page, testInfo, 'nota.md')
  await openPropertiesTab(page, testInfo)
  await expect(page.getByLabel('Valor de prioridade')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
