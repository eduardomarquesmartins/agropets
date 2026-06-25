import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import CategoryList from '../components/CategoryList';
import { useProductStore } from '../store/productStore';

import { ShoppingCart, Heart, Filter, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useCartStore, useWishlistStore } from '../store/cartStore';
import { useCategoryStore } from '../store/categoryStore';
import { CATEGORY_MAPPING, CATEGORY_NAMES } from '../config/categories';
import { capitalizeTitle } from '../utils/stringUtils';
import '../components/ProductList.css';
import './CategoryPage.css';

const CategoryProductCard = ({ product }) => {
  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addToCart);
  const { toggleWishlist, wishlist } = useWishlistStore();
  const isFavorite = wishlist.some(item => item.id === product.id);

  const price = Number(product.price) || 0;
  const oldPrice = product.oldPrice ? Number(product.oldPrice) : null;

  const handleWishlist = () => {
    toggleWishlist(product);
    if (isFavorite) {
      toast.error('Removido dos favoritos', { id: 'wishlist' });
    } else {
      toast.success('Adicionado aos favoritos!', { id: 'wishlist' });
    }
  };

  const handleCart = () => {
    addToCart(product);
    
    toast.success((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span><strong>{product.name}</strong> adicionado!</span>
        <button 
          onClick={() => {
            toast.dismiss(t.id);
            navigate('/checkout');
          }}
          style={{
            background: 'var(--primary, #f97316)',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px'
          }}
        >
          Finalizar Pedido
        </button>
      </div>
    ), { duration: 4000 });
  };

  return (
    <motion.div className="product-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {product.discount > 0 && <div className="discount-badge">-{product.discount}%</div>}
      <button className={`wishlist-btn ${isFavorite ? 'active' : ''}`} onClick={handleWishlist}>
        <Heart size={20} fill={isFavorite ? "#f97316" : "none"} color={isFavorite ? "#f97316" : "currentColor"} />
      </button>
      <Link to={`/produto/${product.id}`} className="product-link">
        <div className="product-img-wrapper"><img src={product.img} alt={product.name} /></div>
        <div className="product-info"><span className="product-brand">{product.brand || 'Agropets'}</span><h3 className="product-name">{product.name}</h3></div>
      </Link>
      <div className="product-info" style={{ marginTop: 0, paddingTop: 0 }}>
        <div className="product-rating">
          <span className="stars">{'★'.repeat(Math.round(Number(product.reviews) > 0 ? Number(product.rating) : 5))}</span>
          <span className="reviews">({product.reviews || 0})</span>
        </div>
        <div className="product-pricing">
          {oldPrice && oldPrice > price && <span className="old-price">R$ {oldPrice.toFixed(2).replace('.', ',')}</span>}
          <span className="current-price">R$ {price.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>
      <button className="add-to-cart-btn" onClick={handleCart}>
        <ShoppingCart size={20} /> Adicionar
      </button>
    </motion.div>
  );
};

