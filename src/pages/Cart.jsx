import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ArrowRight, CreditCard, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import './Cart.css';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity } = useCartStore();
  const navigate = useNavigate();
  
  const total = cart.reduce((sum, item) => {
    const itemPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
    return sum + itemPrice * item.quantity;
  }, 0);

  if (cart.length === 0) {
    return (
      <div className="container cart-empty-premium fade-in">
        <div className="empty-icon-wrapper">
          <ShoppingCart size={64} strokeWidth={1.5} />
        </div>
        <h2>Seu carrinho está vazio</h2>
        <p>Parece que você ainda não adicionou produtos. Que tal dar uma olhada nas nossas ofertas?</p>
        <Link to="/" className="btn-back-home-cart">
          <ArrowLeft size={18} /> Explorar Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="container cart-page-premium scale-in">
      <div className="cart-header-premium">
        <div className="header-text">
          <h1>Meu Carrinho</h1>
          <p>Você tem <strong>{cart.length} {cart.length === 1 ? 'item' : 'itens'}</strong> no seu pedido</p>
        </div>
        <Link to="/" className="continue-shopping">
          <ArrowLeft size={18} /> <span>Continuar Comprando</span>
        </Link>
      </div>

      <div className="cart-grid-premium">
        <div className="cart-items-column">
          {cart.map((item) => {
            const itemPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
            return (
            <div key={item.cartId} className="cart-card-item">
              <div className="item-img-container">
                <img src={item.img || null} alt={item.name} />
              </div>
              
              <div className="item-details-main">
                <div className="item-info-top">
                  <h3>{item.name}</h3>
                  {item.selectedVariation && (
                    <span className="item-variation-badge">{item.selectedVariation.weight}</span>
                  )}
                  <button className="delete-item-btn" onClick={() => removeFromCart(item.cartId)} title="Remover item">
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="item-meta-bottom">
                  <div className="quantity-controls-premium">
                    <button onClick={() => updateQuantity(item.cartId, Math.max(1, item.quantity - 1))}>
                      <Minus size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <div className="item-pricing">
                    <span className="price-unit">R$ {itemPrice.toFixed(2).replace('.', ',')}</span>
                    <span className="price-total">R$ {(itemPrice * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div className="cart-summary-column">
          <div className="summary-card-premium sticky-summary">
            <h3>Resumo do Pedido</h3>
            
            <div className="summary-details">
              <div className="summary-line">
                <span>Subtotal</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="summary-line">
                <span>Entrega</span>
                <span className="free-text">Calculado no Checkout</span>
              </div>
            </div>

            <div className="summary-total-premium">
              <div className="total-label">Subtotal Sugerido</div>
              <div className="total-value-cart">R$ {total.toFixed(2).replace('.', ',')}</div>
            </div>

            <button className="btn-go-checkout" onClick={() => navigate('/checkout')}>
              Finalizar Compra <ArrowRight size={20} />
            </button>
            
            <div className="safe-checkout-badge">
              <ShieldCheck size={16} /> <span>Checkout 100% Seguro</span>
            </div>

            <div className="accepted-payments-mini">
              <p>Formas de Pagamento:</p>
              <div className="payment-icons-flex">
                <div className="payment-mini-icon" title="Pix">
                  <div className="pix-icon-s">X</div>
                </div>
                <div className="payment-mini-icon" title="Cartão de Crédito">
                  <CreditCard size={16} />
                </div>
                <div className="payment-mini-icon" title="Dinheiro">
                  <span>$</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
