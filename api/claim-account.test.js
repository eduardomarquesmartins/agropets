import assert from 'node:assert/strict';
import test from 'node:test';
import { createClaimAccountHandler } from './claim-account.js';

const response = () => {
  const state = { statusCode: null, body: null };
  return { state, status(code) { state.statusCode = code; return this; }, json(body) { state.body = body; return this; } };
};
const query = (result) => {
  const chain = { select: () => chain, ilike: () => chain, is: () => chain, eq: () => chain, maybeSingle: async () => result };
  return chain;
};

test('does not create an account when the phone does not match the existing customer', async () => {
  let createCalls = 0;
  const handler = createClaimAccountHandler({ getClient: () => ({
    from: () => query({ data: { id: 'customer-1', phone: '(51) 99999-1111' }, error: null }),
    auth: { admin: { createUser: async () => { createCalls += 1; } } },
  }) });
  const res = response();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': 'test-mismatch' }, body: { email: 'cliente@exemplo.com', phone: '(51) 98888-0000', password: 'senha-segura-123' } }, res);
  assert.equal(res.state.statusCode, 400);
  assert.equal(createCalls, 0);
});

test('creates an email-confirmed Auth account only after phone verification and link confirmation', async () => {
  let customerLookup = 0;
  let createdPayload;
  const handler = createClaimAccountHandler({ getClient: () => ({
    from: () => query(customerLookup++ === 0 ? { data: { id: 'customer-1', phone: '51999991111' }, error: null } : { data: { id: 'customer-1' }, error: null }),
    auth: { admin: {
      createUser: async (payload) => { createdPayload = payload; return { data: { user: { id: 'auth-1' } }, error: null }; },
      deleteUser: async () => ({ error: null }),
    } },
  }) });
  const res = response();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': 'test-success' }, body: { email: 'Cliente@Exemplo.Com ', phone: '(51) 99999-1111', password: 'senha-segura-123' } }, res);
  assert.equal(res.state.statusCode, 201);
  assert.deepEqual(createdPayload, { email: 'cliente@exemplo.com', password: 'senha-segura-123', email_confirm: true });
});
