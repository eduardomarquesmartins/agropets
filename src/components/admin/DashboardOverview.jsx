import React, { useState } from 'react';
import { 
  Activity, Clock, ArrowUpRight, Zap, ShoppingBag, Search, X, CreditCard
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useOrderStore } from '../../store/orderStore';
import { useCustomerStore } from '../../store/customerStore';
import { useFinancialStore } from '../../store/financialStore';
import { usePetStore } from '../../store/petStore';
import { useAuthStore } from '../../store/authStore';

const DashboardOverview = ({ setActiveTab }) => {
  const { orders } = useOrderStore();
  const { customers } = useCustomerStore();
  const { transactions } = useFinancialStore();
  const { pets } = usePetStore();
  const { user } = useAuthStore();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const totalRevenue = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const activeOrdersCount = orders.filter(o => o.status !== 'Concluído' && o.status !== 'Cancelado').length;
  const totalCustomersCount = customers.length;
  
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const dayTotal = transactions
      .filter(t => t.type === 'income' && t.date.startsWith(dateStr))
      .reduce((acc, t) => acc + t.amount, 0);
    return { name: dayName.charAt(0).toUpperCase() + dayName.slice(1), vendas: dayTotal };
  });

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Olá, {(user?.name || 'Admin').split(' ')[0]}!</h1>
          <p>Veja o que está acontecendo na sua loja hoje.</p>
        </div>
      </div>

      <div className="bento-grid">
        <div className="bento-item p-accent bento-span-8" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '120%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', transform: 'rotate(-15deg)', pointerEvents: 'none' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', position: 'relative', zIndex: 2 }}>
            <div>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.8, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>Faturamento Semanal</h3>
              <div className="value" style={{ margin: '0.25rem 0', color: 'white', fontSize: '2.8rem', fontWeight: 900 }}>R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="status-capsule" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)', padding: '8px 14px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Activity size={14} className="pulse" />
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Monitorando</span>
            </div>
          </div>
          <div style={{ width: '100%', marginTop: '1rem', flex: 1 }}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last7Days} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'white', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem' }}
                  formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                />
                <Line type="monotone" dataKey="vendas" stroke="#ffffff" strokeWidth={3} dot={{ r: 4, fill: '#15803d', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="bento-item bento-stat">
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-p)', textTransform: 'uppercase' }}>Pedidos Ativos</h3>
            <div className="value" style={{ fontSize: '2.2rem', fontWeight: 900 }}>{activeOrdersCount}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-p)' }}>
              <Clock size={12} /> {orders.length} total
            </div>
          </div>
          <div className="bento-item bento-stat">
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-p)', textTransform: 'uppercase' }}>Base de Clientes</h3>
            <div className="value" style={{ fontSize: '2.2rem', fontWeight: 900 }}>{totalCustomersCount}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-p)' }}>Pets ativos: {pets.length}</div>
          </div>
        </div>

        <div className="bento-item bento-span-12" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="section-header-admin" style={{ padding: '1.5rem 2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '4px', height: '24px', background: 'var(--brand-p)', borderRadius: '2px' }}></div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>Últimas Operações</h3>
            </div>
            <button className="btn-secondary-modern" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }} onClick={() => setActiveTab('orders')}>
              Gerenciar Todos <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="admin-table-wrapper" style={{ padding: '0 1rem 1.5rem' }}>
            <table className="admin-table" style={{ marginTop: '1rem', border: '1px solid var(--border)', borderRadius: '12px', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ background: '#fcfcfd', borderRadius: '12px 0 0 0', padding: '1rem' }}>ID</th>
                  <th style={{ background: '#fcfcfd' }}>Cliente</th>
                  <th style={{ background: '#fcfcfd' }}>Status</th>
                  <th style={{ background: '#fcfcfd', textAlign: 'right', padding: '1rem' }}>Total</th>
                  <th style={{ background: '#fcfcfd', borderRadius: '0 12px 0 0', padding: '1rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-p)', padding: '1rem' }}>{(order.id || '').toString().slice(0, 8)}</td>
                    <td style={{ padding: '1rem' }}>
                      <div className="user-cell">
                        <span style={{ fontWeight: 700 }}>{order.customer_name || 'Cliente'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`status-capsule ${order.status === 'Concluído' ? 'green' : order.status === 'Cancelado' ? 'gray' : 'orange'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, padding: '1rem' }}>R$ {(Number(order.total) || 0).toFixed(2).replace('.', ',')}</td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        className="btn-action-outline edit"
                        title="Ver detalhes"
                        onClick={() => setSelectedOrder(order)}
                        style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Search size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Sem vendas recentes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content bento-item scale-in" style={{ maxWidth: '580px', background: 'white', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Pedido #{selectedOrder.order_number || (selectedOrder.id || '').slice(0, 8)}
              </h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '1.5rem 2rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Cliente e entrega */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.4, margin: '0 0 6px' }}>Cliente</p>
                  <p style={{ fontWeight: 800, margin: 0 }}>{selectedOrder.customer_name}</p>
                  <p style={{ margin: '3px 0', fontSize: '0.85rem', color: 'var(--brand-p)', fontWeight: 700 }}>{selectedOrder.whatsapp}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>{selectedOrder.email}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.4, margin: '0 0 6px' }}>Entrega</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedOrder.address?.endereco}, {selectedOrder.address?.numero}
                  </p>
                  <p style={{ margin: '3px 0', fontSize: '0.85rem', opacity: 0.7 }}>{selectedOrder.address?.bairro}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>CEP: {selectedOrder.cep}</p>
                </div>
              </div>

              {/* Itens */}
              <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.4, margin: '0 0 10px' }}>Itens do Pedido</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: 'var(--brand-p)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 900 }}>
                        {item.quantity || item.qty}x
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                      R$ {((item.price || 0) * (item.quantity || item.qty || 1)).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div style={{ background: 'var(--brand-p-soft)', borderRadius: '14px', padding: '1.25rem', border: '1px solid var(--brand-p-light)' }}>
                {[
                  { label: 'Subtotal', value: `R$ ${(Number(selectedOrder.subtotal) || 0).toFixed(2).replace('.', ',')}` },
                  selectedOrder.discount > 0 && { label: 'Desconto', value: `- R$ ${(Number(selectedOrder.discount) || 0).toFixed(2).replace('.', ',')}`, color: '#15803d' },
                  { label: 'Taxa de Entrega', value: `R$ ${(Number(selectedOrder.delivery_fee) || 0).toFixed(2).replace('.', ',')}` },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                    <span style={{ opacity: 0.7 }}>{row.label}:</span>
                    <span style={{ fontWeight: 700, color: row.color || 'inherit' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', fontWeight: 900, fontSize: '1.3rem' }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--brand-p)' }}>R$ {(Number(selectedOrder.total) || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Pagamento e data */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CreditCard size={13} /> {selectedOrder.payment || 'N/A'}
                </span>
                <span>{new Date(selectedOrder.created_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;