import React, { useState, useRef } from 'react';
import { Search, MapPin, User, Heart, ShoppingCart, Percent, Phone, ChevronDown, LayoutGrid, Instagram, Facebook, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartStore, useSearchStore, useWishlistStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCategoryStore } from '../store/categoryStore';
import { CATEGORY_ICONS } from '../config/categories';
import { capitalizeTitle } from '../utils/stringUtils';
import CartDrawer from './CartDrawer';
import './Header.css';

const formatPhone = (phone) => {
  if (!phone) return "";
  let cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 3)} ${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  return phone;
};

const getWhatsAppLink = (phone) => {
  if (!phone) return "";
  let cleaned = ('' + phone).replace(/\D/g, '');
  return cleaned.startsWith('55') ? `https://wa.me/${cleaned}` : `https://wa.me/55${cleaned}`;
};

const NavItem = ({ cat, catIcons }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const timer = useRef(null);
  const ref = useRef(null);

  const onEnter = () => {
    clearTimeout(timer.current);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen(true);
  };

  const onLeave = () => {
    timer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="nav-dropdown-wrapper" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Link ref={ref} to={`/categoria/${cat.id}`} className="nav-link">
        {catIcons[cat.id]} {capitalizeTitle(cat.name)}
        {cat.subCategories?.length > 0 && <ChevronDown size={14} className={`nav-chevron ${open ? 'open' : ''}`} />}
      </Link>
      {open && cat.subCategories?.length > 0 && (
        <div className="nav-dropdown-menu" style={{ top: pos.top, left: pos.left }}>
          {cat.subCategories.map(sub => (
            <Link 
              key={sub.id} 
              to={`/categoria/${cat.id}?sub=${sub.id}`} 
              className="nav-dropdown-item"
              onClick={() => setOpen(false)}
            >
              {capitalizeTitle(sub.name)} 
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownTimer = useRef(null);
  const catTriggerRef = useRef(null);
  const location = useLocation();
  const { cart, setDrawerOpen } = useCartStore();
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  
  const wishlistCount = useWishlistStore((state) => state.wishlist.length);
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const { categories } = useCategoryStore();
  const customerAccountPath = '/minha-conta';
  const accountRedirect = `/login?redirect=${encodeURIComponent(customerAccountPath)}`;
  const wishlistRedirect = `/login?redirect=${encodeURIComponent('/minha-conta?tab=wishlist')}`;
  const accountPath = user
    ? user.role === 'admin'
      ? '/admin'
      : user.role === 'vet'
        ? '/vet'
        : customerAccountPath
    : accountRedirect;
  const wishlistPath = user ? `${customerAccountPath}?tab=wishlist` : wishlistRedirect;
  
  const { searchQuery, setSearchQuery } = useSearchStore();

  const [isCepModalOpen, setIsCepModalOpen] = useState(false);
  const [cep, setCep] = useState('');
  const [cepResult, setCepResult] = useState(null);

  const handleCepChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = `${value.slice(0, 5)}-${value.slice(5)}`;
    }
    setCep(value);
    setCepResult(null);
  };

  const checkDelivery = (e) => {
    e.preventDefault();
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    // Regra: Viamão começa com 944
    if (cleanCep.startsWith('944')) {
      setCepResult({
        success: true,
        message: 'Ótima notícia! Nós entregamos na sua região em Viamão.'
      });
    } else {
      setCepResult({
        success: false,
        message: 'Infelizmente ainda não entregamos nesta região. Nosso foco atual é Viamão/RS.'
      });
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim()) {
      navigate(`/busca?q=${encodeURIComponent(value.trim())}`);
    } else if (location.pathname === '/busca') {
      navigate('/');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(''); // limpa o store para não interferir na home
    }
  };

  if (location.pathname.startsWith('/admin')) return null;

  return (
    <header className="header">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="container">
          <div className="welcome-text">Bem-vindo à Agropets - Sua loja agropecuária e pet shop completo!</div>
          <div className="top-links">
            <a href="https://www.instagram.com/agropetscao/" className="top-link-item" target="_blank" rel="noopener noreferrer">
              <Instagram size={14} /> Instagram
            </a>
            <a href="https://www.facebook.com/people/agropetscao/100086957164236/" className="top-link-item" target="_blank" rel="noopener noreferrer">
              <Facebook size={14} /> Facebook
            </a>
            <a href={getWhatsAppLink(settings.whatsapp)} className="top-link-item" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg> Televendas: {formatPhone(settings.whatsapp)}
            </a>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="middle-bar">
        <div className="container header-main-container">
          
          {/* Logo */}
          <Link to="/" className="logo-container">
            <img src={settings.logo || '/agropetssemfundo.png'} alt={`${settings.storeName} Logo`} />
          </Link>

          {/* Search Bar */}
          <form className="search-container" onSubmit={handleSearchSubmit}>
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="O que o seu pet precisa hoje?" 
              value={searchQuery}
              onChange={handleSearch}
            />
            <button type="submit" className="search-button">Buscar</button>
          </form>

          {/* Actions */}
          <div className="user-actions">
            
            <button className="action-item" onClick={() => setIsCepModalOpen(true)}>
              <MapPin className="icon" size={24} />
              <div className="action-text">
                <span>{cep.length === 9 && cepResult?.success ? `CEP: ${cep}` : 'Onde você está?'}</span>
                <span>{cep.length === 9 && cepResult?.success ? 'Entrega Disponível' : 'Informe seu CEP'}</span>
              </div>
            </button>

            {user ? (
              <Link to={accountPath} className="action-item">
                <User className="icon" size={24} />
                <div className="action-text">
                  <span>Olá, {(user.name || 'Usuário').split(' ')[0]}</span>
                  <span>{user.role === 'admin' ? 'Painel Admin' : user.role === 'vet' ? 'Painel Vet' : 'Minha Conta'}</span>
                </div>
              </Link>
            ) : (
              <Link to={accountPath} className="action-item">
                <User className="icon" size={24} />
                <div className="action-text">
                  <span>Bem-vindo</span>
                  <span>Entrar ou Cadastrar</span>
                </div>
              </Link>
            )}

            <Link to={wishlistPath} className="action-item">
              <div style={{ position: 'relative' }}>
                <Heart className="icon" size={24} color={'#f97316'}/>
                {wishlistCount > 0 && <div className="cart-badge" style={{ backgroundColor: '#f97316' }}>{wishlistCount}</div>}
              </div>
            </Link>

            <div className="cart-button" onClick={() => setDrawerOpen(true)} style={{ cursor: 'pointer' }}>
              <ShoppingCart size={24} />
              {cartCount > 0 && <div className="cart-badge">{cartCount}</div>}
            </div>

          </div>
        </div>
      </div>

      <CartDrawer />

      {/* Navigation Menu */}
      <div className="bottom-bar">
        <div className="container">
          <nav className="nav-menu">
            <Link to="/ofertas" className="nav-link offers">
              <Percent size={18} /> OFERTAS
            </Link>
            <a href="/#sessao-veterinaria" className="nav-link" style={{ color: '#ef4444', fontWeight: 800 }} onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                const target = document.getElementById('sessao-veterinaria');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
              }
            }}>
              🏥 Agro VET
            </a>

            {categories.map(cat => {
              // Só mostra na barra principal se tiver ícone definido em CATEGORY_ICONS
              if (CATEGORY_ICONS[cat.id]) {
                return (
                  <NavItem 
                    key={cat.id} 
                    cat={cat} 
                    catIcons={CATEGORY_ICONS} 
                  />
                );
              }
              return null;
            })}

            {/* Links Extras Gerenciáveis ou Fixos */}
            <a href="/#sessao-veterinaria" className="nav-link" onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                const target = document.getElementById('sessao-veterinaria');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
              }
            }}>
              🩺 Serviços
            </a>

            {/* Dropdown Categorias — todas (fixas + novas criadas no admin) */}
            <div
              className="nav-dropdown-wrapper"
              onMouseEnter={() => {
                clearTimeout(dropdownTimer.current);
                if (catTriggerRef.current) {
                  const rect = catTriggerRef.current.getBoundingClientRect();
                  setDropdownPos({ top: rect.bottom + 6, left: rect.left });
                }
                setCatDropdownOpen(true);
              }}
              onMouseLeave={() => { dropdownTimer.current = setTimeout(() => setCatDropdownOpen(false), 150); }}
            >
              <button ref={catTriggerRef} className="nav-link nav-dropdown-trigger">
                <LayoutGrid size={15} /> Categorias <ChevronDown size={14} className={`nav-chevron ${catDropdownOpen ? 'open' : ''}`} />
              </button>
              {catDropdownOpen && (
                <div className="nav-dropdown-menu" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
                  {categories.map(cat => (
                    <Link
                      key={cat.id}
                      to={`/categoria/${cat.id}`}
                      className="nav-dropdown-item"
                      onClick={() => setCatDropdownOpen(false)}
                    >
                      {capitalizeTitle(cat.name)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* CEP Modal */}
      {isCepModalOpen && (
        <div className="cep-modal-overlay" onClick={() => setIsCepModalOpen(false)}>
          <div className="cep-modal-content" onClick={e => e.stopPropagation()}>
            <button className="cep-modal-close" onClick={() => setIsCepModalOpen(false)}>
              <X size={20} />
            </button>
            <div className="cep-modal-header">
              <MapPin size={32} className="cep-icon-main" />
              <h3>Verificar Entrega</h3>
              <p>Informe seu CEP para saber se entregamos na sua região.</p>
            </div>
            <form onSubmit={checkDelivery} className="cep-form">
              <div className="cep-input-wrapper">
                <input 
                  type="text" 
                  placeholder="00000-000" 
                  value={cep} 
                  onChange={handleCepChange}
                  maxLength="9"
                  autoFocus
                />
                <button type="submit" className="btn-check-cep" disabled={cep.replace(/\D/g, '').length !== 8}>
                  Verificar
                </button>
              </div>
            </form>

            {cepResult && (
              <div className={`cep-result-message ${cepResult.success ? 'success' : 'error'}`}>
                {cepResult.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span>{cepResult.message}</span>
              </div>
            )}

            <div className="cep-modal-footer">
              <p>Dúvidas? <a href={getWhatsAppLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer">Fale conosco no WhatsApp</a></p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
