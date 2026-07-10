import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import './MobileNavbar.css';

const MobileNavbar = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { cart, setDrawerOpen } = useCartStore();
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const accountPath = user
    ? user.role === 'admin'
      ? '/admin'
      : user.role === 'vet'
        ? '/vet'
        : '/minha-conta'
    : `/login?redirect=${encodeURIComponent('/minha-conta')}`;

  // Não mostrar o navbar no admin
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <nav className="mobile-bottom-nav">
      <Link 
        to="/" 
        className={`mobile-nav-item ${location.pathname === '/' ? 'active' : ''}`}
        onClick={() => setDrawerOpen(false)}
      >
        <Home size={22} />
        <span>Início</span>
      </Link>
      

      <button className="mobile-nav-item" onClick={() => setDrawerOpen(true)}>
        <div className="cart-icon-wrapper">
          <ShoppingCart size={22} />
          {cartCount > 0 && <span className="cart-badge-mobile">{cartCount}</span>}
        </div>
        <span>Carrinho</span>
      </button>

      <Link 
        to={accountPath} 
        className={`mobile-nav-item ${location.pathname === '/login' || location.pathname === '/minha-conta' || location.pathname === '/admin' || location.pathname === '/vet' ? 'active' : ''}`}
        onClick={() => setDrawerOpen(false)}
      >
        <User size={22} />
        <span>Conta</span>
      </Link>
    </nav>
  );
};

export default MobileNavbar;
