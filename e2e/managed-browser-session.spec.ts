import { test, expect } from '@playwright/test'
import { clearState, seedAccount } from './fixtures/localstorage'

test('managed browser-session account is not duplicated when its trailing slash differs', async ({
  page,
  baseURL,
}) => {
  await clearState(page)
  await seedAccount(page, {
    id: 'managed-account',
    name: 'Calendar',
    serverUrl: `${baseURL}/mock-caldav`,
    username: '',
    password: '',
  })

  await page.goto('/settings?tab=caldav')
  await expect(page.locator('[data-component="account-row"]')).toHaveCount(1)
  await expect(page.locator('[data-component="account-row"]')).toHaveAttribute(
    'data-account-name',
    'Calendar'
  )

  await page.reload()
  await expect(page.locator('[data-component="account-row"]')).toHaveCount(1)
})
