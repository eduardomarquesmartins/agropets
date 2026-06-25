const DEFAULT_LOCAL_TEF_URL = 'http://127.0.0.1:8787/payment';

const getLocalTefUrl = () => import.meta.env.VITE_LOCAL_TEF_URL || DEFAULT_LOCAL_TEF_URL;

export const tefService = {
  requestPayment: async ({ amount, provider, cardType, installments, reference, metadata }) => {
    const response = await fetch(getLocalTefUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        provider,
        cardType,
        installments,
        reference,
        metadata,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao comunicar com o agente local da maquininha.');
    }

    return data;
  },
};
