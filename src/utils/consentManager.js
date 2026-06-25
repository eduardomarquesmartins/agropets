const CONSENT_KEY = 'agropets_cookie_consent'

export const DEFAULT_CONSENT = {
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: null,
}

export function getStoredConsent() {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(CONSENT_KEY)
    if (!rawValue) return null

    const parsedValue = JSON.parse(rawValue)

    return {
      ...DEFAULT_CONSENT,
      ...parsedValue,
      necessary: true,
    }
  } catch {
    return null
  }
}

export function saveConsent(nextConsent) {
  if (typeof window === 'undefined') return

  const normalizedConsent = {
    ...DEFAULT_CONSENT,
    ...nextConsent,
    necessary: true,
    updatedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(normalizedConsent))
  window.dispatchEvent(new CustomEvent('consent-updated', { detail: normalizedConsent }))
}

export function hasConsent(category) {
  const consent = getStoredConsent()
  if (!consent) return false
  return Boolean(consent[category])
}

export { CONSENT_KEY }
