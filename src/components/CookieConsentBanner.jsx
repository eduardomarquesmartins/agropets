import React from 'react'
import { DEFAULT_CONSENT, getStoredConsent, saveConsent } from '../utils/consentManager'
import './CookieConsentBanner.css'

function CookieConsentBanner() {
  const [isVisible, setIsVisible] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)
  const [consent, setConsent] = React.useState(DEFAULT_CONSENT)

  React.useEffect(() => {
    const storedConsent = getStoredConsent()
    if (!storedConsent) {
      setIsVisible(true)
      return
    }

    setConsent(storedConsent)
  }, [])

  const handleAcceptAll = () => {
    const nextConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
    }

    saveConsent(nextConsent)
    setConsent(nextConsent)
    setIsVisible(false)
  }

  const handleRejectOptional = () => {
    const nextConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
    }

    saveConsent(nextConsent)
    setConsent(nextConsent)
    setIsVisible(false)
  }

  const handleSavePreferences = () => {
    saveConsent(consent)
    setIsVisible(false)
    setShowDetails(false)
  }

  if (!isVisible) return null

  return (
    <aside className="cookie-banner" role="dialog" aria-live="polite" aria-label="Preferencias de cookies">
      <div className="cookie-banner__content">
        <p className="cookie-banner__title">Uso de cookies e dados</p>
        <p className="cookie-banner__text">
          Usamos cookies essenciais para o funcionamento do site e, com sua autorizacao, tambem cookies de
          analise e marketing para melhorar sua experiencia. Veja mais na nossa politica de privacidade.
        </p>

        <button type="button" className="cookie-banner__link" onClick={() => setShowDetails((prev) => !prev)}>
          {showDetails ? 'Ocultar preferencias' : 'Personalizar preferencias'}
        </button>

        {showDetails && (
          <div className="cookie-banner__options">
            <label className="cookie-banner__option">
              <input type="checkbox" checked disabled />
              <span>Cookies necessarios (sempre ativos)</span>
            </label>

            <label className="cookie-banner__option">
              <input
                type="checkbox"
                checked={consent.analytics}
                onChange={(event) => setConsent((prev) => ({ ...prev, analytics: event.target.checked }))}
              />
              <span>Cookies de analise</span>
            </label>

            <label className="cookie-banner__option">
              <input
                type="checkbox"
                checked={consent.marketing}
                onChange={(event) => setConsent((prev) => ({ ...prev, marketing: event.target.checked }))}
              />
              <span>Cookies de marketing</span>
            </label>
          </div>
        )}

        <div className="cookie-banner__actions">
          <button type="button" className="cookie-banner__button cookie-banner__button--ghost" onClick={handleRejectOptional}>
            Recusar opcionais
          </button>
          {showDetails && (
            <button type="button" className="cookie-banner__button cookie-banner__button--secondary" onClick={handleSavePreferences}>
              Salvar preferencias
            </button>
          )}
          <button type="button" className="cookie-banner__button cookie-banner__button--primary" onClick={handleAcceptAll}>
            Aceitar todos
          </button>
        </div>

        <a href="/politica-de-privacidade" className="cookie-banner__privacy-link">
          Ler politica de privacidade
        </a>
      </div>
    </aside>
  )
}

export default CookieConsentBanner
