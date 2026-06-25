import React, { useMemo } from 'react';
import { ShoppingCart, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartStore, useSearchStore, useWishlistStore } from '../store/cartStore';
import { useProductStore } from '../store/productStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCategoryStore } from '../store/categoryStore';
import { CATEGORY_MAPPING } from '../config/categories';
import './ProductList.css';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addToCart);
  const { toggleWishlist, wishlist } = useWishlistStore();
  const { settings } = useSettingsStore();
  const { categories } = useCategoryStore();

  const isFavorite = wishlist.some((item) => item.id === product.id);
  const priceNum = Number(product.price) || 0;

  const subCatName = useMemo(() => {
    const category = categories.find((c) => c.id === product.category);
    const sub = category?.subCategories?.find((s) => s.id === product.subCategory);
    return sub?.name || product.brand || 'Geral';
  }, [categories, product.category, product.subCategory, product.brand]);

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
            fontSize: '12px',
          }}
        >
          Finalizar Pedido
        </button>
      </div>
    ), { duration: 4000 });
  };

  if (!product) return null;

  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {product.discount > 0 && (
        <div className="discount-badge">-{product.discount}%</div>
      )}
      <button
        className={`wishlist-btn ${isFavorite ? 'active' : ''}`}
        aria-label="Add to wishlist"
        onClick={handleWishlist}
      >
        <Heart size={20} fill={isFavorite ? '#f97316' : 'none'} color={isFavorite ? '#f97316' : 'currentColor'} />
      </button>

      <Link to={`/produto/${product.id}`} className="product-link">
        <div className="product-img-wrapper">
          <img src={product.img || null} alt={product.name} />
          {product.variations && product.variations.length > 0 && (
            <div className="variation-badge-modern">
              Peso Sugerido: {product.weight}
            </div>
          )}
        </div>

        <div className="product-info">
          <span className="product-brand">{subCatName}</span>
          <h3 className="product-name">{product.name}</h3>
        </div>
      </Link>

      <div className="product-info" style={{ marginTop: 0, paddingTop: 0 }}>
        <div className="product-rating">
          <span className="stars">{'\u2605'.repeat(Math.round(Number(product.reviews) > 0 ? Number(product.rating) : 5))}</span>
          <span className="reviews">({product.reviews || 0})</span>
        </div>

        <div className="product-pricing">
          {product.oldPrice && (
            <span className="old-price">R$ {Number(product.oldPrice).toFixed(2).replace('.', ',')}</span>
          )}
          <span className="current-price">R$ {priceNum.toFixed(2).replace('.', ',')}</span>
          {(() => {
            const maxInst = product.maxInstallments && product.maxInstallments > 0 ? product.maxInstallments : (settings.maxInstallments || 1);
            const interest = settings.installmentInterest || 0;
            const totalWithInterest = priceNum * (1 + interest / 100);
            const instVal = totalWithInterest / maxInst;
            return (
              <div className="card-extra-pricing">
                {maxInst > 1 && (
                  <p className="card-installment">
                    {maxInst}x de R$ {instVal.toFixed(2).replace('.', ',')} {interest > 0 ? 'com juros' : 'sem juros'}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <button
        className="add-to-cart-btn"
        onClick={handleCart}
      >
        <ShoppingCart size={20} /> Adicionar
      </button>
    </motion.div>
  );
};

const ProductList = ({ title, limit, filterCategory, filterFeatured, viewAllTo }) => {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const products = useProductStore((state) => state.products);

  const normalize = useMemo(() => (str) =>
    str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '',
  []);

  const filteredProducts = useMemo(() => {
    let result = (Array.isArray(products) ? products : []).filter((p) => p.status === 'active');

    if (filterFeatured) {
      result = result.filter((p) => p.isFeatured);
    }

    if (searchQuery) {
      const searchTerms = normalize(searchQuery).split(' ').filter(Boolean);
      result = result.filter((p) => {
        const searchableText = [
          normalize(p.name),
          normalize(p.brand),
          normalize(p.category),
          normalize(p.subCategory),
          ...(p.tags || []).map(normalize)
        ].join(' ');
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    if (filterCategory) {
      const targetCategory = CATEGORY_MAPPING[filterCategory] || filterCategory;
      result = result.filter((p) => p.category === targetCategory);
    }

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }, [products, searchQuery, filterFeatured, filterCategory, limit, normalize]);

  if (filteredProducts.length === 0) {
    if (!searchQuery) return null;

    return (
      <div className="home-section container no-results">
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #666)' }}>
          Nenhum produto encontrado para "{searchQuery}"
        </p>
      </div>
    );
  }

  return (
    <div className="home-section container">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="section-title">{title}</h2>
        <Link to={viewAllTo || '/busca'} className="view-all">{'Ver todos \u00bb'}</Link>
      </div>

      <div className="products-grid">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ProductList;
