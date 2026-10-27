import { getSupabaseServerClient } from './_lib/supabase.js';
import { requireAdminUser } from './_lib/requestAuth.js';

const paymentMethods = new Set(['pix', 'transfer', 'cash', 'other']);

export default async function handler(req, res) {
  try {
    const admin = await requireAdminUser(req);
    const client = getSupabaseServerClient();

    if (req.method === 'GET') {
      const { data, error } = await client
        .from('seller_commission_payouts')
        .select('id, seller_id, seller_name, amount, order_ids, payment_method, reference, notes, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.status(200).json({ payouts: data || [] });
    }

    if (req.method === 'POST') {
      const sellerId = String(req.body?.seller_id || '');
      const orderIds = Array.isArray(req.body?.order_ids) ? [...new Set(req.body.order_ids.map(String))] : [];
      const paymentMethod = String(req.body?.payment_method || '');
      const reference = String(req.body?.reference || '').trim().slice(0, 120);
      const notes = String(req.body?.notes || '').trim().slice(0, 500);

      if (!sellerId || !orderIds.length || orderIds.length > 500 || !paymentMethods.has(paymentMethod)) {
        return res.status(400).json({ error: 'Informe vendedor, pedidos e forma de pagamento válidos.' });
      }

      const { data, error } = await client.rpc('record_seller_commission_payout', {
        p_seller_id: sellerId,
        p_order_ids: orderIds,
        p_payment_method: paymentMethod,
        p_reference: reference || null,
        p_notes: notes || null,
        p_created_by: admin.id,
      });
      if (error) throw error;
      return res.status(201).json({ payout: data });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Seller commission payout API error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Não foi possível registrar o repasse.' });
  }
}

