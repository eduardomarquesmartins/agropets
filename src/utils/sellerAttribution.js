const STORAGE_KEY = 'agropets-seller-referral';

export const captureSellerReferral = (search = '') => {
  try {
    const code = new URLSearchParams(search).get('ref')?.trim();
    localStorage.removeItem(STORAGE_KEY);

    if (code) {
      sessionStorage.setItem(STORAGE_KEY, code.slice(0, 80));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Não foi possível guardar o link do vendedor:', error);
  }
};

export const getSellerReferralCode = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY)?.slice(0, 80) || null;
  } catch {
    return null;
  }
};

export const clearSellerReferral = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be disabled by the browser; attribution is optional.
  }
};
