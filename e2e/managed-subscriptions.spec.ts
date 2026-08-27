import { expect, test } from '@playwright/test'
import { clearState } from './fixtures/localstorage'

test('server-managed subscriptions are configured in Sync settings', async ({ page }) => {
  await clearState(page)
  let subscriptions: Array<Record<string, unknown>> = []

  await page.route('**/e2e-managed-subscriptions**', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      expect(request.headers()['x-csrf-token']).toBe('invented-csrf-token')
      const body = request.postDataJSON() as Record<string, unknown>
      subscriptions = [
        {
          id: 'a'.repeat(32),
          name: body.name,
          enabled: true,
          lastSuccessAt: '2026-08-27T12:00:00+00:00',
          lastError: null,
        },
      ]
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'invented-csrf-token', subscriptions }),
    })
  })

  await page.goto('/settings?tab=caldav')
  await expect(page.locator('[data-component="managed-subscriptions"]')).toBeVisible()
  await page.getByLabel('Server subscription name').fill('Train timetable')
  await page.getByLabel('Server subscription URL').fill('https://example.com/train.ics')
  await page.getByRole('button', { name: 'Add server subscription' }).click()

  await expect(page.locator('[data-component="managed-subscription-row"]')).toContainText(
    'Train timetable'
  )
})
