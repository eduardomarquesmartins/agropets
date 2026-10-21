import React, { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, MapPin, User, Phone, CheckCircle, Tag, Trash2, ShoppingBag,
  Send, QrCode, CreditCard, Banknote, Copy, LogIn
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useCartStore } from '../store/cartStore';
import { evolutionApi } from '../services/evolutionApi';
import { useSettingsStore } from '../store/settingsStore';
import { validateCEP } from '../utils/stringUtils';
import { useAuthStore } from '../store/authStore';
import { emailService } from '../services/emailService';
import { useCouponStore } from '../store/couponStore';
import { getCoordsFromCep, calculateHaversineDistance, STORE_COORDS, getCoordsFromAddress } from '../utils/distanceUtils';
import { buildPixCopyPaste, getPixMerchantCity } from '../utils/pixUtils';
import toast from 'react-hot-toast';
import './Checkout.css';

const Checkout = () => {
  const { cart, clearCart } = useCartStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { validateCoupon, redeemCoupon } = useCouponStore();

  const [formData, setFormData] = useState({
    nome: user?.name || '',
    whatsapp: user?.whatsapp || user?.phone || '',
    endereco: user?.endereco || user?.address || '',
    numero: user?.numero || user?.number || '',
    bairro: user?.bairro || user?.neighborhood || '',
    cep: user?.cep || user?.zipCode || '',
    complemento: user?.complemento || '',
    cpf: user?.cpf || '', // CPF para cupons
    formaPagamento: 'PIX',
    troco: '',
    distancia: ''
  });
  const [selectedFee, setSelectedFee] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [cepError, setCepError] = useState('');

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState({ type: '', text: '' });

  // Sincronizar dados do usuário se eles mudarem (ex: login tardio)
  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        nome: prev.nome || user.name || '',
        whatsapp: prev.whatsapp || user.whatsapp || user.phone || '',
        endereco: prev.endereco || user.endereco || user.address || '',
        numero: prev.numero || user.numero || user.number || '',
        bairro: prev.bairro || user.bairro || user.neighborhood || '',
        cep: prev.cep || user.cep || user.zipCode || '',
        complemento: prev.complemento || user.complemento || '',
      }));
    }
  }, [user]);

  // Calcular distância automaticamente quando endereço já vem preenchido do cadastro
  React.useEffect(() => {
    const cep = formData.cep?.replace(/\D/g, '');
    const endereco = formData.endereco;
    const numero = formData.numero;
    if (cep?.length === 8 && endereco && numero && !formData.distancia) {
      calculateDistance(cep, endereco, numero);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.cep, formData.endereco, formData.numero]);

  // Calcular taxa de entrega baseado apenas no KM (Modo Único)
  React.useEffect(() => {
    if (formData.distancia) {
      const distNum = parseFloat(formData.distancia) || 0;
      const feePerKm = settings.deliveryFeePerKm || 2;
      setSelectedFee(distNum * feePerKm);
    } else {
      setSelectedFee(0);
    }
  }, [formData.distancia, settings.deliveryFeePerKm]);

  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
    return sum + itemPrice * item.quantity;
  }, 0);
  
  const getDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percentage') {
      return Math.min(subtotal, (subtotal * appliedCoupon.value) / 100);
    }
    return Math.min(subtotal, appliedCoupon.value);
  };

  const couponDiscount = getDiscount();
  const isCashPayment = formData.formaPagamento === 'PIX' || formData.formaPagamento === 'Dinheiro';
  const cashDiscountAmount = isCashPayment ? (subtotal * (settings.cashDiscount || 0) / 100) : 0;
  
  const isCardPayment = formData.formaPagamento === 'Cartão';
  const interestAmount = isCardPayment ? (subtotal * (settings.installmentInterest || 0) / 100) : 0;
  
  const total = Math.max(0, subtotal + selectedFee - couponDiscount - cashDiscountAmount + interestAmount);
  const pixCopyPaste = buildPixCopyPaste({
    pixKey: settings.pixKey,
    amount: total,
    merchantName: settings.storeName,
    merchantCity: getPixMerchantCity(settings.address),
  });
  const pixAmountLabel = `R$ ${total.toFixed(2).replace('.', ',')}`;

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) return;

    if (!formData.cpf || formData.cpf.trim().length < 11) {
      setCouponMsg({ type: 'error', text: 'Informe seu CPF para aplicar o cupom.' });
      toast.error('Informe seu CPF para aplicar o cupom.', { icon: '🆔' });
      return;
    }

    const result = await validateCoupon(couponCode, formData.cpf, subtotal);
    if (result.valid) {
      setAppliedCoupon(result.coupon);
      setCouponMsg({ type: 'success', text: `Cupom "${result.coupon.code}" aplicado!` });
      toast.success('Cupom aplicado com sucesso!');
    } else {
      setAppliedCoupon(null);
      setCouponMsg({ type: 'error', text: result.message });
      toast.error(result.message);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponMsg({ type: '', text: '' });
  };

  // eslint-disable-next-line no-unused-vars
  const handleCopyPixLegacy = () => {
    if (pixCopyPaste) {
      navigator.clipboard.writeText(pixCopyPaste);
      toast.success(`Pix copia e cola copiado com ${pixAmountLabel}!`, { icon: 'ðŸ“‹' });
      return;
    }

    toast.error('Configure uma chave Pix vÃ¡lida para gerar o cÃ³digo.');
    if (settings.pixKey) {
      navigator.clipboard.writeText(settings.pixKey);
      toast.success('Chave Pix copiada!', { icon: '📋' });
    }
  };

  // Debounce ref para cálculo de distância por número
  const handleCopyPix = () => {
    if (!pixCopyPaste) {
      toast.error('Configure uma chave Pix valida para gerar o codigo.');
      return;
    }

    navigator.clipboard.writeText(pixCopyPaste);
    toast.success(`Pix copia e cola copiado com ${pixAmountLabel}!`);
  };

  const distanceDebounceRef = useRef(null);

  const calculateDistance = useCallback(async (cep, street, number) => {
    if (!cep || !street || !number) return;
    try {
      const coords = await getCoordsFromAddress(street, number, 'Viamão', cep);
      if (coords) {
        const rawDist = calculateHaversineDistance(
          STORE_COORDS.lat,
          STORE_COORDS.lng,
          coords.lat,
          coords.lon
        );
        const finalDist = (rawDist * 1.2).toFixed(1);
        setFormData(prev => ({ ...prev, distancia: finalDist }));
      }
    } catch (coordsErr) {
      console.warn('Erro ao calcular distância:', coordsErr);
    }
  }, []);

  const fetchAddress = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
        }));
        // Cálculo de distância inicial pelo CEP
        try {
          const coords = await getCoordsFromCep(cleanCep);
          if (coords) {
            const rawDist = calculateHaversineDistance(
              STORE_COORDS.lat,
              STORE_COORDS.lng,
              coords.lat,
              coords.lon
            );
            setFormData(prev => ({ ...prev, distancia: (rawDist * 1.2).toFixed(1) }));
          }
        } catch (coordsErr) {
          console.warn('Erro ao calcular distância pelo CEP:', coordsErr);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container cart-empty">
        <ShoppingBag size={80} color="#cbd5e1" />
        <h2>Seu carrinho está vazio</h2>
        <p>Adicione produtos para finalizar seu pedido.</p>
        <Link to="/" className="btn-primary">Voltar para a loja</Link>
      </div>
    );
  }

  const handleWhatsAppOrder = async (e) => {
    e.preventDefault();

    if (!user?.authUserId) {
      toast.error('Faça login para finalizar o pedido.');
      navigate('/login?redirect=/checkout');
      return;
    }

    if (!validateCEP(formData.cep)) {
      setCepError('A Agropets atende somente a região de Viamão/RS. Por favor, utilize um CEP válido da região (94400-000 a 94599-999).');
      return;
    }

    setIsSending(true);
    const foneAgropets = settings.whatsapp || '51986240794';
    const mensagem = evolutionApi.formatOrderMessage(formData, cart, subtotal, selectedFee, total, couponDiscount + cashDiscountAmount);
    const encodedMessage = encodeURIComponent(mensagem);
    const whatsappUrl = `https://wa.me/${foneAgropets.replace(/\D/g, '')}?text=${encodedMessage}`;

    try {
      // Normaliza whatsapp para garantir match em fetchUserOrders
      const cleanWhatsapp = formData.whatsapp.replace(/\D/g, '');

      const orderData = {
        id: `PED-${crypto.randomUUID()}`,
        customer: formData.nome,
        email: user?.email || '',
        items: cart.map(i => ({
          productId: i.id,
          name: i.name + (i.selectedVariation ? ` (${i.selectedVariation.weight})` : ''),
          qty: i.quantity,
          price: i.selectedVariation?.price ?? i.price,
          // A opção base usa o estoque geral do produto; só variações adicionais
          // devem ser reservadas pelo peso dentro de products.variations.
          selectedWeight: i.selectedVariation && !i.selectedVariation.isBase
            ? i.selectedVariation.weight
            : null
        })),
        subtotal,
        deliveryFee: selectedFee,
        discount: couponDiscount + cashDiscountAmount,
        couponUsed: appliedCoupon?.code || null,
        total,
        status: 'Pendente',
        payment: formData.formaPagamento,
        address: {
          endereco: formData.endereco,
          numero: formData.numero,
          bairro: formData.bairro
        },
        cep: formData.cep,
        whatsapp: cleanWhatsapp,
        timestamp: new Date().toISOString()
      };

      // 1. Salvar pedido no Supabase — se falhar, interrompe tudo
      const { data: savedOrder, error: sbError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderData.id,
          customer_auth_id: user.authUserId,
          customer_name: orderData.customer,
          whatsapp: cleanWhatsapp,
          email: orderData.email,
          cpf: formData.cpf,
          total: orderData.total,
          subtotal: orderData.subtotal,
          delivery_fee: orderData.deliveryFee,
          discount: couponDiscount + cashDiscountAmount,
          status: orderData.status,
          payment: orderData.payment,
          items: orderData.items,
          address: orderData.address,
          cep: orderData.cep,
          coupon_used: orderData.couponUsed
        }])
        .select('id')
        .single();

      if (sbError) {
        console.error('Erro ao salvar pedido no Supabase:', sbError);
        toast.error('Erro ao registrar pedido. Tente novamente.');
        return;
      }

      // 2. A reserva e o log de estoque ocorrem em uma única transação no banco.
      const { error: stockError } = await supabase.rpc('reserve_order_stock', { p_order_id: savedOrder.id });
      if (stockError) throw stockError;

      // 3. Resgatar cupom (apenas após pedido confirmado)
      if (appliedCoupon) {
        await redeemCoupon(savedOrder.id);
      }

      // 4. Enviar e-mail de confirmação (não-bloqueante)
      if (user?.email) {
        emailService.sendOrderConfirmation(orderData, user).catch(err =>
          console.warn('Email não enviado:', err)
        );
      }

      // 5. Só abre o WhatsApp depois de persistir o pedido.
      const whatsappWindow = window.open(whatsappUrl, '_blank');
      if (!whatsappWindow || whatsappWindow.closed) window.location.href = whatsappUrl;

      setOrderSuccess(true);
      clearCart();
      setTimeout(() => navigate('/'), 8000);

    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error('Ocorreu um erro ao processar seu pedido. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container checkout-page fade-in">
      <div className="cart-header">
        <h1>Finalizar Pedido</h1>
        <Link to="/cart" className="continue-link">
          <ArrowLeft size={16} /> Voltar ao carrinho
        </Link>
      </div>

      <div className="checkout-container">
        <form className="checkout-form" onSubmit={handleWhatsAppOrder}>
          {!user && (
            <div className="login-alert-banner fade-in">
              <div className="login-alert-content">
                <div className="login-alert-icon">
                  <LogIn size={24} />
                </div>
                <div className="login-alert-text">
                  <h4>Já possui uma conta?</h4>
                  <p>Faça login para preencher seus dados automaticamente e finalizar mais rápido.</p>
                </div>
              </div>
              <Link to="/login?redirect=/checkout" className="btn-login-checkout">
                Fazer Login
              </Link>
            </div>
          )}
          <div className="checkout-section">
            <h3><User size={20} /> Seus Dados</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Nome Completo</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>WhatsApp</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="(00) 00000-0000"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                />
              </div>
            </div>
            <div className="form-group">
              <label>CPF (Opcional - necessário p/ cupons)</label>
              <input 
                type="text" 
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => setFormData({...formData, cpf: e.target.value})}
              />
            </div>
          </div>

          <div className="checkout-section">
            <h3><MapPin size={20} /> Endereço de Entrega</h3>
            <div className="form-row">
              <div className="form-group">
                <label>CEP</label>
                <input 
                  type="text" 
                  required 
                  placeholder="94400-000"
                  value={formData.cep}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({...formData, cep: val});
                    setCepError('');
                    fetchAddress(val);
                  }}
                />
                {cepError && <small style={{ color: 'var(--error)', fontWeight: 600 }}>{cepError}</small>}
              </div>
              {/* Campo de distância oculto conforme solicitação do usuário */}
              <input type="hidden" value={formData.distancia} />
            </div>
            <div className="form-group">
              <label>Rua / Logradouro</label>
              <input 
                type="text" 
                required 
                placeholder="Nome da rua"
                value={formData.endereco}
                onChange={(e) => setFormData({...formData, endereco: e.target.value})}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Número</label>
                <input 
                  type="text" 
                  required 
                  placeholder="123"
                  value={formData.numero}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, numero: val }));
                    // Debounce de 800ms para não disparar a cada tecla
                    if (distanceDebounceRef.current) clearTimeout(distanceDebounceRef.current);
                    if (val.length >= 1 && formData.cep && formData.endereco) {
                      distanceDebounceRef.current = setTimeout(() => {
                        calculateDistance(formData.cep, formData.endereco, val);
                      }, 800);
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>Complemento (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Apto, Bloco, etc"
                  value={formData.complemento}
                  onChange={(e) => setFormData({...formData, complemento: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h3>Pagamento na Entrega</h3>
            <div className="payment-options-grid">
              <div 
                className={`payment-option-card ${formData.formaPagamento === 'PIX' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, formaPagamento: 'PIX'})}
              >
                <div className="payment-icon-wrapper pix">
                  <QrCode size={24} />
                </div>
                <div className="payment-texts">
                  <span className="payment-name">Pix</span>
                  <span className="payment-desc">Pagamento Instantâneo</span>
                </div>
                <div className="payment-checkmark">
                  <CheckCircle size={16} />
                </div>
              </div>

              {formData.formaPagamento === 'PIX' && (
                <div className="pix-copy-paste-box fade-in">
                  <div className="pix-info">
                    <span className="pix-label">Pix copia e cola</span>
                    <strong className="pix-total">Valor: {pixAmountLabel}</strong>
                    <span className="pix-code">
                      {pixCopyPaste || 'Configure uma chave Pix para gerar o codigo automaticamente.'}
                    </span>
                  </div>
                  <button type="button" className="btn-copy-pix" onClick={handleCopyPix} disabled={!pixCopyPaste}>
                    <Copy size={18} /> Copiar
                  </button>
                </div>
              )}

              <div 
                className={`payment-option-card ${formData.formaPagamento === 'Cartão' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, formaPagamento: 'Cartão'})}
              >
                <div className="payment-icon-wrapper card">
                  <CreditCard size={24} />
                </div>
                <div className="payment-texts">
                  <span className="payment-name">Cartão</span>
                  <span className="payment-desc">Máquina na entrega</span>
                </div>
                <div className="payment-checkmark">
                  <CheckCircle size={16} />
                </div>
              </div>

              <div 
                className={`payment-option-card ${formData.formaPagamento === 'Dinheiro' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, formaPagamento: 'Dinheiro'})}
              >
                <div className="payment-icon-wrapper cash">
                  <Banknote size={24} />
                </div>
                <div className="payment-texts">
                  <span className="payment-name">Dinheiro</span>
                  <span className="payment-desc">Pague na entrega</span>
                </div>
                <div className="payment-checkmark">
                  <CheckCircle size={16} />
                </div>
              </div>

              {formData.formaPagamento === 'Dinheiro' && (
                <div className="pix-copy-paste-box fade-in" style={{ gap: '12px', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                    💵 Precisa de troco?
                  </span>
                  <input
                    type="number"
                    placeholder={``}
                    value={formData.troco || ''}
                    onChange={(e) => setFormData({ ...formData, troco: e.target.value })}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                    min={total}
                  />
                  {formData.troco && parseFloat(formData.troco) > 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700 }}>
                      Troco: R$ {(parseFloat(formData.troco) - total).toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {orderSuccess ? (
            <div className="order-success-premium fade-in">
              <div className="success-icon-wrapper">
                <CheckCircle size={48} />
              </div>
              <div className="success-texts">
                <h2>Pedido Enviado!</h2>
                <p>Seu pedido foi processado com sucesso. Redirecionando para a Home em alguns segundos...</p>
                <div className="order-details-summary">
                  <div className="summary-row"><span>Status:</span> <span className="status-badge">Confirmado</span></div>
                  <div className="summary-row"><span>Pagamento:</span> <span>{formData.formaPagamento}</span></div>
                </div>
                <button className="btn-back-home" onClick={() => navigate('/')}>Ir para a Home agora</button>
              </div>
            </div>
          ) : (
            <button type="submit" className="btn-confirm-order" disabled={isSending}>
              {isSending ? <>Quase lá...</> : <><Send size={20} /> Finalizar e Enviar via WhatsApp</>}
            </button>
          )}
        </form>

        <div className="checkout-summary">
          <div className="glass-card">
            <h3>Resumo do Pedido</h3>
            <div className="checkout-items-mini">
              {cart.map(item => {
                const itemPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
                return (
                <div key={item.cartId || item.id} className="mini-item">
                  <div className="mini-item-img">
                    <img src={item.img || null} alt={item.name} />
                    <span className="mini-item-qty">{item.quantity}</span>
                  </div>
                  <div className="mini-item-info">
                    <span className="mini-item-name">{item.name}{item.selectedVariation ? ` (${item.selectedVariation.weight})` : ''}</span>
                    <span className="mini-item-price">R$ {(itemPrice * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
                );
              })}
            </div>
            <div className="summary-divider"></div>
            
            <div className="coupon-section">
              <div className="coupon-input-group">
                <input 
                  type="text" 
                  placeholder="Cupom de desconto"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={appliedCoupon}
                />
                {!appliedCoupon ? (
                  <button type="button" className="btn-apply-coupon" onClick={handleApplyCoupon}>
                    <Tag size={16} /> Aplicar
                  </button>
                ) : (
                  <button type="button" className="btn-remove-coupon" onClick={removeCoupon}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {couponMsg.text && (
                <div className={`coupon-msg ${couponMsg.type} fade-in`}>
                  {couponMsg.text}
                </div>
              )}
            </div>

            <div className="summary-divider"></div>
            <div className="summary-row-alt">
              <span>Subtotal:</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="summary-row-alt discount fade-in">
                <span>Cupom {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}:</span>
                <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {cashDiscountAmount > 0 && (
              <div className="summary-row-alt discount fade-in">
                <span>Desconto à Vista ({settings.cashDiscount}%):</span>
                <span>- R$ {cashDiscountAmount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {interestAmount > 0 && (
              <div className="summary-row-alt interest fade-in" style={{ color: '#ef4444' }}>
                <span>Juros Cartão ({settings.installmentInterest}%):</span>
                <span>+ R$ {interestAmount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="summary-row-alt">
              <span>Taxa de Entrega:</span>
              <span>{selectedFee > 0 ? `R$ ${selectedFee.toFixed(2).replace('.', ',')}` : 'Informe o endereço'}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-total-final">
              <span className="total-value-label">Total a pagar:</span>
              <span className="total-value">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <p className="delivery-note">📍 Atendimento exclusivo em Viamão/RS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
