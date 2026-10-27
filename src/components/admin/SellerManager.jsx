import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, Copy, Link2, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminUserStore } from '../../store/adminUserStore';
import { useOrderStore } from '../../store/orderStore';
import { createSellerCommissionPayout, fetchSellerCommissionPayouts } from '../../store/sellerPayoutStore';
import './SellerManager.css';

const money = (value) => `R$ ${(Number(value) || 0).toFixed(2).replace('.', ',')}`;

const getSellerLink = (seller) => {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('ref', seller.affiliate_code);
  return url.toString();
};

const getPayableOrders = (orders, sellerId) => orders.filter((order) => order.seller_id === sellerId
  && order.payment_status === 'paid' && order.commission_status === 'payable');

const SellerManager = () => {
  const { adminUsers, addAdminUser, updateAdminUser, deleteAdminUser, toggleUserStatus, isLoading } = useAdminUserStore();
  const { orders, fetchOrders } = useOrderStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingSellerId, setDeletingSellerId] = useState(null);
  const [payoutSeller, setPayoutSeller] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [payoutForm, setPayoutForm] = useState({ payment_method: 'pix', reference: '', notes: '' });
  const [savingPayout, setSavingPayout] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', commission_rate: 10 });
  const sellers = adminUsers.filter((member) => member.role === 'seller');

  useEffect(() => {
    fetchSellerCommissionPayouts().then(setPayouts).catch((error) => {
      console.error('Erro ao carregar histórico de repasses:', error);
    });
  }, []);

  const sellerRows = useMemo(() => sellers.map((seller) => {
    const sellerOrders = orders.filter((order) => order.seller_id === seller.id);
    const earned = sellerOrders.filter((order) => order.commission_status !== 'cancelled');
    return {
      ...seller,
      orderCount: sellerOrders.length,
      salesTotal: sellerOrders.filter((order) => order.payment_status === 'paid' && order.status !== 'Cancelado').reduce((sum, order) => sum + (Number(order.total) || 0), 0),
      awaitingPayment: earned.filter((order) => order.commission_status === 'awaiting_payment' || order.commission_status === 'pending').reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0),
      payable: getPayableOrders(sellerOrders, seller.id).reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0),
      paid: earned.filter((order) => order.commission_status === 'paid').reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0),
    };
  }).filter((seller) => `${seller.name} ${seller.email} ${seller.affiliate_code}`.toLowerCase().includes(search.toLowerCase())), [sellers, orders, search]);

  const openForm = (seller = null) => {
    setEditing(seller);
    setIsFormOpen(true);
    setForm(seller ? {
      name: seller.name || '', email: seller.email || '', password: '',
      commission_rate: seller.commission_rate ?? 10,
    } : { name: '', email: '', password: '', commission_rate: 10 });
  };

  const saveSeller = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateAdminUser(editing.id, { ...form, role: 'seller' });
        toast.success('Vendedor atualizado.');
      } else {
        const createdSeller = await addAdminUser({ ...form, role: 'seller' });
        if (createdSeller?.affiliate_code) {
          try {
            await navigator.clipboard.writeText(getSellerLink(createdSeller));
            toast.success('Vendedor cadastrado. O link automático foi copiado.');
          } catch {
            toast.success('Vendedor cadastrado. O link automático já está na lista.');
          }
        } else {
          toast.success('Vendedor cadastrado.');
        }
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error(error.message || 'Não foi possível salvar o vendedor.');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (seller) => {
    try {
      await navigator.clipboard.writeText(getSellerLink(seller));
      toast.success('Link de venda copiado.');
    } catch {
      toast.error('Não foi possível copiar o link neste navegador.');
    }
  };

  const removeSeller = async (seller) => {
    if (seller.orderCount > 0) {
      toast.error('Vendedor com vendas no histórico deve ser inativado.');
      return;
    }
    if (!window.confirm(`Remover permanentemente ${seller.name}? A conta de acesso será excluída.`)) return;

    setDeletingSellerId(seller.id);
    try {
      await deleteAdminUser(seller.id);
      toast.success('Vendedor removido.');
    } catch (error) {
      toast.error(error.message || 'Não foi possível remover o vendedor.');
    } finally {
      setDeletingSellerId(null);
    }
  };

  const refresh = async () => {
    const { fetchAdminUsers } = useAdminUserStore.getState();
    try {
      const [nextPayouts] = await Promise.all([fetchSellerCommissionPayouts(), fetchAdminUsers(), fetchOrders()]);
      setPayouts(nextPayouts);
    } catch (error) {
      toast.error(error.message || 'Não foi possível atualizar os dados.');
    }
  };

  const commissionOrders = orders.filter((order) => order.seller_id && order.commission_status !== 'cancelled');
  const awaitingPaymentTotal = commissionOrders.filter((order) => order.commission_status === 'awaiting_payment' || order.commission_status === 'pending').reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0);
  const payableTotal = commissionOrders.filter((order) => order.commission_status === 'payable').reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0);
  const paidTotal = commissionOrders.filter((order) => order.commission_status === 'paid').reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0);

  const openPayout = (seller) => {
    if (!getPayableOrders(orders, seller.id).length) {
      toast.error('Este vendedor não tem comissões liberadas para repasse.');
      return;
    }
    setPayoutSeller(seller);
    setPayoutForm({ payment_method: 'pix', reference: '', notes: '' });
  };

  const savePayout = async (event) => {
    event.preventDefault();
    if (!payoutSeller) return;
    const eligibleOrders = orders.filter((order) => order.seller_id === payoutSeller.id
      && order.payment_status === 'paid' && order.commission_status === 'payable');
    if (!eligibleOrders.length) {
      toast.error('Este vendedor não tem comissões liberadas para repasse.');
      return;
    }

    setSavingPayout(true);
    try {
      await createSellerCommissionPayout({
        seller_id: payoutSeller.id,
        order_ids: eligibleOrders.map((order) => order.id),
        ...payoutForm,
      });
      await Promise.all([fetchOrders(), fetchSellerCommissionPayouts().then(setPayouts)]);
      toast.success('Repasse registrado e comissões baixadas.');
      setPayoutSeller(null);
    } catch (error) {
      toast.error(error.message || 'Não foi possível registrar o repasse.');
    } finally {
      setSavingPayout(false);
    }
  };

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-p)', fontWeight: 800, fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '1.5px' }}><Users size={14} /> Programa de vendas</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Gestão de Vendedores</h1>
          <p>Crie acessos, compartilhe links automáticos e acompanhe vendas e comissões. O cliente não precisa digitar código.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-refresh-modern" onClick={refresh} disabled={isLoading}><RefreshCw size={17} /> Atualizar</button>
          <button className="btn-primary-modern" onClick={() => openForm()}><Plus size={18} /> Novo vendedor</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="bento-item"><span style={{ color: '#64748b', fontWeight: 700 }}>Vendedores ativos</span><strong style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{sellers.filter((s) => s.status === 'active').length}</strong></div>
        <div className="bento-item"><span style={{ color: '#64748b', fontWeight: 700 }}>Aguardando pagamento</span><strong style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{money(awaitingPaymentTotal)}</strong></div>
        <div className="bento-item"><span style={{ color: '#64748b', fontWeight: 700 }}>Liberadas para repasse</span><strong style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{money(payableTotal)}</strong></div>
        <div className="bento-item"><span style={{ color: '#64748b', fontWeight: 700 }}>Comissões pagas</span><strong style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{money(paidTotal)}</strong></div>
      </div>

      <div className="bento-item" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Search size={18} color="#64748b" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar vendedor, e-mail ou código..." style={{ border: 0, outline: 0, padding: 10, width: '100%' }} />
        </div>
        <div className="admin-table-wrapper" style={{ padding: '1rem 1.5rem 1.5rem' }}>
          <table className="admin-table">
            <thead><tr><th>Vendedor</th><th>Link automático</th><th>Vendas</th><th>Comissão a pagar</th><th>Pago</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {sellerRows.map((seller) => (
                <tr key={seller.id}>
                  <td><strong>{seller.name}</strong><div style={{ fontSize: 12, opacity: .65 }}>{seller.email} · {Number(seller.commission_rate || 0)}%</div></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Link2 size={15} color="#16834a" /><code style={{ fontSize: 12 }}>{getSellerLink(seller)}</code><button className="btn-action-outline" onClick={() => copyLink(seller)} title="Copiar link automático" aria-label={`Copiar link de ${seller.name}`}><Copy size={14} /></button></div></td>
                  <td>{seller.orderCount} pedido(s)<div style={{ fontSize: 12, opacity: .65 }}>{money(seller.salesTotal)}</div></td>
                  <td style={{ fontWeight: 800 }}>{money(seller.payable)}</td>
                  <td>{money(seller.paid)}</td>
                  <td><span className={`status-capsule ${seller.status === 'active' ? 'green' : 'gray'}`}>{seller.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
                  <td><div className="action-buttons-modern">
                    <button className="btn-action-outline btn-action-text edit" title="Editar vendedor" onClick={() => openForm(seller)}>Editar</button>
                    <button className="btn-action-outline btn-action-text edit" title={seller.payable ? 'Registrar repasse das comissões liberadas' : 'Sem comissões liberadas para repasse'} onClick={() => openPayout(seller)}><Banknote size={14} /> Repassar</button>
                    <button className="btn-action-outline btn-action-text" title={seller.status === 'active' ? 'Desativar' : 'Ativar'} onClick={() => toggleUserStatus(seller.id)}>{seller.status === 'active' ? 'Pausar' : 'Ativar'}</button>
                    <button
                      className="btn-action-outline btn-action-text seller-remove-action"
                      title={seller.orderCount > 0 ? 'Inative o vendedor para preservar o histórico de vendas.' : 'Remover vendedor permanentemente'}
                      aria-label={`Remover vendedor ${seller.name}`}
                      disabled={seller.orderCount > 0 || deletingSellerId === seller.id}
                      onClick={() => removeSeller(seller)}
                    >
                      <Trash2 size={14} />
                      {deletingSellerId === seller.id ? 'Removendo...' : 'Remover'}
                    </button>
                  </div></td>
                </tr>
              ))}
              {!sellerRows.length && <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, opacity: .6 }}>Nenhum vendedor cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bento-item" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 1.5rem .5rem' }}><h2 style={{ margin: 0 }}>Comissões por pedido</h2><p style={{ margin: '6px 0', color: '#64748b' }}>A comissão só é liberada após confirmar o pagamento do pedido na área de Vendas e Pedidos.</p></div>
        <div className="admin-table-wrapper" style={{ padding: '0 1.5rem 1.5rem' }}>
          <table className="admin-table"><thead><tr><th>Pedido</th><th>Vendedor</th><th>Data</th><th>Venda</th><th>Comissão</th><th>Pagamento</th><th>Status</th></tr></thead>
            <tbody>{commissionOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((order) => (
              <tr key={order.id}><td>#{order.order_number || String(order.id).slice(0, 8)}</td><td>{order.seller_name || 'Vendedor'}</td><td>{new Date(order.created_at).toLocaleDateString('pt-BR')}</td><td>{money(order.total)}</td><td style={{ fontWeight: 800 }}>{money(order.commission_amount)} <small>({Number(order.commission_rate || 0)}%)</small></td><td><span className={`status-capsule ${order.payment_status === 'paid' ? 'green' : order.payment_status === 'refunded' ? 'gray' : 'orange'}`}>{order.payment_status === 'paid' ? 'Pago' : order.payment_status === 'refunded' ? 'Estornado' : 'Aguardando'}</span></td><td><span className={`status-capsule ${order.commission_status === 'paid' || order.commission_status === 'payable' ? 'green' : order.commission_status === 'cancelled' ? 'gray' : 'orange'}`}>{order.commission_status === 'paid' ? 'Paga' : order.commission_status === 'payable' ? 'Liberada' : order.commission_status === 'cancelled' ? 'Cancelada' : 'Aguardando pagamento'}</span></td></tr>
            ))}{!commissionOrders.length && <tr><td colSpan="7" style={{ textAlign: 'center', padding: 32, opacity: .6 }}>Nenhuma venda atribuída a vendedores.</td></tr>}</tbody>
          </table>
        </div>
      </div>

      <div className="bento-item" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 1.5rem .5rem' }}><h2 style={{ margin: 0 }}>Histórico de repasses</h2><p style={{ margin: '6px 0', color: '#64748b' }}>Últimos 100 repasses registrados, com forma e referência de pagamento.</p></div>
        <div className="admin-table-wrapper" style={{ padding: '0 1.5rem 1.5rem' }}>
          <table className="admin-table"><thead><tr><th>Data</th><th>Vendedor</th><th>Pedidos</th><th>Valor</th><th>Forma</th><th>Referência</th></tr></thead>
            <tbody>{payouts.map((payout) => <tr key={payout.id}>
              <td>{new Date(payout.created_at).toLocaleString('pt-BR')}</td><td>{payout.seller_name}</td><td>{payout.order_ids?.length || 0}</td><td style={{ fontWeight: 800 }}>{money(payout.amount)}</td><td>{({ pix: 'Pix', transfer: 'Transferência', cash: 'Dinheiro', other: 'Outro' })[payout.payment_method] || payout.payment_method}</td><td>{payout.reference || payout.notes || '—'}</td>
            </tr>)}{!payouts.length && <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, opacity: .6 }}>Nenhum repasse registrado.</td></tr>}</tbody>
          </table>
        </div>
      </div>

      {payoutSeller && createPortal((
        <div className="modal-overlay seller-modal-overlay" role="presentation" onClick={() => !savingPayout && setPayoutSeller(null)}>
          <div className="seller-modal" role="dialog" aria-modal="true" aria-labelledby="payout-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="seller-modal-header"><div><span className="seller-modal-eyebrow">Comissões liberadas</span><h2 id="payout-modal-title">Registrar repasse</h2><p>Confirme o pagamento das comissões disponíveis para {payoutSeller.name}.</p></div><button type="button" className="seller-modal-close" onClick={() => setPayoutSeller(null)} aria-label="Fechar janela" disabled={savingPayout}><X size={20} /></button></div>
            <form onSubmit={savePayout} className="seller-form">
              <div className="seller-auto-link-note"><Banknote size={18} /><span><strong>Valor deste repasse</strong>{money(orders.filter((order) => order.seller_id === payoutSeller.id && order.payment_status === 'paid' && order.commission_status === 'payable').reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0))} · {orders.filter((order) => order.seller_id === payoutSeller.id && order.payment_status === 'paid' && order.commission_status === 'payable').length} pedido(s)</span></div>
              <label className="seller-field"><span>Forma de pagamento</span><select required value={payoutForm.payment_method} onChange={(event) => setPayoutForm({ ...payoutForm, payment_method: event.target.value })}><option value="pix">Pix</option><option value="transfer">Transferência bancária</option><option value="cash">Dinheiro</option><option value="other">Outro</option></select></label>
              <label className="seller-field"><span>Identificador ou comprovante</span><input maxLength={120} value={payoutForm.reference} onChange={(event) => setPayoutForm({ ...payoutForm, reference: event.target.value })} placeholder="Ex.: ID da transação Pix" /></label>
              <label className="seller-field"><span>Observações</span><textarea maxLength={500} rows={3} value={payoutForm.notes} onChange={(event) => setPayoutForm({ ...payoutForm, notes: event.target.value })} placeholder="Observação opcional" /></label>
              <div className="seller-form-footer"><button type="button" className="seller-cancel-button" onClick={() => setPayoutSeller(null)} disabled={savingPayout}>Cancelar</button><button className="btn-primary-modern seller-submit-button" disabled={savingPayout}>{savingPayout ? 'Registrando...' : 'Confirmar repasse'}</button></div>
            </form>
          </div>
        </div>
      ), document.body)}

      {isFormOpen && createPortal((
        <div className="modal-overlay seller-modal-overlay" role="presentation" onClick={() => setIsFormOpen(false)}>
          <div className="seller-modal" role="dialog" aria-modal="true" aria-labelledby="seller-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="seller-modal-header">
              <div>
                <span className="seller-modal-eyebrow">Equipe comercial</span>
                <h2 id="seller-modal-title">{editing ? 'Editar vendedor' : 'Novo vendedor'}</h2>
                <p>Configure o acesso e a comissão. O link exclusivo será gerado automaticamente.</p>
              </div>
              <button type="button" className="seller-modal-close" onClick={() => setIsFormOpen(false)} aria-label="Fechar janela"><X size={20} /></button>
            </div>
            <form onSubmit={saveSeller} className="seller-form">
              <label className="seller-field">
                <span>Nome completo</span>
                <input autoFocus required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Maria Silva" />
              </label>
              <label className="seller-field">
                <span>E-mail de acesso</span>
                <input required readOnly={Boolean(editing)} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="vendedor@email.com" />
              </label>
              <label className="seller-field">
                <span>{editing ? 'Nova senha' : 'Senha temporária'}</span>
                <input required={!editing} minLength={editing && !form.password ? undefined : 12} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing ? 'Deixe vazio para manter' : 'Mínimo de 12 caracteres'} />
                {!editing && <small>O vendedor poderá usar esta senha para entrar no painel.</small>}
              </label>
              <div className="seller-auto-link-note"><Link2 size={18} /><span><strong>Link automático</strong>Será criado junto com o vendedor e copiado ao concluir. O cliente só precisa abrir o link para a venda ser atribuída.</span></div>
              <div className="seller-form-row seller-commission-row">
                <label className="seller-field">
                  <span>Comissão</span>
                  <div className="seller-rate-input"><input required type="number" min="0" max="100" step="0.01" value={form.commission_rate} onChange={(event) => setForm({ ...form, commission_rate: event.target.value })} /><span>%</span></div>
                  <small>Calculada sobre os produtos.</small>
                </label>
              </div>
              <div className="seller-form-footer">
                <button type="button" className="seller-cancel-button" onClick={() => setIsFormOpen(false)}>Cancelar</button>
                <button className="btn-primary-modern seller-submit-button" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar vendedor'}</button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default SellerManager;