const CategoryPage = () => {
  const { categoryData } = useParams();
  const location = useLocation();
  const products = useProductStore((state) => state.products);
  const { categories } = useCategoryStore();
  const subCategoryFromUrl = useMemo(
    () => new URLSearchParams(location.search).get('sub'),
    [location.search]
  );
  
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState(() =>
    subCategoryFromUrl ? [subCategoryFromUrl] : []
  );
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  const targetId = useMemo(() => CATEGORY_MAPPING[categoryData] || categoryData, [categoryData]);
  const title = useMemo(() => CATEGORY_NAMES[targetId] || 'Categoria', [targetId]);

  // Filtra por categoria e status ativo
  const categoryProducts = useMemo(() => {
    return products.filter(p => p.category === targetId && p.status === 'active');
  }, [products, targetId]);

  const currentCategory = useMemo(() => {
    return categories.find(c => c.id === targetId);
  }, [categories, targetId]);

  React.useEffect(() => {
    setSelectedSubCategories(subCategoryFromUrl ? [subCategoryFromUrl] : []);
  }, [subCategoryFromUrl, targetId]);
  
  // Extract unique brands for the filter sidebar
  const availableBrands = useMemo(() => 
    [...new Set(categoryProducts.map(p => p.brand).filter(Boolean))],
    [categoryProducts]
  );

  const handleBrandToggle = (brand) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handleSubCategoryToggle = (subId) => {
    setSelectedSubCategories(prev => 
      prev.includes(subId) ? prev.filter(s => s !== subId) : [...prev, subId]
    );
  };

  // Apply Filters
  const filteredProducts = useMemo(() => {
    let result = categoryProducts;

    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    if (selectedSubCategories.length > 0) {
      result = result.filter(p => selectedSubCategories.includes(p.subCategory));
    }

    if (priceRange.min) {
      result = result.filter(p => p.price >= Number(priceRange.min));
    }
    if (priceRange.max) {
      result = result.filter(p => p.price <= Number(priceRange.max));
    }

    return result;
  }, [categoryProducts, selectedBrands, selectedSubCategories, priceRange]);

  return (
    <div className="category-page fade-in">
      <div className="container" style={{ paddingTop: '2rem' }}>
         
         <div className="category-layout">
            <aside className={`filters-sidebar ${showFilters ? 'show-mobile' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
                  <Filter size={20} /> <span>Filtros</span>
                </div>
                <button className="mobile-only close-filters" onClick={() => setShowFilters(false)}>
                  <ChevronDown size={24} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>

              {currentCategory?.subCategories && (
                <div className="filter-section">
                  <h4>Departamentos <ChevronDown size={16} /></h4>
                  {currentCategory.subCategories.map(sub => (
                    <label key={sub.id} className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedSubCategories.includes(sub.id)}
                        onChange={() => handleSubCategoryToggle(sub.id)}
                      />
                      {capitalizeTitle(sub.name)}
                    </label>
                  ))}
                </div>
              )}

              <div className="filter-section">
                <h4>Marcas <ChevronDown size={16} /></h4>
                {availableBrands.length > 0 ? availableBrands.map(brand => (
                  <label key={brand} className="filter-option">
                    <input 
                      type="checkbox" 
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandToggle(brand)}
                    />
                    {brand}
                  </label>
                )) : <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nenhuma marca encontrada</p>}
              </div>

              <div className="filter-section">
                <h4>Faixa de Preço <ChevronDown size={16} /></h4>
                <div className="price-inputs">
                  <input 
                    type="number" 
                    placeholder="Mín" 
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({...prev, min: e.target.value}))}
                  />
                  <span>-</span>
                  <input 
                    type="number" 
                    placeholder="Máx" 
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({...prev, max: e.target.value}))}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1.5rem' }}>
                <button 
                  className="filter-btn" 
                  style={{ 
                    background: 'var(--primary)', 
                    color: 'white', 
                    marginTop: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={() => setShowFilters(false)}
                >
                  Ver {filteredProducts.length} {filteredProducts.length === 1 ? 'Produto' : 'Produtos'}
                </button>
                
                <button 
                  className="filter-btn" 
                  style={{ marginTop: 0, background: '#f1f5f9', color: '#64748b' }}
                  onClick={() => { 
                    setSelectedBrands([]); 
                    setSelectedSubCategories([]);
                    setPriceRange({min:'', max:''}); 
                  }}
                >
                  Limpar Filtros
                </button>
              </div>
            </aside>

            <main className="category-results">
              <div className="category-results-header">
                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-dark)' }}>{capitalizeTitle(title)}</h2>
                <div className="header-actions">
                  <span className="products-count">{filteredProducts.length} produtos</span>
                  <button className="btn-mobile-filter mobile-only" onClick={() => setShowFilters(!showFilters)}>
                    <Filter size={16} /> {showFilters ? 'Fechar Filtros' : 'Filtrar'}
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                   <h3 style={{ color: '#64748b', marginBottom: '1rem' }}>Nenhum produto encontrado com estes filtros.</h3>
                   <button className="btn-primary" onClick={() => { 
                     setSelectedBrands([]); 
                     setSelectedSubCategories([]);
                     setPriceRange({min:'', max:''}); 
                   }}>Limpar Busca</button>
                </div>
              ) : (
                <div className="products-grid">
                  {filteredProducts.map(product => (
                    <CategoryProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </main>
         </div>
      </div>
    </div>
  );
};

export default CategoryPage;
