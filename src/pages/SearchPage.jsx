import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, ShoppingCart, Heart, X } from 'lucide-react';
import { useProductStore } from '../store/productStore';
import { useCategoryStore } from '../store/categoryStore';
import { useCartStore, useWishlistStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import toast from 'react-hot-toast';
import { capitalizeTitle } from '../utils/stringUtils';
import './SearchPage.css';

const normalize = (str) =>
  str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';

const SearchProductCard = ({ product }) => {
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.addToCart);
  const { toggleWishlist, wishlist } = useWishlistStore();
  const { settings } = useSettingsStore();
  const { categories } = useCategoryStore();
  const isFavorite = wishlist.some((i) => i.id === product.id);

  const price = Number(product.price) || 0;
  const oldPrice = product.oldPrice ? Number(product.oldPrice) : null;

  const subCatName = useMemo(() => {
    const cat = categories.find((c) => c.id === product.category);
    const sub = cat?.subCategories?.find((s) => s.id === product.subCategory);
    return capitalizeTitle(sub?.name || product.brand || cat?.name || 'Geral');
  }, [categories, product]);

  const maxInst = product.maxInstallments > 0 ? product.maxInstallments : (settings.maxInstallments || 1);
  const interest = settings.installmentInterest || 0;
  const instVal = (price * (1 + interest / 100)) / maxInst;

  const handleCart = () => {
    addToCart(product);
    toast.success(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span><strong>{product.name}</strong> adicionado!</span>
          <button
            onClick={() => { toast.dismiss(t.id); navigate('/checkout'); }}
            style={{ background: 'var(--brand-p)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
          >
            Finalizar Pedido
          </button>
        </div>
      ),
      { duration: 4000 }
    );
  };

  return (
    <motion.div className="product-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {product.discount > 0 && <div className="discount-badge">-{product.discount}%</div>}
      <button
        className={`wishlist-btn ${isFavorite ? 'active' : ''}`}
        onClick={() => {
          toggleWishlist(product);
          toast[isFavorite ? 'error' : 'success'](
            isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos!',
            { id: 'wishlist' }
          );
        }}
      >
        <Heart size={20} fill={isFavorite ? '#f97316' : 'none'} color={isFavorite ? '#f97316' : 'currentColor'} />
      </button>
      <Link to={`/produto/${product.id}`} className="product-link">
        <div className="product-img-wrapper">
          <img src={product.img || null} alt={product.name} />
        </div>
        <div className="product-info">
          <span className="product-brand">{subCatName}</span>
          <h3 className="product-name">{product.name}</h3>
        </div>
      </Link>
      <div className="product-info" style={{ marginTop: 0, paddingTop: 0 }}>
        <div className="product-pricing">
          {oldPrice && oldPrice > price && (
            <span className="old-price">R$ {oldPrice.toFixed(2).replace('.', ',')}</span>
          )}
          <span className="current-price">R$ {price.toFixed(2).replace('.', ',')}</span>
          {maxInst > 1 && (
            <p className="card-installment">
              {maxInst}x de R$ {instVal.toFixed(2).replace('.', ',')} {interest > 0 ? 'com juros' : 'sem juros'}
            </p>
          )}
        </div>
      </div>
      <button className="add-to-cart-btn" onClick={handleCart}>
        <ShoppingCart size={20} /> Adicionar
      </button>
    </motion.div>
  );
};

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const featuredOnly = searchParams.get('featured') === '1';
  const discountOnly = searchParams.get('discount') === '1';
  const initialSort = searchParams.get('sort') || 'relevance';

  const products = useProductStore((s) => s.products);
  const { categories } = useCategoryStore();

  // Filtros
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState(initialSort);

  // Produtos que batem com a query de texto
  const textMatchedProducts = useMemo(() => {
    if (!query.trim()) {
      return products.filter((p) => {
        if (p.status !== 'active') return false;
        if (featuredOnly && !p.isFeatured) return false;
        if (discountOnly && !(Number(p.discount) > 0)) return false;
        return true;
      });
    }
    const searchTerms = normalize(query).split(' ').filter(Boolean);
    return products.filter((p) => {
      if (p.status !== 'active') return false;
      if (featuredOnly && !p.isFeatured) return false;
      if (discountOnly && !(Number(p.discount) > 0)) return false;
      
      const searchableText = [
        normalize(p.name),
        normalize(p.brand),
        normalize(p.category),
        normalize(p.subCategory),
        ...(p.tags || []).map(normalize)
      ].join(' ');

      return searchTerms.every(term => searchableText.includes(term));
    });
  }, [products, query, featuredOnly, discountOnly]);

  // Categorias e subcategorias disponíveis nos resultados
  const availableCategories = useMemo(() => {
    const catIds = [...new Set(textMatchedProducts.map((p) => p.category).filter(Boolean))];
    return categories.filter((c) => catIds.includes(c.id));
  }, [textMatchedProducts, categories]);

  const availableSubCategories = useMemo(() => {
    const activeCats = selectedCategories.length > 0
      ? categories.filter((c) => selectedCategories.includes(c.id))
      : availableCategories;

    // Adiciona uniqueKey para evitar keys duplicadas no render e deduplica por id
    const seen = new Set();
    return activeCats
      .flatMap((c) => (c.subCategories || []).map((s) => ({ ...s, uniqueKey: `${c.id}-${s.id}` })))
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
  }, [availableCategories, categories, selectedCategories]);

  const availableBrands = useMemo(() => {
    const base = selectedCategories.length > 0
      ? textMatchedProducts.filter((p) => selectedCategories.includes(p.category))
      : textMatchedProducts;
    return [...new Set(base.map((p) => p.brand).filter(Boolean))];
  }, [textMatchedProducts, selectedCategories]);

  // Aplicar todos os filtros
  const filteredProducts = useMemo(() => {
    let result = textMatchedProducts;

    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }
    if (selectedSubCategories.length > 0) {
      result = result.filter((p) => selectedSubCategories.includes(p.subCategory));
    }
    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }
    if (priceRange.min) result = result.filter((p) => p.price >= Number(priceRange.min));
    if (priceRange.max) result = result.filter((p) => p.price <= Number(priceRange.max));

    switch (sortBy) {
      case 'price_asc':  return [...result].sort((a, b) => a.price - b.price);
      case 'price_desc': return [...result].sort((a, b) => b.price - a.price);
      case 'discount':   return [...result].sort((a, b) => (b.discount || 0) - (a.discount || 0));
      default:           return result;
    }
  }, [textMatchedProducts, selectedCategories, selectedSubCategories, selectedBrands, priceRange, sortBy]);

  const toggleFilter = (setter, value) =>
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setSelectedBrands([]);
    setPriceRange({ min: '', max: '' });
    setSortBy('relevance');
  };

  const activeFiltersCount =
    selectedCategories.length + selectedSubCategories.length + selectedBrands.length +
    (priceRange.min ? 1 : 0) + (priceRange.max ? 1 : 0);

  return (
    <div className="search-page fade-in">
      <div className="container" style={{ paddingTop: '2rem' }}>

        {/* Resultado header */}
        <div className="search-results-header">
          <div>
            {query ? (
              <p className="search-results-info">
                <strong>{filteredProducts.length}</strong> resultado{filteredProducts.length !== 1 ? 's' : ''} para{' '}
                <strong>"{query}"</strong>
              </p>
            ) : featuredOnly ? (
              <p className="search-results-info">Principais destaques</p>
            ) : discountOnly ? (
              <p className="search-results-info">{'Ofertas imperd\u00edveis'}</p>
            ) : (
              <p className="search-results-info">Todos os produtos</p>
            )}
            {activeFiltersCount > 0 && (
              <button className="search-clear-filters" onClick={clearAll}>
                <X size={14} /> Limpar {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <div className="search-sort">
            <label>Ordenar por:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="relevance">Relevância</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="discount">Maior desconto</option>
            </select>
          </div>
        </div>

        <div className="search-layout">
          {/* Sidebar de filtros */}
          <aside className="filters-sidebar">
            <div className="filters-title">
              <Filter size={18} /> Filtros
              {activeFiltersCount > 0 && (
                <span className="filters-badge">{activeFiltersCount}</span>
              )}
            </div>

            {/* Categorias */}
            {availableCategories.length > 0 && (
              <div className="filter-section">
                <h4>Categorias <ChevronDown size={16} /></h4>
                {availableCategories.map((cat) => (
                  <label key={cat.id} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => {
                        toggleFilter(setSelectedCategories, cat.id);
                        // Limpar subcategorias da categoria desmarcada
                        if (selectedCategories.includes(cat.id)) {
                          const subIds = (cat.subCategories || []).map((s) => s.id);
                          setSelectedSubCategories((prev) => prev.filter((s) => !subIds.includes(s)));
                        }
                      }}
                    />
                    <span>{capitalizeTitle(cat.name)}</span>
                    <span className="filter-count">
                      ({textMatchedProducts.filter((p) => p.category === cat.id).length})
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Subcategorias */}
            {availableSubCategories.length > 0 && (
              <div className="filter-section">
                <h4>Departamentos <ChevronDown size={16} /></h4>
                {availableSubCategories.map((sub) => (
                  <label key={sub.uniqueKey} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedSubCategories.includes(sub.id)}
                      onChange={() => toggleFilter(setSelectedSubCategories, sub.id)}
                    />
                    <span>{capitalizeTitle(sub.name)}</span>
                    <span className="filter-count">
                      ({textMatchedProducts.filter((p) => p.subCategory === sub.id).length})
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Marcas */}
            {availableBrands.length > 0 && (
              <div className="filter-section">
                <h4>Marcas <ChevronDown size={16} /></h4>
                {availableBrands.map((brand) => (
                  <label key={brand} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleFilter(setSelectedBrands, brand)}
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Faixa de preço */}
            <div className="filter-section">
              <h4>Faixa de Preço <ChevronDown size={16} /></h4>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Mín"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange((p) => ({ ...p, min: e.target.value }))}
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))}
                />
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <button className="filter-btn" onClick={clearAll}>
                Limpar Filtros
              </button>
            )}
          </aside>

          {/* Grid de produtos */}
          <main className="search-results">
            {filteredProducts.length === 0 ? (
              <div className="search-empty">
                <Search size={64} color="#cbd5e1" />
                <h3>Nenhum produto encontrado</h3>
                {query && (
                  <p>Tente buscar por outro termo ou{' '}
                    <button onClick={clearAll} className="btn-link-inline">limpe os filtros</button>
                  </p>
                )}
                <Link to="/" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                  Ver todos os produtos
                </Link>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map((product) => (
                  <SearchProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
