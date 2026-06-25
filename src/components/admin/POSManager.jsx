import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingBag, Trash2, CheckCircle, X, CreditCard, Zap, DollarSign, Activity, ShoppingCart, ArrowRight,
  Scale, Hash, Package, Banknote, QrCode, Smartphone, CheckCircle2
} from 'lucide-react';
import './POSManager.css';
import { useProductStore } from '../../store/productStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useFinancialStore } from '../../store/financialStore';
import { useAuthStore } from '../../store/authStore';
import { tefService } from '../../services/tefService';
import toast from 'react-hot-toast';

const POSManager = () => {
  const { products, deductStock } = useProductStore();
  const { settings } = useSettingsStore();
  const { addTransaction } = useFinancialStore();
  const { user } = useAuthStore();

  const [posCart, setPosCart] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const [isPosCheckoutModalOpen, setIsPosCheckoutModalOpen] = useState(false);
  const [posPaymentMethod, setPosPaymentMethod] = useState('Dinheiro');
  const [posCashReceived, setPosCashReceived] = useState('');
  const [posMachineProvider, setPosMachineProvider] = useState('Stone');
  const [posMachineCardType, setPosMachineCardType] = useState('Debito');
  const [posMachineInstallments, setPosMachineInstallments] = useState(1);
  const [posMachineCardBrand, setPosMachineCardBrand] = useState('Visa');
  const [posMachineLastDigits, setPosMachineLastDigits] = useState('');
  const [posMachineAuthCode, setPosMachineAuthCode] = useState('');
  const [posUseTef, setPosUseTef] = useState(false);
  const [isTefProcessing, setIsTefProcessing] = useState(false);
  const [variationModalConfig, setVariationModalConfig] = useState({ open: false, product: null });

  // Atalhos de teclado globais (F1, F2)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        const searchInput = document.querySelector('.pos-search-bar input');
        if (searchInput) searchInput.focus();
      }
      if (e.key === 'F2' && posCart.length > 0) {
        e.preventDefault();
        setIsPosCheckoutModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [posCart.length]);

  const addToPosCart = (product, variation = null) => {
    // Se o produto tem variações e nenhuma foi selecionada ainda, abre o modal
    if (!variation && product.variations && product.variations.length > 0) {
      setVariationModalConfig({ open: true, product });
      return;
    }

    const itemPrice = Number(variation ? variation.price : product.price) || 0;
    const itemWeight = variation ? variation.weight : product.weight;
    const itemStock = parseInt(variation ? variation.stock : product.stock) || 0;
    const cartId = variation ? `${product.id}-${variation.weight}` : product.id;

    if (itemStock <= 0) {
      toast.error('Produto sem estoque!');
      return;
    }

    const existing = posCart.find(item => item.cartId === cartId);
    if (existing) {
      if (existing.quantity >= itemStock) {
        toast.error('Limite de estoque atingido no carrinho.');
        return;
      }
      setPosCart(posCart.map(item => item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setPosCart([...posCart, { 
        ...product, 
        cartId, 
        price: itemPrice, 
        weight: itemWeight, 
        selectedWeight: variation?.weight || null,
        quantity: 1 
      }]);
    }
    setVariationModalConfig({ open: false, product: null });
  };

  const removeFromPosCart = (cartId) => {
    setPosCart(posCart.filter(item => item.cartId !== cartId));
  };

  const updatePosQuantity = (cartId, delta) => {
    setPosCart(posCart.map(item => {
      if (item.cartId === cartId) {
        // Encontrar o estoque correto (base ou variação)
        let maxStock = item.stock;
        if (item.selectedWeight && item.variations) {
          const v = item.variations.find(v => v.weight === item.selectedWeight);
          maxStock = v ? v.stock : 0;
        }

        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > (maxStock || 0)) {
          toast.error('Estoque insuficiente.');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const requestTefPayment = async (total) => {
    setIsTefProcessing(true);

    try {
      const data = await tefService.requestPayment({
        amount: total,
        provider: posMachineProvider,
        cardType: posMachineCardType,
        installments: posMachineCardType === 'Credito' ? posMachineInstallments : 1,
        reference: crypto.randomUUID(),
        metadata: {
          source: 'pdv',
          item_count: posCart.reduce((sum, item) => sum + item.quantity, 0),
          operator_id: user?.id || null,
        },
      });

      if (data.status === 'pending') {
        throw new Error('Pagamento ficou pendente. Aguarde a maquininha ou finalize manualmente com o NSU.');
      }

      if (data.status !== 'approved') {
        throw new Error(data.message || 'Pagamento TEF nao autorizado.');
      }

      return {
        authorizationCode: data.authorizationCode || data.nsu,
        nsu: data.nsu || data.authorizationCode,
      };
    } finally {
      setIsTefProcessing(false);
    }
  };

  const finalizePosSale = async (paymentMethod = 'Dinheiro') => {
    if (posCart.length === 0) return;
    
    const subtotal = posCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discount = (paymentMethod === 'Dinheiro' || paymentMethod === 'Pix') ? (subtotal * (settings.cashDiscount || 0) / 100) : 0;
    const isMachinePayment = paymentMethod === 'Maquininha';
    const machinePaymentMethod = isMachinePayment ? `Maquininha ${posMachineProvider} - ${posMachineCardType}` : paymentMethod;
    const hasCardInterest = paymentMethod === 'Cartão' || (isMachinePayment && posMachineCardType === 'Credito');
    const interest = hasCardInterest ? (subtotal * (settings.installmentInterest || 0) / 100) : 0;
    const total = subtotal - discount + interest;

    let machineAuthCode = posMachineAuthCode.trim();

    if (isMachinePayment && posUseTef && !machineAuthCode) {
      try {
        toast.loading('Enviando venda para a TEF...', { id: 'tef-payment' });
        const tefResult = await requestTefPayment(total);
        machineAuthCode = tefResult.authorizationCode || tefResult.nsu;
        setPosMachineAuthCode(machineAuthCode);
        toast.success('Pagamento autorizado na TEF.', { id: 'tef-payment' });
      } catch (error) {
        toast.error(error.message || 'Erro ao processar TEF.', { id: 'tef-payment' });
        return;
      }
    }

    if (isMachinePayment && !machineAuthCode) {
      toast.error('Informe o codigo de autorizacao/NSU da maquininha.');
      return;
    }

    if (isMachinePayment && posMachineLastDigits && !/^\d{4}$/.test(posMachineLastDigits)) {
      toast.error('Informe os 4 ultimos digitos do cartao ou deixe em branco.');
      return;
    }
    
    try {
      for (const item of posCart) {
        await deductStock(item.id, item.quantity, `Venda PDV - ${machinePaymentMethod}`, user?.id, item.selectedWeight);
      }

      await addTransaction({
        type: 'income',
        category: 'venda',
        amount: total,
        description: isMachinePayment
          ? `Venda PDV (${posCart.length} itens) - ${machinePaymentMethod} - ${posMachineCardBrand} - ${posMachineInstallments}x - Aut/NSU: ${machineAuthCode}${posMachineLastDigits ? ` - Final cartao: ${posMachineLastDigits}` : ''}`
          : `Venda PDV (${posCart.length} itens) - ${paymentMethod}`,
        paymentMethod: machinePaymentMethod
      });

      toast.success('Venda finalizada com sucesso! Estoque e Financeiro atualizados.');
      setPosCart([]);
      setPosSearch('');
      setIsPosCheckoutModalOpen(false);
      setPosCashReceived('');
      setPosMachineProvider('Stone');
      setPosMachineCardType('Debito');
      setPosMachineInstallments(1);
      setPosMachineCardBrand('Visa');
      setPosMachineLastDigits('');
      setPosMachineAuthCode('');
      setPosUseTef(false);
    } catch (error) {
      console.error('Erro ao finalizar venda PDV:', error);
      toast.error('Erro ao processar venda.');
    }
  };

  const handlePosSearchKeyDown = (e) => {
    if (e.key === 'Enter' && posSearch.trim()) {
      const filtered = products.filter(p => 
        p.status === 'active' && 
        (p.name.toLowerCase().includes(posSearch.toLowerCase()) || 
         (p.sku && p.sku.toLowerCase() === posSearch.toLowerCase()))
      );

      if (filtered.length === 1) {
        addToPosCart(filtered[0]);
        setPosSearch('');
        toast.success(`Adicionado: ${filtered[0].name}`, { icon: '🛒', id: 'pos-add' });
      } else if (filtered.length > 1) {
        const exactMatch = filtered.find(p => p.name.toLowerCase() === posSearch.toLowerCase());
        if (exactMatch) {
          addToPosCart(exactMatch);
          setPosSearch('');
          toast.success(`Adicionado: ${exactMatch.name}`, { icon: '🛒', id: 'pos-add' });
        }
      }
    }
  };

  const posTotal = posCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const filteredPosProducts = products.filter(p => 
    p.status === 'active' && 
    (p.name.toLowerCase().includes(posSearch.toLowerCase()) || 
     (p.category && p.category.toLowerCase().includes(posSearch.toLowerCase())))
  );

  const renderPosCheckoutModal = () => {
    if (!isPosCheckoutModalOpen) return null;
    
    const subtotal = posTotal;
    const discount = (posPaymentMethod === 'Dinheiro' || posPaymentMethod === 'Pix') ? (subtotal * (settings.cashDiscount || 0) / 100) : 0;
    const hasCardInterest = posPaymentMethod === 'Cartão' || (posPaymentMethod === 'Maquininha' && posMachineCardType === 'Credito');
    const interest = hasCardInterest ? (subtotal * (settings.installmentInterest || 0) / 100) : 0;
    const total = subtotal - discount + interest;
    const cashReceivedNum = parseFloat(posCashReceived) || 0;
    const change = cashReceivedNum > total ? cashReceivedNum - total : 0;

    return (
      <div className="modal-overlay">
        <div className="modal-content fade-in" style={{ maxWidth: '480px', width: '100%', background: 'white' }}>
          <div className="modal-header">
            <h3 style={{ margin: 0, fontWeight: 900 }}>Finalizar Venda</h3>
            <button className="btn-close" onClick={() => setIsPosCheckoutModalOpen(false)}><X size={24} /></button>
          </div>
          
          <div className="modal-scroll-content" style={{ padding: '1.5rem' }}>
             <div className="pos-checkout-total" style={{ textAlign: 'center', background: 'var(--brand-p-soft)', padding: '1.5rem', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '5px' }}>
                   <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Subtotal: R$ {subtotal.toFixed(2)}</div>
                   {discount > 0 && <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>Desconto ({settings.cashDiscount}%): - R$ {discount.toFixed(2)}</div>}
                   {interest > 0 && <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>Juros ({settings.installmentInterest}%): + R$ {interest.toFixed(2)}</div>}
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, opacity: 0.7 }}>Total a Pagar:</span>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--brand-p)', margin: '0.5rem 0' }}>R$ {total.toFixed(2)}</h2>
             </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px' }}>
                  Forma de Pagamento
                </label>
                <div className="pos-payment-grid">
                   {[
                     { id: 'Dinheiro', icon: <Banknote size={24} />, label: 'Dinheiro' },
                     { id: 'Cartão', icon: <CreditCard size={24} />, label: 'Cartão' },
                     { id: 'Pix', icon: <QrCode size={24} />, label: 'Pix' },
                     { id: 'Maquininha', icon: <Smartphone size={24} />, label: 'Maquininha' },
                   ].map((method) => (
                     <div
                       key={method.id}
                       className={`payment-card-premium ${posPaymentMethod === method.id ? 'active' : ''}`}
                       onClick={() => setPosPaymentMethod(method.id)}
                     >
                       <div className="check-mark">
                         <CheckCircle2 size={18} fill="currentColor" color="white" />
                       </div>
                       <div className="icon-box">
                         {method.icon}
                       </div>
                       <span className="label">{method.label}</span>
                     </div>
                   ))}
                </div>
              </div>


             {posPaymentMethod === 'Dinheiro' && (
               <div className="scale-in" style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>Valor Recebido</label>
                    <input 
                      type="number" 
                      value={posCashReceived}
                      onChange={(e) => setPosCashReceived(e.target.value)}
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                    <span style={{ opacity: 0.6 }}>Troco:</span>
                    <span style={{ color: '#15803d', fontSize: '1.2rem', fontWeight: 700 }}>R$ {change.toFixed(2)}</span>
                  </div>
               </div>
             )}

             {posPaymentMethod === 'Maquininha' && (
                <div className="scale-in" style={{ marginTop: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                   <label className="tef-toggle-wrapper">
                      <input
                        type="checkbox"
                        checked={posUseTef}
                        onChange={(e) => setPosUseTef(e.target.checked)}
                      />
                      <div className="tef-label-text">
                        <span>USAR TEF INTEGRADO</span>
                        <span>Processamento automático no terminal</span>
                      </div>
                      <Zap size={18} style={{ marginLeft: 'auto', color: posUseTef ? 'var(--brand-p)' : '#cbd5e1' }} fill={posUseTef ? 'currentColor' : 'none'} />
                   </label>

                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="form-group">
                        <label>Rede / Adquirente</label>
                        <select value={posMachineProvider} onChange={(e) => setPosMachineProvider(e.target.value)}>
                          <option value="Stone">Stone</option>
                          <option value="PagBank">PagBank</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Tipo do Cartão</label>
                        <div className="secondary-card-grid">
                          <div
                            className={`secondary-card ${posMachineCardType === 'Debito' ? 'active' : ''}`}
                            onClick={() => {
                              setPosMachineCardType('Debito');
                              setPosMachineInstallments(1);
                            }}
                          >
                            <DollarSign size={16} /> Débito
                          </div>
                          <div
                            className={`secondary-card ${posMachineCardType === 'Credito' ? 'active' : ''}`}
                            onClick={() => setPosMachineCardType('Credito')}
                          >
                            <CreditCard size={16} /> Crédito
                          </div>
                        </div>
                      </div>
                   </div>

                   {posMachineCardType === 'Credito' && (
                     <div className="form-group" style={{ marginTop: '10px' }}>
                       <label>Parcelamento</label>
                       <select value={posMachineInstallments} onChange={(e) => setPosMachineInstallments(Number(e.target.value))}>
                         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((installment) => (
                           <option key={installment} value={installment}>{installment}x {installment === 1 ? 'à vista' : `com juros`}</option>
                         ))}
                       </select>
                     </div>
                   )}

                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                     <div className="form-group">
                       <label>Bandeira</label>
                       <select value={posMachineCardBrand} onChange={(e) => setPosMachineCardBrand(e.target.value)}>
                         <option value="Visa">Visa</option>
                         <option value="Mastercard">Mastercard</option>
                         <option value="Elo">Elo</option>
                         <option value="Hipercard">Hipercard</option>
                         <option value="American Express">American Express</option>
                         <option value="Outra">Outra</option>
                       </select>
                     </div>

                     <div className="form-group">
                       <label>Final do Cartao</label>
                       <input
                         type="text"
                         inputMode="numeric"
                         maxLength={4}
                         value={posMachineLastDigits}
                         onChange={(e) => setPosMachineLastDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                         placeholder="Opcional"
                       />
                     </div>
                   </div>

                   <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                     <label>Código de Autorização / NSU</label>
                     <div style={{ position: 'relative' }}>
                       <Activity size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                       <input
                         type="text"
                         style={{ paddingLeft: '42px' }}
                         value={posMachineAuthCode}
                         onChange={(e) => setPosMachineAuthCode(e.target.value)}
                         placeholder={posUseTef ? 'Aguardando processamento...' : 'Ex: 123456'}
                         disabled={posUseTef}
                       />
                     </div>
                   </div>
                </div>
             )}
          </div>

          <div className="modal-footer" style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }}>
             <button 
                className="btn-primary-modern" 
                style={{ width: '100%', height: '60px', fontSize: '1.2rem' }}
                onClick={() => finalizePosSale(posPaymentMethod)}
                disabled={isTefProcessing}
             >
                {isTefProcessing ? 'PROCESSANDO TEF...' : 'CONFIRMAR E FINALIZAR'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard-content fade-in pos-container">
      <div className="pos-grid">
        {/* Lado Esquerdo: Busca e Produtos */}
        <div className="pos-products-side">
          <div className="pos-search-bar bento-item">
            <Search size={20} color="#64748b" />
            <input 
              type="text" 
              placeholder="Buscar produto ou categoria (F1)..." 
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
              onKeyDown={handlePosSearchKeyDown}
              autoFocus
            />
          </div>
          
          <div className="pos-products-grid">
            {filteredPosProducts.slice(0, 12).map(p => (
              <div key={p.id} className={`pos-product-card ${p.stock <= 0 ? 'out-of-stock' : ''}`} onClick={() => addToPosCart(p)}>
                <div className="pos-img-wrapper">
                  <img src={p.img || null} alt="" />
                  {p.stock <= 5 && p.stock > 0 && <span className="low-stock-tag">Baixo</span>}
                </div>
                <div className="pos-card-info">
                  <span className="p-brand">{p.brand}</span>
                  <h4 className="p-name">{p.name}</h4>
                  <span className="p-price">R$ {(p.price || 0).toFixed(2)}</span>
                  <span className="p-stock">Estoque: {p.stock}</span>
                </div>
              </div>
            ))}
            {filteredPosProducts.length === 0 && (
              <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                Nenhum produto encontrado...
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Carrinho e Checkout */}
        <div className="pos-cart-side bento-item">
          <div className="pos-cart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={20} />
              <h3 style={{ margin: 0 }}>Cupom Fiscal</h3>
            </div>
            <button className="btn-minimal" onClick={() => setPosCart([])}>Limpar</button>
          </div>

          <div className="pos-cart-items">
            {posCart.length === 0 ? (
              <div className="empty-cart-pos">
                  <ShoppingBag size={48} opacity={0.2} />
                  <p>Carrinho vazio</p>
                  <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Use F1 para buscar produtos</span>
              </div>
            ) : (
              posCart.map(item => (
                <div key={item.cartId} className="pos-cart-item">
                  <div className="item-details">
                    <span className="item-name">{item.name} {item.selectedWeight ? `(${item.selectedWeight})` : ''}</span>
                    <span className="item-price">R$ {(item.price || 0).toFixed(2)} un.</span>
                  </div>
                  <div className="item-actions">
                    <div className="qty-control">
                      <button onClick={() => updatePosQuantity(item.cartId, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updatePosQuantity(item.cartId, 1)}>+</button>
                    </div>
                    <button className="btn-remove-pos" onClick={() => removeFromPosCart(item.cartId)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-cart-footer">
            <div className="pos-totals">
              <div className="total-row"><span>Itens:</span> <span>{posCart.reduce((a,b) => a + b.quantity, 0)}</span></div>
              <div className="total-row main"><span>Total:</span> <span>R$ {posTotal.toFixed(2)}</span></div>
            </div>
            
            <div className="pos-payment-methods">
              <button className="btn-payment-main" onClick={() => setIsPosCheckoutModalOpen(true)} disabled={posCart.length === 0}>
                  <CheckCircle size={22} />
                  <span>FINALIZAR (F2)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {renderPosCheckoutModal()}

      {/* MODAL DE SELEÇÃO DE VARIAÇÃO */}
      {variationModalConfig.open && variationModalConfig.product && (
        <div className="modal-overlay">
          <div className="modal-content scale-in" style={{ maxWidth: '450px', background: 'white', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem 2rem', background: 'var(--brand-p-soft)', borderBottom: '1px solid var(--brand-p-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--brand-p)', color: 'white', padding: '8px', borderRadius: '12px' }}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--brand-p)' }}>Escolha o Peso</h3>
                  <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase' }}>{variationModalConfig.product.name}</span>
                </div>
              </div>
              <button className="btn-close" onClick={() => setVariationModalConfig({ open: false, product: null })}><X size={24} /></button>
            </div>
            
            <div className="modal-scroll-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Opção Base do Produto */}
              <button
                className="btn-variation-card"
                disabled={variationModalConfig.product.stock <= 0}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  border: '2px solid #f1f5f9',
                  borderRadius: '16px',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  opacity: variationModalConfig.product.stock <= 0 ? 0.5 : 1
                }}
                onClick={() => addToPosCart(variationModalConfig.product, { weight: variationModalConfig.product.weight, price: variationModalConfig.product.price, stock: variationModalConfig.product.stock })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px' }}>
                    <Scale size={18} color="var(--brand-p)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5, fontWeight: 800 }}>Padrão</div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{variationModalConfig.product.weight}</div>
                    <div style={{ fontSize: '0.75rem', color: variationModalConfig.product.stock <= 5 ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                      {variationModalConfig.product.stock} em estoque
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--brand-p)' }}>
                    R$ {Number(variationModalConfig.product.price || 0).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </button>

              <div style={{ height: '1px', background: '#f1f5f9', margin: '5px 0' }}></div>

              {/* Opções das Variações */}
              {variationModalConfig.product.variations?.map((v, idx) => (
                <button
                  key={idx}
                  className="btn-variation-card"
                  disabled={v.stock <= 0}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    border: '2px solid #f1f5f9',
                    borderRadius: '16px',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    opacity: v.stock <= 0 ? 0.5 : 1
                  }}
                  onClick={() => addToPosCart(variationModalConfig.product, v)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px' }}>
                      <Activity size={18} color="var(--brand-p)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5, fontWeight: 800 }}>Variação</div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{v.weight}</div>
                      <div style={{ fontSize: '0.75rem', color: Number(v.stock) <= 5 ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                        {v.stock} em estoque
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--brand-p)' }}>
                      R$ {Number(v.price || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
               <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.5, fontWeight: 600 }}>Escolha uma opção para adicionar ao cupom</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSManager;
