import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { useCartStore, useWishlistStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCategoryStore } from '../store/categoryStore';
import { reviewService } from '../services/reviewService';
import { sanitizeHTML } from '../utils/security';
import { 
  ShoppingCart, Heart, Star, ShieldCheck, Truck, 
  Share2, CheckCircle2, ChevronRight, X,
  Zap, CreditCard, MapPin, MessageSquare, Send,
  Minus, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getCoordsFromCep, 
  calculateHaversineDistance, 
  STORE_COORDS 
} from '../utils/distanceUtils';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const products = useProductStore((state) => state.products);
  const addToCart = useCartStore((state) => state.addToCart);
  const { toggleWishlist, wishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { settings } = useSettingsStore();
  const categories = useCategoryStore((state) => state.categories);
  
  const [activeTab, setActiveTab] = useState('description');
  const [activeImage, setActiveImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  // Estados para Avaliações
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0 });
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingResult, setShippingResult] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);

  // Estados para Frete
  const [cep, setCep] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const product = useMemo(() => 
    products.find(p => String(p.id) === String(id)), 
    [products, id]
  );

  // Combina o produto base como a primeira variação se ele tiver peso ou se não houver variações
  const allVariations = useMemo(() => {
    if (!product) return [];
    
    // Se o produto não tem variações, o "base" é a única opção
    // Se tem variações, o "base" deve ser incluído como a primeira opção (user feedback)
    const formatWeight = (w) => {
      if (!w) return 'Padrão';
      const str = String(w).trim();
      return /^[\d.,]+$/.test(str) ? `${str}kg` : str;
    };
    const baseVar = {
      weight: formatWeight(product.weight),
      price: product.price,
      stock: product.stock,
      isBase: true
    };

    if (!product.variations || product.variations.length === 0) {
      return [baseVar];
    }

    // Retorna o base + as variações extras
    return [baseVar, ...product.variations];
  }, [product]);

  React.useEffect(() => {
    const handleScroll = () => {
      const buyBox = document.querySelector('.buy-box');
      if (buyBox) {
        const rect = buyBox.getBoundingClientRect();
        setIsStickyVisible(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset activeImage when product changes
  React.useEffect(() => {
    if (product) {
      setActiveImage(product.img);
      if (allVariations.length > 0) {
        setSelectedVariation(allVariations[0]);
      } else {
        setSelectedVariation(null);
      }
    }
  }, [product, allVariations]);

  // Carregar avaliações
  React.useEffect(() => {
    if (id) {
      loadReviews();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCalculateShipping = async (e) => {
    if (e) e.preventDefault();
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length < 8) {
      toast.error('Informe um CEP válido.');
      return;
    }

    setIsCalculating(true);
    setShippingResult(null);

    try {
      // 1. Buscar Coordenadas via Nominatim (Utils)
      const coords = await getCoordsFromCep(cleanCep);
      
      if (!coords) {
        // Se falhou as coordenadas, tenta buscar o bairro pelo menos para dar um feedback regional
        const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await resp.json();
        
        if (data.erro || !cleanCep.startsWith('94')) {
          setShippingResult({ error: 'Atendimento exclusivo na região de Viamão/RS.' });
          setIsCalculating(false);
          return;
        }

        // Fallback para Viamão se não conseguir coordenadas exatas
        const fee = settings.deliveryFeePerKm > 0 ? (3 * settings.deliveryFeePerKm) : 12;
        setShippingResult({
          neighborhood: data.bairro || 'Viamão',
          fee,
          method: 'Taxa Regional',
          estimate: 'Entrega em até 24h úteis'
        });
        setIsCalculating(false);
        return;
      }

      // 2. Cálculo de Distância Real
      const rawDist = calculateHaversineDistance(STORE_COORDS.lat, STORE_COORDS.lng, coords.lat, coords.lon);
      const finalDist = rawDist * 1.25; // Compensação de curvas (25% de margem)
      const fee = Math.max(0, finalDist * (settings.deliveryFeePerKm || 2));

      // 3. Buscar Bairro para exibir no resultado
      const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await resp.json();

      setShippingResult({
        neighborhood: data.bairro || 'Viamão',
        fee,
        method: `${finalDist.toFixed(1)}km`,
        estimate: 'Entrega em até 24h úteis'
      });

    } catch (err) {
      console.error(err);
      toast.error('Erro ao calcular frete.');
    } finally {
      setIsCalculating(false);
    }
  };

  async function loadReviews() {
    setIsLoadingReviews(true);
    try {
      const data = await reviewService.getReviewsByProduct(id);
      setReviews(data);
      
      const stats = await reviewService.getAverageRating(id);
      setRatingStats(stats);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar logado para avaliar.');
      return;
    }

    if (!newReview.comment.trim()) {
      toast.error('Por favor, escreva um comentário.');
      return;
    }

    setIsSubmitting(true);
    const reviewData = {
      product_id: id,
      user_id: user.id || user.email, // Fallback se não tiver id
      user_name: user.name || 'Usuário',
      rating: newReview.rating,
      comment: newReview.comment
    };

    const result = await reviewService.submitReview(reviewData);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Avaliação enviada com sucesso!');
      setNewReview({ rating: 5, comment: '' });
      loadReviews(); // Recarregar
    } else {
      toast.error('Erro ao enviar avaliação: ' + result.error);
    }
  };

  const isFavorite = useMemo(() => 
    product ? wishlist.some(item => item.id === product.id) : false,
    [wishlist, product]
  );

  const pricing = useMemo(() => {
    if (!product) return { price: 0, oldPrice: null, discountAmount: 0, discountPercent: 0 };
    const p = Number(product.price) || 0;
    const op = product.oldPrice ? Number(product.oldPrice) : null;
    const damount = (op && op > p) ? op - p : 0;
    const dpercent = (op && op > p) ? Math.round((damount / op) * 100) : 0;
    return { price: p, oldPrice: op, discountAmount: damount, discountPercent: dpercent };
  }, [product]);

  const sanitizedDescription = useMemo(() => {
    if (!product) return '';
    const desc = (product.description || '')
      .replace(/🛡️.*?Garantia[\s\S]*?(?=Sobre a|$)/i, '')
      .replace(/<[^>]*>🛡[^<]*Garantia[\s\S]*?<\/[^>]+>/gi, '')
      .trim();
    return sanitizeHTML(desc);
  }, [product]);
  
  const subCatName = useMemo(() => {
    if (!product) return 'Geral';
    const category = categories.find(c => c.id === product.category);
    const sub = category?.subCategories?.find(s => s.id === product.subCategory);
    return sub?.name || product.brand || 'Geral';
  }, [categories, product]);

  const handleWishlist = () => {
    if (!product) return;
    toggleWishlist(product);
    if (isFavorite) {
      toast.error('Removido dos favoritos', { id: 'wishlist' });
    } else {
      toast.success('Adicionado aos favoritos!', { id: 'wishlist' });
    }
  };

  const handleCart = () => {
    const productWithQuantity = { ...product, quantity, selectedVariation };
    addToCart(productWithQuantity);
    
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

  const handleShare = async () => {
    if (!product) return;
    const shareData = {
      title: product.name,
      text: `Confira este produto na Agropets: ${product.name}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copiado para a área de transferência!', { icon: '🔗' });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Erro ao compartilhar.');
      }
    }
  };

  // Se o produto não existe ou não está ativo, mostra erro amigável
  // Movido para depois de todos os hooks para evitar quebra de regras do React
  if (!product || (product.status && product.status !== 'active')) {
    return (
      <div className="container" style={{ padding: '8rem 1rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Produto Indisponível</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Este item não está mais disponível ou foi movido. Explore nossas outras ofertas!</p>
        <button className="btn-primary-custom" onClick={() => navigate('/')}>
          Voltar para Início
        </button>
      </div>
    );
  }

  const { price, discountPercent } = pricing;

  return (
    <div className="product-page-wrapper fade-in">
      <div className="breadcrumb-nav">
        <div className="container">
          <Link to="/">Home</Link> <ChevronRight size={14} /> 
          <Link to={`/categoria/${product.category}`}>{String(product.category).toUpperCase()}</Link> <ChevronRight size={14} />
          <span>{product.name}</span>
        </div>
      </div>

      <div className="container main-content-grid">
        {/* LADO ESQUERDO: GALERIA */}
        <div className="gallery-section">
          <div className="main-image-card">
            {discountPercent > 0 && <span className="discount-tag">-{discountPercent}%</span>}
            <button 
              className={`favorite-action ${isFavorite ? 'active' : ''}`}
              onClick={handleWishlist}
            >
              <Heart size={24} fill={isFavorite ? "#f97316" : "none"} strokeWidth={2} />
            </button>
            <img 
              src={activeImage || product.img || null} 
              alt={product.name} 
              onClick={() => setIsLightboxOpen(true)}
              style={{ cursor: 'zoom-in' }}
            />
          </div>
          
          {(product.images && product.images.length > 1) ? (
            <div className="thumbnails-grid">
              {product.images.slice(0, 6).map((image, idx) => (
                <div 
                  key={idx} 
                  className={`thumb ${(activeImage ? image === activeImage : image === product.img) ? 'active' : ''}`}
                  onClick={() => setActiveImage(image)}
                >
                  {image ? <img src={image} alt="" /> : null}
                </div>
              ))}
            </div>
          ) : (
            product.img ? (
              <div className="thumbnails-grid">
                <div className="thumb active"><img src={product.img} alt="" /></div>
              </div>
            ) : null
          )}
        </div>

        {/* CENTRO: INFO PRINCIPAL */}
        <div className="info-section">
          <div className="info-header">
            <span className="brand-badge">{subCatName}</span>
            <div className="actions-header">
              <button onClick={handleShare} aria-label="Compartilhar"><Share2 size={20} /></button>
            </div>
          </div>
          
          <h1 className="product-title">{product.name}</h1>
          <div className="product-meta">
            <div className="rating-review">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.floor(ratingStats.count > 0 ? ratingStats.average : 5) ? "#ffc107" : "none"} color="#ffc107" />
                ))}
              </div>
              <span className="count">({ratingStats.count || 0} avaliações)</span>
            </div>
            <span className="sku">SKU: {product.sku || (typeof product.id === 'number' ? 1000 + (product.id % 10000) : String(product.id).slice(0, 8).toUpperCase())}</span>
          </div>

          <div className="quick-benefits">
            <div className="benefit"><CheckCircle2 size={16} /> Indicado para {product.category}</div>
            <div className="benefit"><CheckCircle2 size={16} /> Alta durabilidade e resistência</div>
            <div className="benefit"><CheckCircle2 size={16} /> Produto recomendado por especialistas</div>
          </div>

          <div className="main-description-preview">
            <p>Proporcione o melhor para o seu pet com o <strong>{product.name}</strong>. 
            Desenvolvido com foco na saúde e bem-estar, este produto da <strong>{product.brand || 'Agropets'} </strong> 
             é a escolha ideal para quem não abre mão de qualidade.</p>
          </div>
        </div>

        {/* LADO DIREITO: BUY BOX (STICKY) */}
        <div className="buy-box">
          {allVariations.length > 1 && (
            <div className="product-variations-selector" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Selecione o Peso:
              </label>
              <div className="variation-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {allVariations.map((v, idx) => (
                  <button 
                    key={idx}
                    className={`variation-chip ${selectedVariation?.weight === v.weight ? 'active' : ''}`}
                    onClick={() => setSelectedVariation(v)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: selectedVariation?.weight === v.weight ? 'var(--brand-p)' : '#e2e8f0',
                      background: selectedVariation?.weight === v.weight ? 'var(--brand-p-soft)' : 'white',
                      color: selectedVariation?.weight === v.weight ? 'var(--brand-p)' : '#64748b',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.9rem'
                    }}
                  >
                    {v.weight}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="price-container">
            {(() => {
              const price = selectedVariation ? parseFloat(selectedVariation.price) : product.price;
              const oldPrice = selectedVariation?.isBase ? product.oldPrice : null;
              return (
                <>
                  {oldPrice && oldPrice > price && <span className="old-price">R$ {oldPrice.toFixed(2).replace('.', ',')}</span>}
                  <div className="current-price-row">
                    <span className="currency">R$</span>
                    <span className="value">{price.toFixed(2).split('.')[0]}</span>
                    <span className="cents">,{price.toFixed(2).split('.')[1]}</span>
                  </div>
                  <div className="installments">
                    {(() => {
                      const maxInst = product.maxInstallments && product.maxInstallments > 0 ? product.maxInstallments : (settings.maxInstallments || 1);
                      const interest = settings.installmentInterest || 0;
                      const totalWithInterest = price * (1 + interest / 100);
                      const instVal = totalWithInterest / maxInst;
                      return (
                        <p><CreditCard size={14} /> <strong>{maxInst}x de R$ {instVal.toFixed(2).replace('.', ',')}</strong> {interest > 0 ? 'com juros' : 'sem juros'}</p>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="shipping-calculator">
            <div className="calc-header">
              <Truck size={20} />
              <span>Calcular frete e prazo</span>
            </div>
            <form className="calc-input" onSubmit={handleCalculateShipping}>
              <input 
                type="text" 
                placeholder="00000-000" 
                value={cep} 
                onChange={(e) => setCep(e.target.value)} 
                maxLength={9}
              />
              <button type="submit" disabled={isCalculating}>
                {isCalculating ? 'Calculando...' : 'Calcular'}
              </button>
            </form>

            {shippingResult && (
              <div className="shipping-result fade-in">
                {shippingResult.error ? (
                  <p className="shipping-error">{shippingResult.error}</p>
                ) : (
                  <div className="shipping-info-success">
                    <p className="shipping-neighborhood">Entrega para: <strong>{shippingResult.neighborhood}</strong></p>
                    <div className="shipping-details">
                      <span className="shipping-price">
                        {shippingResult.fee > 0 
                          ? `Frete: R$ ${shippingResult.fee.toFixed(2).replace('.', ',')}` 
                          : 'Frete: GRÁTIS'}
                      </span>
                      <span className="shipping-deadline">{shippingResult.estimate}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {(() => {
            const stock = selectedVariation ? parseInt(selectedVariation.stock) : (product.stock || 0);
            if (stock <= 0) return (
              <div className="out-of-stock-notice" style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <X size={20} />
                <span>Peso indisponível no momento</span>
              </div>
            );
            return (
              <div className="purchase-actions">
                <div className="qty-selector">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(stock, quantity + 1))}><Plus size={18} /></button>
                </div>
                <button className="btn-buy-now" onClick={() => { addToCart({ ...product, quantity, selectedVariation }); navigate('/checkout'); }}>Comprar agora</button>
                <button className="btn-add-cart" onClick={handleCart}>
                  <ShoppingCart size={20} /> Adicionar ao carrinho
                </button>
              </div>
            );
          })()}

          <div className="trust-footer">
            <div className="trust-item"><ShieldCheck size={18} /> Compra 100% Segura</div>
            <div className="trust-item"><MapPin size={18} /> Retirada Grátis em Loja</div>
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: TABS / DETALHES */}
      <div className="details-tabs-section">
        <div className="container">
          <div className="tabs-header">
            <button className={activeTab === 'description' ? 'active' : ''} onClick={() => setActiveTab('description')}>Descrição</button>
            <button className={activeTab === 'specs' ? 'active' : ''} onClick={() => setActiveTab('specs')}>Especificações</button>
            <button className={activeTab === 'brand' ? 'active' : ''} onClick={() => setActiveTab('brand')}>Sobre a Marca</button>
            <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>Avaliações ({ratingStats.count})</button>
          </div>

          <div className="tab-content">
            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div 
                  key="description"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="tab-panel"
                >
                  <div className="dna-title">O que o seu pet merece 🐾</div>
                  {sanitizedDescription ? (
                    <div className="description-html" dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
                  ) : (
                    <div className="description-placeholder">
                      <p>O <strong>{product.name}</strong> é sinônimo de excelência no cuidado animal. 
                      Cada detalhe deste produto foi pensado pela <strong>{product.brand || 'Agropets'}</strong> para atender às 
                      necessidades específicas do seu pet na categoria de <strong>{product.category}</strong>.</p>
                      
                      <h3>Benefícios do Produto:</h3>
                      <ul>
                        <li>Fórmula exclusiva e testada</li>
                        <li>Equilíbrio perfeito entre nutrição e sabor</li>
                        <li>Embalagem prática que mantém o frescor</li>
                        <li>Alta aceitação por todas as raças</li>
                      </ul>
                      
                      <h3>Modo de Uso:</h3>
                      <p>Siga as instruções da embalagem ou consulte seu médico veterinário para garantir 
                      a melhor experiência para seu companheiro.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'specs' && (
                <motion.div 
                  key="specs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="tab-panel"
                >
                  <table className="specs-table">
                    <tbody>
                      <tr><td>Pet</td><td>{product.category === 'cachorros' ? 'Cães' : product.category === 'gatos' ? 'Gatos' : 'Diversos'}</td></tr>
                      <tr><td>Marca</td><td>{product.brand || 'Agropets'}</td></tr>
                      <tr><td>Indicação</td><td>{product.category}</td></tr>
                      {product.weight && <tr><td>Peso/Volume</td><td>{product.weight}</td></tr>}
                      <tr><td>Composição Base</td><td>{product.composition || 'Ingredientes selecionados e minerais essenciais'}</td></tr>
                      {product.vitamins && <tr><td>Vitaminas/Suplementos</td><td>{product.vitamins}</td></tr>}

                      <tr><td>Apresentação</td><td>Lote Agropets 2024 / {product.id}</td></tr>

                    </tbody>
                  </table>
                </motion.div>
              )}

              {activeTab === 'brand' && (
                <motion.div 
                  key="brand"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="tab-panel brand-panel"
                >
                  <div className="brand-info-dna">
                    <div className="brand-logo-mock">{(product.brand || 'A').charAt(0)}</div>
                    <div>
                      <h3>{product.brand || 'Agropets'}</h3>
                      <p>Referência nacional em produtos para pets. A {product.brand || 'Agropets'} foca em inovação 
                      constante para que a relação entre você e seu pet seja cada vez mais especial.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div 
                  key="reviews"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="tab-panel"
                >
                  <div className="reviews-container">
                    <div className="reviews-summary-card">
                      <div className="rating-big">
                        <span className="avg">{(ratingStats.count > 0 ? ratingStats.average : 5).toFixed(1)}</span>
                        <div className="stars-row">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={20} fill={i < Math.floor(ratingStats.count > 0 ? ratingStats.average : 5) ? "#ffc107" : "none"} color="#ffc107" />
                          ))}
                        </div>
                        <span className="total-text">{ratingStats.count} avaliações de clientes</span>
                      </div>
                      
                      {user ? (
                        <div className="add-review-form">
                          <h3>Deixe sua avaliação</h3>
                          <form onSubmit={handleSubmitReview}>
                            <div className="star-input">
                              <span>Sua nota:</span>
                              <div className="stars-selectable">
                                {[1, 2, 3, 4, 5].map((num) => (
                                  <button 
                                    key={num} 
                                    type="button" 
                                    onClick={() => setNewReview({ ...newReview, rating: num })}
                                  >
                                    <Star 
                                      size={24} 
                                      fill={num <= newReview.rating ? "#ffc107" : "none"} 
                                      color="#ffc107" 
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="comment-input">
                              <textarea 
                                placeholder="Conte sua experiência com este produto..."
                                value={newReview.comment}
                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                required
                              />
                            </div>
                            <button type="submit" className="btn-submit-review" disabled={isSubmitting}>
                              {isSubmitting ? 'Enviando...' : (
                                <>Enviar Avaliação <Send size={16} /></>
                              )}
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="login-to-review">
                          <MessageSquare size={32} />
                          <p>Faça login para avaliar este produto e ajudar outros clientes.</p>
                          <button onClick={() => navigate('/login')}>Fazer Login</button>
                        </div>
                      )}
                    </div>

                    <div className="reviews-list">
                      {isLoadingReviews ? (
                        <div className="loading-placeholder">Carregando avaliações...</div>
                      ) : reviews.length > 0 ? (
                        reviews.map((review) => (
                          <div key={review.id} className="review-card">
                            <div className="review-header">
                              <div className="user-info">
                                <div className="user-avatar">{review.user_name.charAt(0).toUpperCase()}</div>
                                <div className="user-details">
                                  <span className="user-name">{review.user_name}</span>
                                  <span className="review-date">
                                    {new Date(review.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                              <div className="review-stars">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={14} fill={i < review.rating ? "#ffc107" : "none"} color="#ffc107" />
                                ))}
                              </div>
                            </div>
                            <div className="review-body">
                              <p>{review.comment}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-reviews">
                          <p>Este produto ainda não possui avaliações. Seja o primeiro a avaliar!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* STICKY BUY MOBILE */}
      <div className={`sticky-purchase-mobile ${isStickyVisible ? 'visible' : ''}`}>
        <div className="sticky-p-info">
          {product.img ? <img src={product.img} alt="" /> : null}
          <div className="sticky-p-texts">
            <span className="sticky-p-name">{product.name}</span>
            <span className="sticky-p-price">R$ {price.toFixed(2)}</span>
          </div>
        </div>
        <button className="btn-sticky-buy" onClick={handleCart}>
          <ShoppingCart size={20} /> Adicionar
        </button>
      </div>

      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div 
            className="image-lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLightboxOpen(false)}
          >
            <motion.div 
              className="lightbox-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                className="btn-lightbox-close" 
                onClick={() => setIsLightboxOpen(false)}
              >
                <X size={24} />
              </button>
              {(activeImage || product.img) ? (
                <img src={activeImage || product.img} alt={product.name} className="lightbox-image" />
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetail;
