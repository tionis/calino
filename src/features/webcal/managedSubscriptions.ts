export interface ManagedSubscription {
  id: string
  name: string
  enabled: boolean
  lastSuccessAt: string | null
  lastError: string | null
}

interface ManagedSubscriptionResponse {
  csrfToken: string
  subscriptions: ManagedSubscription[]
}

let csrfToken = ''

async function parseResponse(response: Response): Promise<ManagedSubscriptionResponse> {
  const value = (await response.json()) as Partial<ManagedSubscriptionResponse> & { error?: string }
  if (!response.ok)
    throw new Error(value.error || `Subscription service returned ${response.status}`)
  if (!value.csrfToken || !Array.isArray(value.subscriptions)) {
    throw new Error('Subscription service returned an invalid response.')
  }
  csrfToken = value.csrfToken
  return value as ManagedSubscriptionResponse
}

export async function loadManagedSubscriptions(baseUrl: string): Promise<ManagedSubscription[]> {
  const response = await fetch(baseUrl, { credentials: 'same-origin' })
  return (await parseResponse(response)).subscriptions
}

export async function changeManagedSubscriptions(
  baseUrl: string,
  action: string,
  body: Record<string, unknown> = {}
): Promise<ManagedSubscription[]> {
  if (!csrfToken) await loadManagedSubscriptions(baseUrl)
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${action}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(body),
  })
  return (await parseResponse(response)).subscriptions
}
