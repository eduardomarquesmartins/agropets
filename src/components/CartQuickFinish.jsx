import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import './CartQuickFinish.css';

const CartQuickFinish = () => {
  const { cart } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  const total = cart.reduce((sum, item) => {
    const itemPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
    return sum + (itemPrice * item.quantity);
  }, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Ocultar se o carrinho estiver vazio
  // Ocultar em páginas de checkout ou admin/vet
  if (cart.length === 0) return null;
  if (location.pathname === '/checkout' || location.pathname === '/cart' || location.pathname.startsWith('/admin') || location.pathname.startsWith('/vet')) return null;

  return (
    <div className="cart-quick-finish-mobile">
      <div className="quick-finish-content">
        <div className="quick-finish-info">
          <div className="quick-bag-icon">
            <ShoppingBag size={20} />
            <span className="quick-count">{itemCount}</span>
          </div>
          <div className="quick-texts">
            <span className="quick-label">Total do Carrinho</span>
            <span className="quick-price">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
        <button className="btn-quick-finalize" onClick={() => navigate('/checkout')}>
          Finalizar <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default CartQuickFinish;
