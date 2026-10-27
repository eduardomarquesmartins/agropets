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

const localApiPlugin = () => ({
  name: 'local-api',
  configureServer(server) {
    server.middlewares.use('/api/tef-payment', async (req, res) => {
      req.body = await readJsonBody(req).catch(() => ({}));

      const response = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          res.statusCode = this.statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        },
      };

      const { default: tefPaymentHandler } = await import('./api/tef-payment.js');
      await tefPaymentHandler(req, response);
    });

    server.middlewares.use('/api/admin-users', async (req, res) => {
      req.body = await readJsonBody(req).catch(() => ({}));

      const response = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          res.statusCode = this.statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        },
        end() {
          res.statusCode = this.statusCode;
          res.end();
        },
      };

      try {
        const { default: adminUsersHandler } = await import('./api/admin-users.js');
        await adminUsersHandler(req, response);
      } catch (error) {
        console.error('Local admin-users API error:', error);
        if (!res.writableEnded) {
          res.statusCode = error.statusCode || 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
        }
      }
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
