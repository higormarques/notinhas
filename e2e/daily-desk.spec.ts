import type { Page, TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { connectMockWorkspace } from './mockWorkspace'

const FIXED_TODAY = new Date(2026, 6, 15, 12, 0, 0) // quarta-feira, 15 de julho de 2026
const TODAY_LABEL_PATTERN = /15 de julho de 2026/
const TOGGLE_LABEL = 'Recolher ou estender o Daily Desk'

async function openTreeOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.getByRole('button', { name: 'Abrir navegação' }).focus()
  await page.keyboard.press('Enter')
}

async function closeTreeOnMobile(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'mobile') return
  await page.keyboard.press('Escape')
}

async function openDailyDeskViaShortcut(page: Page) {
  await page.keyboard.press('Control+j')
  await expect(page.getByRole('button', { name: TODAY_LABEL_PATTERN })).toBeVisible()
}

async function focusTodayCell(page: Page) {
  await page.getByRole('button', { name: TODAY_LABEL_PATTERN }).focus()
}

/** No mobile o calendário mora dentro do mesmo sheet recolhível da árvore de arquivos — ao
 * contrário do antigo Dialog do Daily Desk, selecionar um dia não fecha o sheet sozinho, então
 * o editor por trás dele fica encoberto até fechá-lo manualmente (mesmo padrão do `openNote`
 * em note-editor.spec.ts). */
async function pressEnterToSelectDate(page: Page, testInfo: TestInfo) {
  await page.keyboard.press('Enter')
  await closeTreeOnMobile(page, testInfo)
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TODAY)
})

test("creates and opens today's daily note from the calendar, keyboard only", async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  await openDailyDeskViaShortcut(page)
  await focusTodayCell(page)
  await pressEnterToSelectDate(page, testInfo)

  await expect(
    page.getByRole('heading', { name: '2026-07-15.md', level: 2 }),
  ).toBeVisible()
  // O Daily Desk é um painel persistente, não um modal — no desktop/tablet, selecionar um
  // dia não deve escondê-lo (no mobile ele mora dentro do sheet que acabamos de fechar).
  if (testInfo.project.name !== 'mobile') {
    await expect(page.getByRole('button', { name: TODAY_LABEL_PATTERN })).toBeVisible()
  }
})

test('does not show the Daily folder in the file tree', async ({ page }, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    'nota-normal.md': '',
    Daily: { '2026-07-15.md': 'Nota de hoje' },
  })

  await openTreeOnMobile(page, testInfo)
  await expect(
    page.getByRole('treeitem', { name: 'nota-normal', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('treeitem', { name: 'Daily', exact: true })).toHaveCount(0)
  await closeTreeOnMobile(page, testInfo)
})

test('navigates 30 days forward on the calendar via arrow keys, keyboard only', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page)

  const expectedDate = new Date(FIXED_TODAY)
  expectedDate.setDate(expectedDate.getDate() + 30)
  const expectedFileName = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}.md`

  await openDailyDeskViaShortcut(page)
  await focusTodayCell(page)
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press('ArrowRight')
  }
  await pressEnterToSelectDate(page, testInfo)

  await expect(
    page.getByRole('heading', { name: expectedFileName, level: 2 }),
  ).toBeVisible()
})

test('opens an existing daily note without overwriting its content', async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    Daily: { '2026-07-15.md': 'Conteúdo já escrito hoje' },
  })

  await openDailyDeskViaShortcut(page)
  await focusTodayCell(page)
  await pressEnterToSelectDate(page, testInfo)

  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota' })).toHaveText(
    'Conteúdo já escrito hoje',
  )
})

test("migrates incomplete tasks from the most recent prior daily note into today's note", async ({
  page,
}, testInfo) => {
  await connectMockWorkspace(page, 'meu-workspace', {
    Daily: {
      '2026-07-13.md':
        '# 13 de julho\n- [ ] revisar PR\n- [x] tarefa feita\n- [ ] responder email',
    },
  })

  await openDailyDeskViaShortcut(page)
  await focusTodayCell(page)
  await pressEnterToSelectDate(page, testInfo)

  const editor = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await expect(editor).toContainText('Migrado de 2026-07-13')
  await expect(editor).toContainText('revisar PR')
  await expect(editor).toContainText('responder email')

  await openDailyDeskViaShortcut(page)
  await page.getByRole('button', { name: /13 de julho de 2026/ }).focus()
  await pressEnterToSelectDate(page, testInfo)

  const priorEditor = page.getByRole('textbox', { name: 'Conteúdo da nota' })
  await expect(priorEditor).toContainText('tarefa feita')
  await expect(priorEditor).not.toContainText('revisar PR')
})

test('is reachable via the header button as well as the shortcut', async ({ page }) => {
  await connectMockWorkspace(page)

  await page.getByRole('button', { name: 'Abrir Daily Desk' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('button', { name: TODAY_LABEL_PATTERN })).toBeVisible()
})

test('collapses and expands the calendar via the panel toggle, keyboard only', async ({
  page,
}) => {
  await connectMockWorkspace(page)

  await openDailyDeskViaShortcut(page)

  await page.getByRole('button', { name: TOGGLE_LABEL }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: TODAY_LABEL_PATTERN })).toBeHidden()

  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: TODAY_LABEL_PATTERN })).toBeVisible()
})

test('has no critical accessibility violations with the Daily Desk expanded', async ({
  page,
}) => {
  await connectMockWorkspace(page)

  await openDailyDeskViaShortcut(page)

  const results = await new AxeBuilder({ page }).analyze()
  const critical = results.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(critical).toEqual([])
})
