import { expect, test, type Page } from '@playwright/test'

// Ciclo completo del portafolio: gate → escena WebGL + tarjeta → back restaura el
// gate. Cada test verifica además 0 errores de consola (regla del proyecto).

const ENTER_BUTTON = 'ingresar con sonido'
const GATE = '.intro-gate'
const GATE_HIDDEN = '.intro-gate--hidden'
const WEBGL_CANVAS = '.webgl-canvas'
const CONSTELLATION = '.constellation-grid'
const CONSTELLATION_LINES = '.constellation-lines'

const collectConsoleErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

test('gate visible en carga con constelación activa', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')

  await expect(page.getByRole('button', { name: ENTER_BUTTON })).toBeVisible()
  await expect(page.locator(GATE)).toBeVisible()
  await expect(page.locator(CONSTELLATION)).toHaveCount(1)
  await expect(page.locator(CONSTELLATION_LINES)).toHaveCount(1)

  // el canvas de la escena no existe hasta entrar
  await expect(page.locator(WEBGL_CANVAS)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('enter: gate oculto + escena WebGL + tarjeta', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')

  await page.getByRole('button', { name: ENTER_BUTTON }).click()

  // salida asimétrica 1.8 s + visibility hidden a los 1.9 s
  await expect(page.locator(GATE)).toHaveClass(/intro-gate--hidden/, { timeout: 5_000 })
  await expect(page.locator(GATE)).toBeHidden({ timeout: 5_000 })
  await expect(page.locator(WEBGL_CANVAS)).toBeVisible()

  // URL limpia sin hash
  await expect.poll(() => page.url()).not.toContain('#')
  expect(errors).toEqual([])
})

test('back restaura el gate', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')

  await page.getByRole('button', { name: ENTER_BUTTON }).click()
  await expect(page.locator(GATE)).toBeHidden({ timeout: 5_000 })
  await expect(page.locator(WEBGL_CANVAS)).toBeVisible()

  await page.goBack()
  await expect(page.locator(GATE)).toBeVisible({ timeout: 5_000 })
  expect(errors).toEqual([])
})

test('mobile 390×844 sin overflow', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = collectConsoleErrors(page)
  await page.goto('/')

  await expect(page.getByRole('button', { name: ENTER_BUTTON })).toBeVisible()
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasOverflow).toBe(false)

  await page.getByRole('button', { name: ENTER_BUTTON }).click()
  await expect(page.locator(GATE)).toBeHidden({ timeout: 5_000 })
  const hasOverflowAfter = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasOverflowAfter).toBe(false)
  expect(errors).toEqual([])
  await page.close()
})