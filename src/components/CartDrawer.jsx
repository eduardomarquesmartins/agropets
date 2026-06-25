import React from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';
import './CartDrawer.css';

const CartDrawer = () => {
  const { cart, isDrawerOpen, setDrawerOpen, updateQuantity, removeFromCart } = useCartStore();
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => {
    const itemPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
    return sum + (itemPrice * item.quantity);
  }, 0);

  if (!isDrawerOpen) return null;

  return (
    <div className="cart-drawer-overlay" onClick={() => setDrawerOpen(false)}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <div className="header-title">
            <ShoppingBag size={20} />
            <span>Seu Carrinho ({cart.length})</span>
          </div>
          <button className="close-drawer" onClick={() => setDrawerOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-drawer-content">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingBag size={64} opacity={0.2} />
              <p>Seu carrinho está vazio</p>
              <button className="btn-continue" onClick={() => setDrawerOpen(false)}>
                Continuar Comprando
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map((item) => {
                const itemPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
                return (
                  <div key={item.cartId} className="cart-drawer-item">
                    <div className="item-img">
                      <img src={item.img || null} alt={item.name} />
                    </div>
                    <div className="item-details">
                      <h4>{item.name}</h4>
                      {item.selectedVariation && (
                        <span className="item-variation-badge">{item.selectedVariation.weight}</span>
                      )}
                      <div className="item-price">R$ {itemPrice.toFixed(2).replace('.', ',')}</div>
                      <div className="item-controls">
                        <div className="quantity-selector">
                          <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)}>
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <button className="remove-item" onClick={() => removeFromCart(item.cartId)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="drawer-subtotal">
              <span>Subtotal</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <button 
              className="btn-checkout" 
              onClick={() => {
                setDrawerOpen(false);
                navigate('/checkout');
              }}
            >
              Finalizar Pedido <ArrowRight size={18} />
            </button>
            <button className="btn-view-cart" onClick={() => {
              setDrawerOpen(false);
              navigate('/cart');
            }}>
              Ver Carrinho Completo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
