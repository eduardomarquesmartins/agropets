import assert from 'node:assert/strict';
import test from 'node:test';
import { isRecipientAllowed } from './send-email.js';

test('permite campanha para cliente somente quando o solicitante é administrador', () => {
  const recipients = ['cliente@exemplo.com'];
  const user = { email: 'admin@agropets.com.br' };

  assert.equal(isRecipientAllowed({ recipients, user, isMarketing: false }), false);
  assert.equal(isRecipientAllowed({ recipients, user, isMarketing: true }), true);
});

test('mantém notificações comuns restritas ao e-mail do usuário autenticado', () => {
  assert.equal(isRecipientAllowed({
    recipients: ['cliente@exemplo.com'],
    user: { email: 'cliente@exemplo.com' },
    isMarketing: false,
  }), true);
});
