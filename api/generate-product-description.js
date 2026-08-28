const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
import { requireStaffUser } from './_lib/requestAuth.js';

const sanitizeText = (value, maxLength = 300) =>
  String(value || '')
    .replace(/[<>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const buildPrompt = ({ name, brand, category, price, tone }) => `
Voce e um copywriter de e-commerce premium especializado em agropecuaria e pet shop.
Crie uma descricao de produto em HTML simples e seguro para o produto abaixo.

Produto: ${name}
Marca: ${brand || 'Agropets'}
Categoria: ${category || 'Geral'}
Preco: R$ ${price || '0,00'}
Tom: ${tone || 'professional'}

Regras:
- Retorne somente HTML valido.
- Nao inclua scripts, estilos, markdown ou comentarios.
- Use no maximo: um h3, dois paragrafos e uma lista ul curta.
- Destaque beneficios reais e linguagem comercial clara.
`.trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireStaffUser(req);
  } catch (error) {
    return res.status(error.statusCode || 401).json({ error: error.message });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI server key is not configured' });
  }

  const name = sanitizeText(req.body?.name, 160);
  const brand = sanitizeText(req.body?.brand, 120);
  const category = sanitizeText(req.body?.category, 120);
  const price = sanitizeText(req.body?.price, 40);
  const tone = sanitizeText(req.body?.tone, 40);

  if (!name) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: buildPrompt({ name, brand, category, price, tone }),
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return res.status(response.status).json({
        error: data?.error?.message || 'Failed to generate description',
      });
    }

    const html = data?.choices?.[0]?.message?.content?.trim();

    if (!html) {
      return res.status(502).json({ error: 'Empty response from model' });
    }

    return res.status(200).json({ html });
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'Generation timed out' : 'Internal server error';
    console.error('Error generating product description:', error);
    return res.status(500).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
