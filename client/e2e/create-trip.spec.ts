import { test, expect } from '@playwright/test'
import { dismissSystemNotices } from './helpers'

// Trip lifecycle (core): from the dashboard, open the new-trip form, name the
// trip, submit, and confirm it shows up on the dashboard. Exercises the whole
// authenticated stack — dashboard → creation form → POST /api/trips → store →
// re-render — against the real backend + isolated test DB.
test('create a trip and see it on the dashboard', async ({ page }) => {
  await page.goto('/dashboard')

  // The release notice greets a freshly seeded user and its backdrop eats the click below.
  await dismissSystemNotices(page)

  // The "+ New Trip" card is always rendered in the default (planned) filter.
  await page.locator('.add-trip-card').click()

  const title = `E2E Trip ${Date.now()}`
  await page.getByPlaceholder('For example: Lisbon, Orlando, Tokyo...').fill(title)
  await page.getByRole('button', { name: 'Create New Trip' }).click()

  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
})
