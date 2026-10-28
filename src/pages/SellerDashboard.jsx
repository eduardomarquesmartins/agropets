import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, LogOut, RefreshCw, Search, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useProductStore } from '../store/productStore';
import './SellerDashboard.css';

const money = (value) => `R$ ${(Number(value) || 0).toFixed(2).replace('.', ',')}`;
const commissionLabel = (status) => ({
  awaiting_payment: 'Aguardando pagamento',
  pending: 'Aguardando pagamento',
  payable: 'Liberada para repasse',
  paid: 'Paga',
  cancelled: 'Cancelada',
}[status] || 'Aguardando pagamento');

const buildReferralLink = (code, productId = null) => {
  const path = productId ? `/produto/${encodeURIComponent(productId)}` : '/';
  const url = new URL(path, window.location.origin);
  url.searchParams.set('ref', code);
  return url.toString();
};

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, refreshProfile } = useAuthStore();
  const { orders, fetchOrders, isLoading } = useOrderStore();
  const { products, fetchProducts, isLoading: isLoadingProducts } = useProductStore();
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    refreshProfile();
    fetchOrders();
    fetchProducts();
  }, [refreshProfile, fetchOrders, fetchProducts]);

  const myOrders = useMemo(() => orders
    .filter((order) => order.seller_id === user?.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [orders, user?.id]);
  const awaitingPaymentCommission = myOrders.filter((order) => ['awaiting_payment', 'pending'].includes(order.commission_status))
    .reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0);
  const payableCommission = myOrders.filter((order) => order.commission_status === 'payable')
    .reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0);
  const paidCommission = myOrders.filter((order) => order.commission_status === 'paid')
    .reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0);
  const salesTotal = myOrders.filter((order) => order.payment_status === 'paid' && order.status !== 'Cancelado').reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const referralLink = user?.affiliate_code ? buildReferralLink(user.affiliate_code) : '';
  const shareableProducts = products.filter((product) => product.status === 'active'
    && product.name.toLowerCase().includes(productSearch.trim().toLowerCase()));

  const copyLink = async (link = referralLink, successMessage = 'Seu link foi copiado.') => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(successMessage);
    } catch {
      toast.error('Não foi possível copiar o link neste navegador.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <main className="seller-dashboard">
      <div className="seller-dashboard__shell">
        <header className="seller-dashboard__header">
          <div>
            <span className="seller-dashboard__eyebrow">Área do vendedor</span>
            <h1>Olá, {user?.name}</h1>
            <p>Acompanhe suas vendas e compartilhe seus links.</p>
          </div>
          <button onClick={handleLogout} className="seller-dashboard__button seller-dashboard__button--quiet"><LogOut size={16} /> Sair</button>
        </header>

        <section className="seller-dashboard__card seller-dashboard__referral">
          <div className="seller-dashboard__section-heading">
            <span className="seller-dashboard__heading-icon"><ExternalLink size={18} /></span>
          <div><h2>Seu link da loja</h2><p>As compras ficam atribuídas a você somente na sessão iniciada pelo seu link de produto ou da loja. Se o cliente voltar em outra visita direto à loja, o pedido não será vinculado.</p></div>
          </div>
          <div className="seller-dashboard__link-row">
            <input aria-label="Link geral de vendas" readOnly value={referralLink} />
            <button className="seller-dashboard__button seller-dashboard__button--primary" onClick={copyLink} disabled={!referralLink}><Copy size={16} /> Copiar link</button>
          </div>
          <div className="seller-dashboard__meta"><span>Código <strong>{user?.affiliate_code || 'Aguardando'}</strong></span><span>Comissão <strong>{Number(user?.commission_rate || 0)}%</strong></span></div>
        </section>

        <section className="seller-dashboard__metrics" aria-label="Resumo de vendas">
          <article className="seller-dashboard__metric"><span>Pedidos atribuídos</span><strong>{myOrders.length}</strong></article>
          <article className="seller-dashboard__metric"><span>Vendas geradas</span><strong>{money(salesTotal)}</strong></article>
          <article className="seller-dashboard__metric"><span>Aguardando pagamento</span><strong>{money(awaitingPaymentCommission)}</strong></article>
          <article className="seller-dashboard__metric"><span>Liberadas para repasse</span><strong>{money(payableCommission)}</strong></article>
          <article className="seller-dashboard__metric"><span>Comissões pagas</span><strong>{money(paidCommission)}</strong></article>
        </section>

        <section className="seller-dashboard__card seller-dashboard__products">
          <div className="seller-dashboard__section-top">
            <div className="seller-dashboard__section-heading">
              <span className="seller-dashboard__heading-icon"><ExternalLink size={18} /></span>
              <div><h2>Links por produto</h2><p>Copie um link direto para o produto que quer divulgar.</p></div>
            </div>
            <label className="seller-dashboard__search">
              <Search size={17} />
              <input aria-label="Buscar produto para divulgar" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar produto..." />
            </label>
          </div>
          <div className="seller-dashboard__product-list">
            {shareableProducts.map((product) => (
              <article className="seller-dashboard__product" key={product.id}>
                <img src={product.img || product.images?.[0] || '/agropetssemfundo.png'} alt="" />
                <div className="seller-dashboard__product-info"><strong>{product.name}</strong><span>{money(product.price)}</span></div>
                <button className="seller-dashboard__button seller-dashboard__button--quiet seller-dashboard__product-copy" onClick={() => copyLink(buildReferralLink(user.affiliate_code, product.id), 'Link do produto copiado.')}><Copy size={15} /><span>Copiar link</span></button>
              </article>
            ))}
            {!shareableProducts.length && <div className="seller-dashboard__empty">{isLoadingProducts ? 'Carregando produtos...' : 'Nenhum produto ativo encontrado.'}</div>}
          </div>
        </section>

        <section className="seller-dashboard__card seller-dashboard__sales">
          <div className="seller-dashboard__section-top seller-dashboard__sales-header">
            <div className="seller-dashboard__section-heading">
              <span className="seller-dashboard__heading-icon"><ShoppingBag size={18} /></span>
              <div><h2>Minhas vendas</h2><p>Pedidos vinculados ao seu link.</p></div>
            </div>
            <button className="seller-dashboard__button seller-dashboard__button--quiet" onClick={fetchOrders} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'seller-dashboard__spin' : ''} /> Atualizar</button>
          </div>
          <div className="seller-dashboard__orders-desktop">
            <div className="seller-dashboard__table-scroll">
              <table className="seller-dashboard__table"><thead><tr><th>Pedido</th><th>Data</th><th>Status</th><th>Venda</th><th>Comissão</th><th>Repasse</th></tr></thead>
                <tbody>{myOrders.map((order) => <tr key={order.id}>
                  <td>#{order.order_number || String(order.id).slice(0, 8)}</td>
                  <td>{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>{order.status}</td>
                  <td>{money(order.total)}</td>
                  <td>{money(order.commission_amount)} <small>({Number(order.commission_rate || 0)}%)</small></td>
                  <td><span className={`seller-dashboard__status seller-dashboard__status--${order.commission_status}`}>{commissionLabel(order.commission_status)}</span></td>
                </tr>)}</tbody>
              </table>
            </div>
            {!myOrders.length && <div className="seller-dashboard__empty">{isLoading ? 'Carregando vendas...' : 'Ainda não há pedidos atribuídos ao seu link.'}</div>}
          </div>
          <div className="seller-dashboard__orders-mobile">
            {myOrders.map((order) => (
              <article className="seller-dashboard__order-card" key={order.id}>
                <div className="seller-dashboard__order-heading"><strong>Pedido #{order.order_number || String(order.id).slice(0, 8)}</strong><span className={`seller-dashboard__status seller-dashboard__status--${order.commission_status}`}>{commissionLabel(order.commission_status)}</span></div>
                <span className="seller-dashboard__order-date">{new Date(order.created_at).toLocaleDateString('pt-BR')} · {order.status}</span>
                <div className="seller-dashboard__order-values"><span>Venda <strong>{money(order.total)}</strong></span><span>Comissão <strong>{money(order.commission_amount)}</strong></span></div>
              </article>
            ))}
            {!myOrders.length && <div className="seller-dashboard__empty">{isLoading ? 'Carregando vendas...' : 'Ainda não há pedidos atribuídos ao seu link.'}</div>}
          </div>
        </section>
      </div>
    </main>
  );
};

export default SellerDashboard;

