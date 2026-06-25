import React, { useState } from 'react';
import { 
  Rocket, Plus, Target, Calendar, Edit, Trash2, Zap, Upload, X, Search, ChevronLeft, ChevronRight, GripVertical, Save 
} from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { useCouponStore } from '../../store/couponStore';
import { useBannerStore } from '../../store/bannerStore';
import { useCustomerStore } from '../../store/customerStore';
import { emailService } from '../../services/emailService';
import toast from 'react-hot-toast';

const MarketingManager = ({ openModal }) => {
  const { coupons, deleteCoupon, toggleCouponStatus } = useCouponStore();
  const { banners, deleteBanner, toggleBannerStatus, moveBanner, reorderBanners } = useBannerStore();
  const { customers } = useCustomerStore();

  const [localBanners, setLocalBanners] = React.useState([]);
  const [hasOrderChanges, setHasOrderChanges] = React.useState(false);
  const [isSavingOrder, setIsSavingOrder] = React.useState(false);

  React.useEffect(() => {
    setLocalBanners(banners);
  }, [banners]);

  const handleReorder = (newOrder) => {
    setLocalBanners(newOrder);
    setHasOrderChanges(true);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      await reorderBanners(localBanners);
      setHasOrderChanges(false);
      toast.success('Ordem dos banners salva com sucesso!');
    } catch {
      toast.error('Erro ao salvar a ordem.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const [promoEmailForm, setPromoEmailForm] = useState({ subject: '', content: '', images: [] });
  const [selectedPromoRecipients, setSelectedPromoRecipients] = useState([]);
  const [isSendingPromo, setIsSendingPromo] = useState(false);
  const [promoSearch, setPromoSearch] = useState('');

  const handleSendPromoEmail = async () => {
    const recipients = customers.filter(c => selectedPromoRecipients.includes(c.id) && c.email);
    if (recipients.length === 0) return toast.error('Selecione destinatários.');
    
    setIsSendingPromo(true);
    let successCount = 0;
    try {
      for (const customer of recipients) {
        const ok = await emailService.sendPromotionalEmail(
          customer, 
          promoEmailForm.subject, 
          promoEmailForm.content, 
          promoEmailForm.images
        );
        if (ok) successCount++;
      }
      toast.success(`${successCount} e-mails enviados com sucesso!`);
      setPromoEmailForm({ subject: '', content: '', images: [] });
      setSelectedPromoRecipients([]);
    } catch {
      toast.error('Ocorreu um erro ao enviar a campanha.');
    } finally {
      setIsSendingPromo(false);
    }
  };

  const handleImageUpload = (e, type) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'promo') {
          setPromoEmailForm(prev => ({ ...prev, images: [...prev.images, reader.result] }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="admin-dashboard-content fade-in marketing-premium-container">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            <Rocket size={14} /> Engajamento & Vendas
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Marketing</h1>
          <p>Crie promoções e cupons para atrair mais clientes.</p>
        </div>
        <button className="btn-primary-modern" onClick={() => openModal('coupon')} style={{ background: '#7c3aed', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
          <Plus size={18} /> Novo Cupom
        </button>
      </div>

      <div className="coupon-grid">
        {coupons.map(coupon => (
          <div key={coupon.id} className={`premium-card ${!coupon.active ? 'inactive' : ''}`} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="coupon-code">{coupon.code}</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, margin: '12px 0 4px', color: 'var(--text-h)' }}>
                  {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `R$ ${(coupon.value || 0).toFixed(2)} OFF`}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-p)' }}>
                   <Calendar size={12} /> Expira em: {coupon.expiry ? new Date(coupon.expiry).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={coupon.active} onChange={() => toggleCouponStatus(coupon.id)} />
                <span className="slider"></span>
              </label>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-p)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={14} /> {coupon.usageCount || 0} usos{coupon.maxUses ? `/${coupon.maxUses}` : ''}</span>
              </div>
              <div className="action-buttons-modern">
                <button className="btn-action-outline" onClick={() => openModal('coupon', coupon)}><Edit size={14} /></button>
                <button className="btn-action-outline delete" onClick={() => deleteCoupon(coupon.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-divider"></div>

      <div className="dashboard-intro">
        <div className="intro-text">
          <h1 className="marketing-header-main">E-mail Marketing</h1>
          <p>Campanhas personalizadas para sua base de clientes.</p>
        </div>
      </div>

      <div className="marketing-email-section">
        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Destinatários</h4>
              <span style={{ background: 'var(--brand-p-soft)', color: 'var(--brand-p)', padding: '2px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800 }}>
                {selectedPromoRecipients.length} selecionados
              </span>
           </div>
           
           <div className="search-box" style={{ marginBottom: '1rem', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input 
                type="text" 
                placeholder="Buscar cliente" 
                value={promoSearch} 
                onChange={e => setPromoSearch(e.target.value)}
                className="marketing-input-premium with-icon"
                style={{ height: '44px', width: '100%', paddingLeft: '40px' }}
              />
           </div>

           <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              <button 
                className="btn-refresh-modern" 
                style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}
                onClick={() => setSelectedPromoRecipients(customers.filter(c => c.email).map(c => c.id))}
              >Selecionar Todos</button>
              <button 
                className="btn-refresh-modern" 
                style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}
                onClick={() => setSelectedPromoRecipients([])}
              >Limpar</button>
           </div>

           <div className="customers-list-scroll" style={{ flex: 1, maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
              {customers
                .filter(c => c.email && (c.name.toLowerCase().includes(promoSearch.toLowerCase()) || c.email.toLowerCase().includes(promoSearch.toLowerCase())))
                .map(customer => (
                  <div 
                    key={customer.id} 
                    className={`recipient-item-modern ${selectedPromoRecipients.includes(customer.id) ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedPromoRecipients.includes(customer.id)) {
                        setSelectedPromoRecipients(selectedPromoRecipients.filter(id => id !== customer.id));
                      } else {
                        setSelectedPromoRecipients([...selectedPromoRecipients, customer.id]);
                      }
                    }}
                    style={{ padding: '8px', cursor: 'pointer', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px', background: selectedPromoRecipients.includes(customer.id) ? 'var(--brand-p-soft)' : 'transparent' }}
                  >
                     <input 
                       type="checkbox" 
                       checked={selectedPromoRecipients.includes(customer.id)}
                       readOnly
                     />
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{customer.name}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{customer.email}</span>
                     </div>
                  </div>
                ))
              }
           </div>
        </div>

        <div className="marketing-grid-two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <div className="form-group">
              <label>Assunto do E-mail</label>
              <input 
                type="text" 
                placeholder="Ex: Ofertas da Semana na Agropets!" 
                value={promoEmailForm.subject}
                onChange={e => setPromoEmailForm({...promoEmailForm, subject: e.target.value})}
                className="marketing-input-premium"
                style={{ width: '100%', marginBottom: '1rem' }}
              />
            </div>
            
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Conteúdo da Mensagem</label>
              <textarea 
                placeholder="Escreva sua mensagem aqui..." 
                value={promoEmailForm.content}
                onChange={e => setPromoEmailForm({...promoEmailForm, content: e.target.value})}
                className="marketing-input-premium"
                style={{ height: '180px', resize: 'none', width: '100%', marginBottom: '1rem' }}
              />
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                Fotos do E-mail
                <button 
                  className="btn-secondary-modern" 
                  style={{ padding: '4px 12px', fontSize: '0.75rem', height: 'auto' }}
                  onClick={() => document.getElementById('promo-img-upload').click()}
                >
                  <Upload size={14} /> Anexar Fotos
                </button>
              </label>
              <input 
                id="promo-img-upload" 
                type="file" 
                hidden 
                accept="image/*" 
                multiple
                onChange={(e) => handleImageUpload(e, 'promo')} 
              />
              
              <div className="attachment-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                 {promoEmailForm.images.map((img, idx) => (
                    <div key={idx} className="image-attachment-chip" style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden' }}>
                       <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       <button 
                         className="btn-remove-attachment"
                         onClick={(e) => {
                           e.stopPropagation();
                           setPromoEmailForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
                         }}
                         style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px' }}
                       >
                         <X size={12} />
                       </button>
                    </div>
                 ))}
              </div>
            </div>

            <button 
              className="btn-primary-modern" 
              style={{ width: '100%', marginTop: '2rem', height: '56px', fontSize: '1rem', borderRadius: '16px', justifyContent: 'center' }}
              onClick={handleSendPromoEmail}
              disabled={isSendingPromo || selectedPromoRecipients.length === 0}
            >
              {isSendingPromo ? 'Enviando Campanha...' : 'Disparar Campanha Agora'} <Zap size={18} />
            </button>
          </div>

          <div className="email-preview-modern">
             <div className="preview-window-frame" style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: 'white' }}>
                <div className="preview-window-header" style={{ padding: '10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <div className="dot-group" style={{ display: 'flex', gap: '5px' }}>
                      <div className="dot red" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                      <div className="dot yellow" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div>
                      <div className="dot green" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                   </div>
                   <span style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>Nova Campanha</span>
                   <div style={{ width: '40px' }}></div>
                </div>
                <div className="preview-window-body" style={{ padding: '20px' }}>
                   <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                      <h2 style={{ color: '#15803d', fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Agropets</h2>
                      <div style={{ width: '40px', height: '3px', background: '#15803d', margin: '10px auto', borderRadius: '100px' }}></div>
                   </div>
                   
                   <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '15px', color: '#1e293b' }}>
                     {promoEmailForm.subject || 'Assunto do E-mail'}
                   </h3>
                   
                   <p style={{ fontSize: '0.95rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.7', marginBottom: '25px' }}>
                     {promoEmailForm.content || 'O conteúdo da sua mensagem aparecerá aqui para você conferir antes de enviar aos seus clientes.'}
                   </p>

                   {promoEmailForm.images.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: promoEmailForm.images.length > 1 ? '1fr 1fr' : '1fr', gap: '12px' }}>
                         {promoEmailForm.images.map((img, idx) => (
                            <img key={idx} src={img} style={{ width: '100%', borderRadius: '12px', border: '1px solid #f1f5f9' }} />
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="section-divider"></div>

      <div className="dashboard-intro">
        <div className="intro-text">
          <h1 className="marketing-header-main">Banners Rotativos</h1>
          <p>Destaque ofertas na página principal.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {hasOrderChanges && (
            <button 
              className="btn-primary-modern" 
              onClick={handleSaveOrder} 
              disabled={isSavingOrder}
              style={{ background: 'var(--brand-p)', boxShadow: '0 4px 12px rgba(21, 128, 61, 0.2)' }}
            >
              <Save size={18} /> {isSavingOrder ? 'Salvando...' : 'Salvar Nova Ordem'}
            </button>
          )}
          <button className="btn-primary-modern" onClick={() => openModal('banner')}>
            <Plus size={18} /> Adicionar Banner
          </button>
        </div>
      </div>

      <Reorder.Group 
        axis="x" 
        values={localBanners} 
        onReorder={handleReorder} 
        className="coupon-grid"
        style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '1rem 0' }}
      >
        {localBanners.map(banner => (
          <Reorder.Item 
            key={banner.id} 
            value={banner}
            className={`premium-card ${banner.status !== 'active' ? 'inactive' : ''}`} 
            style={{ padding: '1rem', minWidth: '300px', cursor: 'grab' }}
            whileDrag={{ scale: 1.05, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
          >
            <div className="banner-preview-box" style={{ borderRadius: '16px', position: 'relative', overflow: 'hidden', height: '120px' }}>
              <img src={banner.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.8)', padding: '4px', borderRadius: '4px', cursor: 'grab' }}>
                   <GripVertical size={16} color="#64748b" />
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={banner.status === 'active'} onChange={() => toggleBannerStatus(banner.id)} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            <div style={{ padding: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span className="p-sku">POSIÇÃO {banner.position}</span>
                  <div className="action-buttons-modern" style={{ display: 'flex', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button className="btn-action-outline" onClick={() => moveBanner(banner.id, 'up')} title="Mover para esquerda"><ChevronLeft size={14} /></button>
                      <button className="btn-action-outline" onClick={() => moveBanner(banner.id, 'down')} title="Mover para direita"><ChevronRight size={14} /></button>
                    </div>
                    <button className="btn-action-outline" onClick={() => openModal('banner', banner)}><Edit size={14} /></button>
                    <button className="btn-action-outline delete" onClick={() => deleteBanner(banner.id)}><Trash2 size={14} /></button>
                  </div>
              </div>
              <h4 style={{ margin: '8px 0 4px', fontSize: '1rem', fontWeight: 800 }}>{banner.title}</h4>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};

export default MarketingManager;
