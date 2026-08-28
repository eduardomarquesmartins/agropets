import assert from 'node:assert/strict';
import test from 'node:test';
import { isRecipientAllowed, sanitizeHtml } from './send-email.js';

test('permite campanha para cliente somente quando o solicitante é administrador', () => {
  const recipients = ['cliente@exemplo.com'];
  const user = { email: 'admin@agropets.com.br' };

  assert.equal(isRecipientAllowed({ recipients, user, isMarketing: false }), false);
  assert.equal(isRecipientAllowed({ recipients, user, isMarketing: true }), true);
});

test('permite aviso transacional para cliente somente quando solicitado pela equipe', () => {
  const recipients = ['cliente@exemplo.com'];
  const user = { email: 'veterinaria@agropets.com.br' };

  assert.equal(isRecipientAllowed({ recipients, user, isMarketing: false, isStaffNotification: false }), false);
  assert.equal(isRecipientAllowed({ recipients, user, isMarketing: false, isStaffNotification: true }), true);
});

test('mantém notificações comuns restritas ao e-mail do usuário autenticado', () => {
  assert.equal(isRecipientAllowed({
    recipients: ['cliente@exemplo.com'],
    user: { email: 'cliente@exemplo.com' },
    isMarketing: false,
  }), true);
});

test('remove imagens embutidas em Base64 do HTML do e-mail', () => {
  const html = '<p>Oferta</p><img src="data:image/png;base64,AAAA" alt="oferta">';

  assert.equal(sanitizeHtml(html), '<p>Oferta</p><img alt="oferta">');
});
