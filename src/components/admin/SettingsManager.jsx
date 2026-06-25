import React, { useState } from 'react';
import { 
  Save, Upload, MapPin, CreditCard, List, ShoppingBag, Zap, ShieldCheck, Edit 
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import toast from 'react-hot-toast';

const SettingsManager = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [formSettings, setFormSettings] = useState(settings);

  const handleSaveSettings = async () => {
    try {
      await updateSettings(formSettings);
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar as configurações.');
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limitar tamanho a 200KB para evitar base64 gigante no banco
    if (file.size > 200 * 1024) {
      toast.error('Imagem muito grande. Use uma imagem menor que 200KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'logo') {
        setFormSettings(prev => ({ ...prev, logo: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <h1>Configurações do Sistema</h1>
          <p>Personalize sua loja e gerencie parâmetros globais.</p>
        </div>
      </div>

      <div className="bento-grid">
        <div className="bento-item" style={{ gridColumn: 'span 8' }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800 }}>Identidade & Visual</h3>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Nome da Loja</label>
              <input type="text" value={formSettings.storeName} onChange={(e) => setFormSettings({ ...formSettings, storeName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>WhatsApp de Atendimento</label>
              <input type="text" value={formSettings.whatsapp} onChange={(e) => setFormSettings({ ...formSettings, whatsapp: e.target.value })} />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Chave Pix (Para Cópia no Checkout)</label>
            <input 
              type="text" 
              placeholder="E-mail, CPF, Celular ou Chave Aleatória"
              value={formSettings.pixKey} 
              onChange={(e) => setFormSettings({ ...formSettings, pixKey: e.target.value })} 
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Endereço Físico</label>
            <input type="text" value={formSettings.address} onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })} />
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Texto do Rodapé (SEO)</label>
            <input type="text" value={formSettings.footerText} onChange={(e) => setFormSettings({ ...formSettings, footerText: e.target.value })} />
          </div>

          <div className="form-row" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
            <div className="form-group">
              <label>Logo da Marca</label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white' }}>
                  <img src={formSettings.logo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <label className="btn-action-outline edit" style={{ cursor: 'pointer', height: 'auto', padding: '8px 12px', width: 'auto', fontSize: '0.75rem', gap: '5px', display: 'flex', alignItems: 'center' }}>
                  <Upload size={14} /> Alterar Logo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'logo')} />
                </label>
              </div>
            </div>
            <div className="form-group">
               <label>Cor Principal</label>
               <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <input type="color" value={formSettings.primaryColor || '#15803d'} onChange={(e) => setFormSettings({ ...formSettings, primaryColor: e.target.value })} style={{ width: '45px', height: '45px', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', padding: '2px' }} />
                 <input type="text" value={(formSettings.primaryColor || '#15803d').toUpperCase()} onChange={(e) => setFormSettings({ ...formSettings, primaryColor: e.target.value })} style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700 }} />
               </div>
            </div>
          </div>
        </div>

        <div className="bento-item" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800 }}>Parâmetros da Loja</h3>
          
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #edf2f7', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 800, margin: 0, fontSize: '0.9rem' }}>Modo Manutenção</p>
                <p style={{ fontSize: '0.65rem', opacity: 0.6, margin: 0 }}>Checkout inativo para clientes</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={formSettings.maintenanceMode} onChange={(e) => setFormSettings({ ...formSettings, maintenanceMode: e.target.checked })} />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Desconto à Vista (Pix/Dinheiro) (%)</label>
            <div style={{ position: 'relative' }}>
               <input type="number" value={formSettings.cashDiscount} onChange={(e) => setFormSettings({ ...formSettings, cashDiscount: parseInt(e.target.value) })} style={{ paddingLeft: '2.5rem' }} />
               <Zap size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
               <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.4 }}>%</span>
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '1.5rem' }}>
            <div className="form-group">
                <label>Juros Parcelamento (%)</label>
                <div style={{ position: 'relative' }}>
                <input type="number" value={formSettings.installmentInterest} onChange={(e) => setFormSettings({ ...formSettings, installmentInterest: parseInt(e.target.value) })} style={{ paddingLeft: '2.5rem' }} />
                <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.4 }}>%</span>
                </div>
            </div>
            <div className="form-group">
                <label>Parcelas Máximas</label>
                <div style={{ position: 'relative' }}>
                <input type="number" value={formSettings.maxInstallments} onChange={(e) => setFormSettings({ ...formSettings, maxInstallments: parseInt(e.target.value) })} style={{ paddingLeft: '2.5rem' }} />
                <List size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.4 }}>x</span>
                </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Valor da Taxa de Entrega por KM (R$)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" 
                step="0.1" 
                value={formSettings.deliveryFeePerKm} 
                onChange={(e) => setFormSettings({ ...formSettings, deliveryFeePerKm: parseFloat(e.target.value) })} 
                style={{ paddingLeft: '2.5rem' }} 
              />
              <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.4 }}>R$/km</span>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '2rem' }}>
            <button 
              className="btn-primary-modern" 
              style={{ width: '100%', height: '56px', fontSize: '1.1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={handleSaveSettings}
            >
              <Save size={20} /> Salvar Alterações
            </button>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Alerta de Estoque Baixo</label>
            <div style={{ position: 'relative' }}>
               <input type="number" value={formSettings.lowStockThreshold} onChange={(e) => setFormSettings({ ...formSettings, lowStockThreshold: parseInt(e.target.value) })} style={{ paddingLeft: '2.5rem' }} />
               <ShoppingBag size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
               <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.4 }}>unid.</span>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--brand-p-soft)', borderRadius: '12px', border: '1px solid var(--brand-p-soft)' }}>
             <p style={{ fontSize: '0.75rem', color: 'var(--brand-p)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={14} /> Sistema Ativo & Protegido
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
