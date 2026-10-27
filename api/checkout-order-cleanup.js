import { getSupabaseServerClient } from './_lib/supabase.js';
import { requireAuthenticatedUser } from './_lib/requestAuth.js';

const cleanupWindowMs = 10 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const user = await requireAuthenticatedUser(req);
    const orderId = String(req.body?.order_id || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      return res.status(400).json({ error: 'Pedido não informado.' });
    }

    const client = getSupabaseServerClient();
    const { data: order, error: lookupError } = await client
      .from('orders')
      .select('id, customer_auth_id, status, payment_status, commission_payout_id, created_at')
      .eq('id', orderId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!order || order.customer_auth_id !== user.id) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const ageMs = Date.now() - new Date(order.created_at).getTime();
    if (
      order.status !== 'Pendente'
      || order.payment_status !== 'pending'
      || order.commission_payout_id
      || !Number.isFinite(ageMs)
      || ageMs < 0
      || ageMs > cleanupWindowMs
    ) {
      return res.status(409).json({ error: 'Este pedido não pode ser removido automaticamente.' });
    }

    const { data: deletedOrder, error: deleteError } = await client
      .from('orders')
      .delete()
      .eq('id', order.id)
      .eq('customer_auth_id', user.id)
      .eq('status', 'Pendente')
      .eq('payment_status', 'pending')
      .is('commission_payout_id', null)
      .gte('created_at', new Date(Date.now() - cleanupWindowMs).toISOString())
      .select('id')
      .maybeSingle();

    if (deleteError) throw deleteError;
    if (!deletedOrder) {
      return res.status(409).json({ error: 'O pedido mudou e não pode ser removido automaticamente.' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Checkout order cleanup error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Não foi possível limpar o pedido incompleto.',
    });
  }
}

