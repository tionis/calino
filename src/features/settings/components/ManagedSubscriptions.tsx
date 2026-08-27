import type { FormEvent, JSX } from 'react'
import { useEffect, useState } from 'react'
import { config } from '@/config'
import {
  changeManagedSubscriptions,
  loadManagedSubscriptions,
  type ManagedSubscription,
} from '@/features/webcal/managedSubscriptions'
import styles from './Settings.module.css'

export function ManagedSubscriptions(): JSX.Element | null {
  const endpoint = config.managedSubscriptionsUrl
  const [subscriptions, setSubscriptions] = useState<ManagedSubscription[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!endpoint) return
    let cancelled = false
    void loadManagedSubscriptions(endpoint).then(
      (loaded) => {
        if (!cancelled) setSubscriptions(loaded)
      },
      (reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : 'Could not load server subscriptions.'
          )
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [endpoint])

  if (!endpoint) return null

  const run = async (action: string, body: Record<string, unknown> = {}): Promise<boolean> => {
    setBusy(action)
    setError('')
    try {
      setSubscriptions(await changeManagedSubscriptions(endpoint, action, body))
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Subscription action failed.')
      return false
    } finally {
      setBusy(null)
    }
  }

  const add = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (await run('add', { name: name.trim(), url: url.trim() })) {
      setName('')
      setUrl('')
    }
  }

  return (
    <div className={styles.group} data-component="managed-subscriptions">
      <div className={styles.groupLabel}>Server-synced subscriptions</div>
      <p className={styles.groupDescription}>
        These read-only calendars are synchronized on the server and appear in every CalDAV client.
      </p>
      {subscriptions.map((subscription) => (
        <div
          className={styles.accountRow}
          key={subscription.id}
          data-component="managed-subscription-row"
        >
          <div className={styles.accountInfo}>
            <div className={styles.accountName}>{subscription.name}</div>
            <div className={styles.accountStatus}>
              <div
                className={`${styles.statusDot} ${subscription.lastError ? styles.statusDotWarn : styles.statusDotOk}`}
              />
              {subscription.lastError || (subscription.enabled ? 'Enabled' : 'Paused')}
              {subscription.lastSuccessAt
                ? ` · synced ${new Date(subscription.lastSuccessAt).toLocaleString()}`
                : ''}
            </div>
          </div>
          <div className={styles.accountActions}>
            <button
              className={styles.rowBtn}
              disabled={busy !== null}
              onClick={() =>
                void run(`${subscription.id}/${subscription.enabled ? 'pause' : 'resume'}`)
              }
              type="button"
            >
              {subscription.enabled ? 'Pause' : 'Resume'}
            </button>
            <button
              className={styles.rowBtn}
              disabled={busy !== null}
              onClick={() => void run(`${subscription.id}/sync`)}
              type="button"
            >
              Sync now
            </button>
            <button
              className={styles.rowBtn}
              disabled={busy !== null}
              onClick={() => void run(`${subscription.id}/remove`)}
              type="button"
            >
              Stop syncing
            </button>
            <button
              className={styles.disconnect}
              disabled={busy !== null}
              onClick={() => {
                if (confirm(`Delete ${subscription.name} and its calendar?`))
                  void run(`${subscription.id}/delete`, { confirm: true })
              }}
              type="button"
            >
              Delete calendar
            </button>
          </div>
        </div>
      ))}
      <form className={styles.subscriptionForm} onSubmit={(event) => void add(event)}>
        <input
          aria-label="Server subscription name"
          className={styles.formInput}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          placeholder="Calendar name"
          required
          value={name}
        />
        <input
          aria-label="Server subscription URL"
          className={styles.formInput}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.net/calendar.ics"
          required
          type="url"
          value={url}
        />
        <button className={styles.actionBtn} disabled={busy !== null} type="submit">
          {busy === 'add' ? 'Adding…' : 'Add server subscription'}
        </button>
      </form>
      {error && (
        <p className={styles.subscriptionError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
