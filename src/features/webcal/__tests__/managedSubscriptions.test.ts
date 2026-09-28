import { describe, it, expect, vi, afterEach } from 'vitest'
import { changeManagedSubscriptions, loadManagedSubscriptionSource } from '../managedSubscriptions'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('managed subscription feed URLs', () => {
  it('loads the source URL for one subscription without caching', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ url: 'https://example.com/feed.ics' }), { status: 200 })
      )
    globalThis.fetch = fetchMock as typeof fetch

    await expect(loadManagedSubscriptionSource('/subscriptions/api/', 'abc')).resolves.toBe(
      'https://example.com/feed.ics'
    )
    expect(fetchMock).toHaveBeenCalledWith('/subscriptions/api/abc/source', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
  })

  it('reports service errors instead of returning a URL', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'subscription not found' }), { status: 404 })
      ) as typeof fetch

    await expect(loadManagedSubscriptionSource('/api', 'missing')).rejects.toThrow(
      'subscription not found'
    )
  })

  it('posts a changed URL to the source action', async () => {
    const listed = { csrfToken: 'token', subscriptions: [] }
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(listed), { status: 200 }))
      )
    globalThis.fetch = fetchMock as typeof fetch

    await changeManagedSubscriptions('/api', 'abc/source', { url: 'https://example.com/new.ics' })

    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    expect(url).toBe('/api/abc/source')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ url: 'https://example.com/new.ics' }))
  })
})
