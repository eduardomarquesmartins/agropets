const DEFAULT_SENDERS = new Set([
  'Agropets <onboarding@resend.dev>',
  'Veterinaria Agropets <onboarding@resend.dev>',
  'Marketing Agropets <onboarding@resend.dev>',
]);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requestWindowMs = 60 * 1000;
const requestLimit = 12;
const requestLog = new Map();
const allowedOrigins = new Set([
  'https://agropetscao.com.br',
  'https://www.agropetscao.com.br',
]);

const setCorsHeaders = (req, res) => {
  const origin = req.headers?.origin;
  if (!allowedOrigins.has(origin)) return;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Vary', 'Origin');
};

const sanitizeHtml = (html) =>
  String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

const isRateLimited = (key) => {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((ts) => now - ts < requestWindowMs);

  if (recent.length >= requestLimit) {
    requestLog.set(key, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(key, recent);
  return false;
};

export const isRecipientAllowed = ({ recipients, user, isMarketing }) =>
  recipients.length === 1
  && recipients.every((email) => emailRegex.test(email))
  && (isMarketing || recipients[0] === user.email);

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to, subject, html, kind } = req.body || {};
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not defined');
    return res.status(500).json({ error: 'Mail server configuration error' });
  }

  let user;
  try {
    user = kind === 'marketing'
      ? await requireAdminUser(req)
      : await requireAuthenticatedUser(req);
  } catch (error) {
    if (error.message === 'Supabase server credentials are not configured.') {
      console.error('Supabase server credentials are not configured');
      return res.status(500).json({ error: 'Mail server configuration error' });
    }
    return res.status(error.statusCode || 401).json({ error: error.message });
  }

  const sender = DEFAULT_SENDERS.has(from) ? from : 'Agropets <onboarding@resend.dev>';
  const recipients = (Array.isArray(to) ? to : [to])
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean);
  const cleanSubject = String(subject || '').trim().slice(0, 160);
  const cleanHtml = sanitizeHtml(html).slice(0, 30000);

  if (isRateLimited(user.id)) {
    return res.status(429).json({ error: 'Too many email requests. Try again later.' });
  }

  if (!isRecipientAllowed({ recipients, user, isMarketing: kind === 'marketing' })) {
    return res.status(400).json({ error: 'Invalid recipient list' });
  }

  if (!cleanSubject || !cleanHtml) {
    return res.status(400).json({ error: 'Subject and HTML content are required' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to: recipients,
        subject: cleanSubject,
        html: cleanHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API Error:', data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
import { requireAdminUser, requireAuthenticatedUser } from './_lib/requestAuth.js';
