import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'node:buffer'
import process from 'node:process'
// import tefPaymentHandler from './api/tef-payment.js' (removido para evitar erro no build)

const readJsonBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
};

const localApiHandlers = {
  '/api/admin-users': './api/admin-users.js',
  '/api/claim-account': './api/claim-account.js',
  '/api/checkout-order-cleanup': './api/checkout-order-cleanup.js',
  '/api/generate-product-description': './api/generate-product-description.js',
  '/api/seller-commission-payouts': './api/seller-commission-payouts.js',
  '/api/send-email': './api/send-email.js',
  '/api/tef-payment': './api/tef-payment.js',
};

const createLocalApiMiddleware = (handlerPath) => async (req, res) => {
  try {
    req.body = await readJsonBody(req);
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Corpo da requisição JSON inválido.' }));
    return;
  }

  const response = {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    end(body) {
      res.end(body);
    },
  };

  try {
    const { default: handler } = await import(handlerPath);
    await handler(req, response);
    if (!res.writableEnded) res.end();
  } catch (error) {
    console.error(`Local API error (${handlerPath}):`, error);
    if (!res.writableEnded) {
      res.statusCode = error.statusCode || 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
    }
  }
};

const localApiPlugin = () => ({
  name: 'local-api',
  configureServer(server) {
    Object.entries(localApiHandlers).forEach(([route, handlerPath]) => {
      server.middlewares.use(route, createLocalApiMiddleware(handlerPath));
    });
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), localApiPlugin()],
  };
})

