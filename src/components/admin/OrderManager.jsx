import React, { useState } from 'react';
import { 
  ShoppingBag, RefreshCw, XCircle, Search, Trash2, Edit, Mail, Phone, Zap, CreditCard 
} from 'lucide-react';
import { useOrderStore } from '../../store/orderStore';
import { emailService } from '../../services/emailService';
import toast from 'react-hot-toast';

const OrderManager = () => {
  const { orders, isLoading, error, fetchOrders, updateOrderStatus, updateOrderPaymentStatus, deleteOrder } = useOrderStore();
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleStatusUpdateWithEmail = async (orderId, newStatus) => {
    const toastId = toast.loading('Atualizando pedido...');
    try {
      await updateOrderStatus(orderId, newStatus);
      const order = orders.find(o => o.id === orderId);
      if (order && order.email) {
        const result = await emailService.sendDeliveryStatusUpdate(order, { name: order.customer_name, email: order.email }, newStatus);
        if (result?.success) {
          toast.success(`E-mail de atualização enviado para ${order.customer_name}`, { id: toastId });
        } else {
          toast.error('Status atualizado, mas o e-mail não foi enviado.', { id: toastId });
        }
      } else {
        toast.success('Status atualizado!', { id: toastId });
      }
    } catch {
      toast.error('Erro ao atualizar status.', { id: toastId });
    }
  };

  const handleDeleteOrder = (id) => {
    if (window.confirm('Deseja realmente excluir este pedido? Esta ação é permanente e irreversível.')) {
      deleteOrder(id);
      toast.success('Pedido removido com sucesso!');
    }
  };

  const filteredOrders = orders.filter(o =>
    (o.customer_name || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.order_number || o.id || '').toString().includes(orderSearch) ||
    (o.whatsapp || '').includes(orderSearch)
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            <ShoppingBag size={14} /> Logística & Vendas
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Vendas e Pedidos</h1>
          <p>Acompanhe o fluxo de pedidos e gerencie as entregas em tempo real.</p>
        </div>
        <button 
          className="btn-refresh-modern" 
          onClick={fetchOrders} 
          disabled={isLoading}
          style={{ height: '50px', padding: '0 1.5rem', borderRadius: '14px' }}
        >
          <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
          {isLoading ? 'Atualizando...' : 'Atualizar Dados'}
        </button>
      </div>

      <div className="bento-item" style={{ padding: '0', overflow: 'hidden' }}>
        {error && (
          <div className="orders-error-alert" style={{ margin: '1.5rem', padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #fecaca' }}>
            <XCircle size={20} />
            <span>{error}</span>
            <button onClick={fetchOrders} style={{ marginLeft: 'auto', background: 'white', border: '1px solid #f87171', borderRadius: '8px', padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>Tentar novamente</button>
          </div>
        )}
        
        <div style={{ padding: '1.5rem 1.5rem 0' }}>
           <div className="header-search" style={{ flex: 1, maxWidth: '500px', height: '44px', padding: '0 1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Search size={18} color="#64748b" />
              <input 
                type="text" 
                placeholder="Buscar por nome, número ou WhatsApp..." 
                value={orderSearch} 
                onChange={(e) => setOrderSearch(e.target.value)} 
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem', fontWeight: 600, background: 'transparent' }}
              />
           </div>
        </div>

        <div className="admin-table-wrapper" style={{ padding: '1.5rem' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ padding: '1.25rem' }}>Pedido</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th className="hide-mobile">Data</th>
                <th style={{ padding: '1.25rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
               {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 900, color: 'var(--brand-p)', padding: '1.25rem' }}>#{order.order_number || (order.id || '').toString().slice(0, 8)}</td>
                  <td>
                    <div className="user-cell">
                      <div className="product-names">
                        <span className="p-name" style={{ fontWeight: 800 }}>{order.customer_name}</span>
                        <span className="p-sku" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={10} /> {order.whatsapp}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select 
                      className={`status-capsule ${order.status === 'Concluído' ? 'green' : order.status === 'Cancelado' ? 'gray' : 'orange'}`}
                      style={{ border: 'none', cursor: 'pointer', outline: 'none', fontWeight: 800, padding: '6px 12px', borderRadius: '100px' }}
                      value={order.status}
                      onChange={(e) => handleStatusUpdateWithEmail(order.id, e.target.value)}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Preparando">Preparando</option>
                      <option value="Em Rota de Entrega">Em Rota</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`Pagamento do pedido ${order.order_number || order.id}`}
                      className={`status-capsule ${order.payment_status === 'paid' ? 'green' : order.payment_status === 'refunded' ? 'gray' : 'orange'}`}
                      style={{ border: 'none', cursor: 'pointer', outline: 'none', fontWeight: 800, padding: '6px 12px', borderRadius: '100px' }}
                      value={order.payment_status || 'pending'}
                      onChange={(event) => updateOrderPaymentStatus(order.id, event.target.value)}
                    >
                      <option value="pending">Aguardando</option>
                      <option value="paid">Pago</option>
                      <option value="refunded">Estornado</option>
                    </select>
                  </td>
                  <td style={{ fontWeight: 900, fontSize: '1rem' }}>R$ {(Number(order.total) || 0).toFixed(2).replace('.', ',')}</td>
                  <td className="hide-mobile" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{new Date(order.created_at).toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="action-buttons-modern">
                      <button 
                        className="btn-action-outline edit" 
                        title="Ver Detalhes"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Search size={16} />
                      </button>
                      <button className="btn-action-outline delete" title="Excluir" onClick={() => handleDeleteOrder(order.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>Nenhum pedido encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHES DO PEDIDO */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content bento-item scale-in" style={{ maxWidth: '600px', background: 'white', padding: '0', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Pedido #{selectedOrder.order_number || selectedOrder.id.slice(0,8)}</h3>
              <button className="btn-close" onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><XCircle size={24} /></button>
            </div>
            
            <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="order-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem', fontWeight: 800, letterSpacing: '1px' }}>Cliente</h4>
                  <p style={{ fontWeight: 800, margin: 0, fontSize: '1.1rem' }}>{selectedOrder.customer_name}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--brand-p)', fontWeight: 700 }}>{selectedOrder.whatsapp}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7 }}>{selectedOrder.email}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem', fontWeight: 800, letterSpacing: '1px' }}>Entrega</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{selectedOrder.address?.endereco}, {selectedOrder.address?.numero}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>{selectedOrder.address?.bairro}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>CEP: {selectedOrder.cep}</p>
                </div>
              </div>

              <div style={{ marginTop: '2.5rem' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '1rem', fontWeight: 800, letterSpacing: '1px' }}>Itens do Pedido</h4>
                <div className="order-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                        <span style={{ 
                          background: 'var(--brand-p)', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: 900 
                        }}>{item.quantity || item.qty}x</span> 
                        <span style={{ fontWeight: 700 }}>{item.name}</span>
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
                        R$ {((item.price || 0) * (item.quantity || item.qty)).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--brand-p-soft)', borderRadius: '20px', border: '1px solid var(--brand-p-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ opacity: 0.7 }}>Subtotal:</span>
                  <span style={{ fontWeight: 700 }}>R$ {(Number(selectedOrder.subtotal) || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#15803d' }}>
                  <span style={{ opacity: 0.7 }}>Desconto:</span>
                  <span style={{ fontWeight: 800 }}>- R$ {(Number(selectedOrder.discount) || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ opacity: 0.7 }}>Taxa Tele:</span>
                  <span style={{ fontWeight: 700 }}>R$ {(Number(selectedOrder.delivery_fee) || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', fontWeight: 900, fontSize: '1.4rem' }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--brand-p)' }}>R$ {(Number(selectedOrder.total) || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CreditCard size={14} /> <span>Forma: <strong>{selectedOrder.payment}</strong> · Situação: <strong>{selectedOrder.payment_status === 'paid' ? 'Pago' : selectedOrder.payment_status === 'refunded' ? 'Estornado' : 'Aguardando'}</strong></span>
                </div>
                <span>{new Date(selectedOrder.created_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;

