const STORAGE_KEY = 'agropets-seller-referral';
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const captureSellerReferral = (search = '') => {
  try {
    const code = new URLSearchParams(search).get('ref')?.trim();
    if (code) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, capturedAt: Date.now() }));
    }
  } catch (error) {
    console.warn('Não foi possível guardar o link do vendedor:', error);
  }
};

export const getSellerReferralCode = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved?.code || Date.now() - saved.capturedAt > ATTRIBUTION_WINDOW_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return String(saved.code).slice(0, 80);
  } catch {
    return null;
  }
};

export const clearSellerReferral = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be disabled by the browser; attribution is optional.
  }
};
