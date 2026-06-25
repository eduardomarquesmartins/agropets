import crypto from 'node:crypto';
const PROVIDERS = new Set(['Stone', 'PagBank']);
const CARD_TYPES = new Set(['Debito', 'Credito']);

const getTefEndpoint = (provider) => {
  const providerKey = provider === 'PagBank' ? 'PAGBANK' : 'STONE';
  return process.env[`TEF_${providerKey}_API_URL`] || process.env.TEF_API_URL;
};

const getTefApiKey = (provider) => {
  const providerKey = provider === 'PagBank' ? 'PAGBANK' : 'STONE';
  return process.env[`TEF_${providerKey}_API_KEY`] || process.env.TEF_API_KEY;
};

const isMockEnabled = () => String(process.env.TEF_MOCK_ENABLED || '').toLowerCase() === 'true';

const createMockApproval = ({ amount, provider, cardType, installments }) => {
  const now = Date.now().toString();
  return {
    status: 'approved',
    authorizationCode: now.slice(-6),
    nsu: now.slice(-10),
    raw: {
      mock: true,
      provider,
      payment_type: cardType === 'Credito' ? 'credit' : 'debit',
      amount,
      installments,
      approved_at: new Date().toISOString(),
    },
  };
};

const normalizeTefResponse = (data) => {
  const rawStatus = String(data?.status || data?.payment_status || data?.situacao || '').toLowerCase();
  const approvedStatuses = new Set(['approved', 'authorized', 'completed', 'success', 'paid', 'aprovado', 'autorizado']);
  const pendingStatuses = new Set(['pending', 'processing', 'created', 'in_progress', 'pendente', 'processando']);

  const authorizationCode =
    data?.authorization_code ||
    data?.authorizationCode ||
    data?.auth_code ||
    data?.authCode ||
    data?.codigo_autorizacao ||
    data?.codigoAutorizacao ||
    '';

  const nsu =
    data?.nsu_host ||
    data?.nsuHost ||
    data?.host_nsu ||
    data?.transaction_nsu ||
    data?.transactionNsu ||
    data?.nsu ||
    data?.transaction_id ||
    data?.transactionId ||
    '';

  if (approvedStatuses.has(rawStatus) || authorizationCode || nsu) {
    return {
      status: 'approved',
      authorizationCode: String(authorizationCode || nsu),
      nsu: String(nsu || authorizationCode),
      raw: data,
    };
  }

  if (pendingStatuses.has(rawStatus)) {
    return {
      status: 'pending',
      operationId: data?.id || data?.operation_id || data?.transaction_id || null,
      raw: data,
    };
  }

  return {
    status: 'rejected',
    message: data?.message || data?.error || data?.reason || 'Transacao TEF nao autorizada.',
    raw: data,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const amount = Number(req.body?.amount);
  const provider = String(req.body?.provider || '');
  const cardType = String(req.body?.cardType || '');
  const installments = Math.max(1, Number(req.body?.installments) || 1);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valor da transacao invalido.' });
  }

  if (!PROVIDERS.has(provider)) {
    return res.status(400).json({ error: 'Adquirente TEF invalida.' });
  }

  if (!CARD_TYPES.has(cardType)) {
    return res.status(400).json({ error: 'Tipo de cartao invalido.' });
  }

  if (isMockEnabled()) {
    return res.status(200).json(createMockApproval({ amount, provider, cardType, installments }));
  }

  const endpoint = getTefEndpoint(provider);
  const apiKey = getTefApiKey(provider);

  if (!endpoint) {
    return res.status(501).json({
      error: 'TEF nao configurado. Defina TEF_API_URL ou TEF_STONE_API_URL/TEF_PAGBANK_API_URL no ambiente.',
    });
  }

  const payload = {
    operation_type: 'payment',
    value: Number(amount.toFixed(2)),
    amount: Number(amount.toFixed(2)),
    amount_cents: Math.round(amount * 100),
    provider,
    payment_type: cardType === 'Credito' ? 'credit' : 'debit',
    installments,
    external_reference: req.body?.reference || crypto.randomUUID(),
    metadata: req.body?.metadata || {},
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error || data?.message || 'Erro ao comunicar com a TEF.',
        details: data,
      });
    }

    return res.status(200).json(normalizeTefResponse(data));
  } catch (error) {
    console.error('TEF payment error:', error);
    return res.status(500).json({
      error: error.name === 'AbortError' ? 'Tempo limite da TEF excedido.' : 'Erro interno na comunicacao TEF.',
    });
  } finally {
    clearTimeout(timeout);
  }
}
