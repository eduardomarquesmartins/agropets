import http from 'node:http';
import { Buffer } from 'node:buffer';
import process from 'node:process';

const PORT = Number(process.env.TEF_AGENT_PORT || 8787);
const MOCK_ENABLED = String(process.env.TEF_AGENT_MOCK_ENABLED || 'false').toLowerCase() === 'true';
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const PROVIDERS = new Set(['Stone', 'PagBank']);
const CARD_TYPES = new Set(['Debito', 'Credito']);

const sendJson = (res, statusCode, payload, origin) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const readJsonBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
};

const createMockApproval = ({ amount, provider, cardType, installments }) => {
  const now = Date.now().toString();

  return {
    status: 'approved',
    authorizationCode: now.slice(-6),
    nsu: now.slice(-10),
    provider,
    cardType,
    installments,
    brand: 'Visa',
    lastDigits: '1234',
    raw: {
      mock: true,
      amount,
      approvedAt: new Date().toISOString(),
    },
  };
};

const processPayment = async (payload) => {
  const amount = Number(payload.amount);
  const provider = String(payload.provider || '');
  const cardType = String(payload.cardType || '');
  const installments = Math.max(1, Number(payload.installments) || 1);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { statusCode: 400, body: { error: 'Valor da transacao invalido.' } };
  }

  if (!PROVIDERS.has(provider)) {
    return { statusCode: 400, body: { error: 'Adquirente invalida.' } };
  }

  if (!CARD_TYPES.has(cardType)) {
    return { statusCode: 400, body: { error: 'Tipo de cartao invalido.' } };
  }

  if (MOCK_ENABLED) {
    return {
      statusCode: 200,
      body: createMockApproval({ amount, provider, cardType, installments }),
    };
  }

  return {
    statusCode: 501,
    body: {
      error: 'Agente local instalado, mas SDK da maquininha ainda nao configurado.',
      details: 'Configure o conector Stone/PagBank no agente local.',
    },
  };
};

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {}, origin);
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { status: 'ok', mockEnabled: MOCK_ENABLED }, origin);
  }

  if (req.method !== 'POST' || req.url !== '/payment') {
    return sendJson(res, 404, { error: 'Not found' }, origin);
  }

  try {
    const payload = await readJsonBody(req);
    const result = await processPayment(payload);
    return sendJson(res, result.statusCode, result.body, origin);
  } catch (error) {
    console.error('Erro no agente TEF:', error);
    return sendJson(res, 500, { error: 'Erro interno no agente local.' }, origin);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Agente local TEF rodando em http://127.0.0.1:${PORT}`);
  console.log(`Modo simulado: ${MOCK_ENABLED ? 'ligado' : 'desligado'}`);
});
