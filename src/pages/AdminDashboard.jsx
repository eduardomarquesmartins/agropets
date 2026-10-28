import React, { useState, useEffect } from 'react';
import {
  Package, Users, User, Settings, LogOut, LayoutDashboard,
  DollarSign, ShoppingBag, Plus, RefreshCw, Menu, Home,
  X, Zap, Calendar, Grid, Rocket, Shield, Activity, Power, Search, Mail, Phone, Hash, MapPin, Upload, Save, CreditCard, List
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAdminUserStore } from '../store/adminUserStore';
import { useProductStore } from '../store/productStore';
import { useCategoryStore } from '../store/categoryStore';
import { useCustomerStore } from '../store/customerStore';
import { useCouponStore } from '../store/couponStore';
import { usePetStore } from '../store/petStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBannerStore } from '../store/bannerStore';
import { useOrderStore } from '../store/orderStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { useFinancialStore } from '../store/financialStore';
import { supabase, isSupabaseConfigured, uploadBannerImage } from '../services/supabase';
import toast from 'react-hot-toast';

// Import Sub-Components
import DashboardOverview from '../components/admin/DashboardOverview';
import InventoryManager from '../components/admin/InventoryManager';
import OrderManager from '../components/admin/OrderManager';
import POSManager from '../components/admin/POSManager';
import CustomerManager from '../components/admin/CustomerManager';
import AppointmentsManager from '../components/admin/AppointmentsManager';
import FinancialManager from '../components/admin/FinancialManager';
import MarketingManager from '../components/admin/MarketingManager';
import TeamManager from '../components/admin/TeamManager';
import CategoryManager from '../components/admin/CategoryManager';
import SettingsManager from '../components/admin/SettingsManager';
import InventoryLogs from '../components/admin/InventoryLogs';
import SellerManager from '../components/admin/SellerManager';
import PasswordInput from '../components/PasswordInput';

import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout, updateProfile } = useAuthStore();
  const { fetchProducts } = useProductStore();
  const { fetchCustomers, addCustomer, updateCustomer } = useCustomerStore();
  const { fetchCoupons, addCoupon, updateCoupon } = useCouponStore();
  const { fetchSettings, settings } = useSettingsStore();
  const { fetchAdminUsers, addAdminUser, updateAdminUser } = useAdminUserStore();
  const { addCategory, updateCategory } = useCategoryStore();
  const { fetchOrders } = useOrderStore();
  const { fetchLogs } = useInventoryStore();
  const { fetchAppointments, addAppointment, updateAppointment } = useAppointmentStore();
  const { fetchTransactions, addTransaction } = useFinancialStore();
  const { fetchPets } = usePetStore();
  const { fetchBanners, addBanner, updateBanner } = useBannerStore();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal States
  const [modalMode, setModalMode] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // Form States
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', cpf: '', birthDate: '', location: '', address: '', number: '', neighborhood: '', cep: '', complement: '', petType: 'cachorros' });
  const [couponForm, setCouponForm] = useState({ code: '', type: 'percentage', value: '', expiry: '', active: true, oncePerCpf: false, maxUses: '', minimumPurchaseAmount: '', quantity: 1 });
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', img: '', link: '', buttonText: '', status: 'active', position: 1 });
  const [teamForm, setTeamForm] = useState({ name: '', email: '', role: 'editor', password: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', img: '', subCategories: [] });
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });
  const [appointmentForm, setAppointmentForm] = useState({ date: '', time: '', customCustomerName: '', customPetName: '', serviceType: '', professional: '', customerId: 'external', petId: 'external' });
  const [transactionForm, setTransactionForm] = useState({ description: '', amount: '', type: 'expense', category: '' });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    } else {
      fetchOrders();
      fetchProducts();
      fetchCustomers();
      fetchLogs();
      fetchAppointments();
      fetchTransactions();
      fetchSettings();
      fetchCoupons();
      fetchAdminUsers();
      fetchBanners();
      fetchPets();

      if (!isSupabaseConfigured || !supabase) {
        return undefined;
      }

      const orderSub = supabase.channel('admin-orders').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        toast.success('Novo pedido recebido!', { icon: '🛍️' });
      }).subscribe();
      
      return () => supabase.removeChannel(orderSub);
    }
  }, [user, navigate, fetchAdminUsers, fetchAppointments, fetchBanners, fetchCoupons, fetchCustomers, fetchLogs, fetchOrders, fetchPets, fetchProducts, fetchSettings, fetchTransactions]);

  const openModal = (mode, item = null) => {
    setModalMode(mode);
    setEditingItem(item);
    if (mode === 'customer') setCustomerForm(item ? { ...item } : { name: '', email: '', phone: '', cpf: '', birthDate: '', location: '', address: '', number: '', neighborhood: '', cep: '', complement: '', petType: 'cachorros' });
    if (mode === 'coupon') setCouponForm(item ? { ...item, minimumPurchaseAmount: item.minimumPurchaseAmount ?? 0 } : { code: '', type: 'percentage', value: '', expiry: '', active: true, oncePerCpf: false, maxUses: '', minimumPurchaseAmount: '', quantity: 1 });
    if (mode === 'banner') setBannerForm(item ? { ...item } : { title: '', subtitle: '', img: '', link: '', buttonText: '', status: 'active', position: 1 });
    if (mode === 'team') setTeamForm(item ? { ...item } : { name: '', email: '', role: 'editor', password: '' });
    if (mode === 'category') setCategoryForm(item ? { ...item } : { name: '', img: '', subCategories: [] });
    if (mode === 'profile') setProfileForm({ name: user?.name || '', email: user?.email || '', password: '' });
    if (mode === 'appointment') setAppointmentForm(item ? { ...item } : { date: selectedDate, time: '', customCustomerName: '', customPetName: '', serviceType: '', professional: '', customerId: 'external', petId: 'external' });
    if (mode === 'transaction') setTransactionForm({ description: '', amount: '', type: 'expense', category: '' });
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      if (modalMode === 'customer') {
        editingItem ? await updateCustomer(editingItem.id, customerForm) : await addCustomer(customerForm);
      } else if (modalMode === 'coupon') {
        const data = { ...couponForm, value: parseFloat(couponForm.value), maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : null, minimumPurchaseAmount: Math.max(0, parseFloat(couponForm.minimumPurchaseAmount) || 0) };
        editingItem ? await updateCoupon(editingItem.id, data) : await addCoupon(data);
      } else if (modalMode === 'banner') {
        editingItem ? await updateBanner(editingItem.id, bannerForm) : await addBanner(bannerForm);
      } else if (modalMode === 'team') {
        editingItem ? await updateAdminUser(editingItem.id, teamForm) : await addAdminUser(teamForm);
      } else if (modalMode === 'category') {
        editingItem ? await updateCategory(editingItem.id, categoryForm) : await addCategory(categoryForm);
      } else if (modalMode === 'appointment') {
        // Validar dia da semana (segunda=1, sexta=5)
        if (appointmentForm.date) {
          const d = new Date(appointmentForm.date + 'T12:00:00');
          const wd = d.getDay();
          if (wd !== 1 && wd !== 5) {
            toast.error('A veterinária atende somente às Segundas e Sextas-feiras!');
            return;
          }
        }
        editingItem ? await updateAppointment(editingItem.id, appointmentForm) : await addAppointment(appointmentForm);
      } else if (modalMode === 'transaction') {
        const data = { ...transactionForm, amount: parseFloat(transactionForm.amount) };
        await addTransaction(data);
      } else if (modalMode === 'profile') {
        await updateProfile(profileForm);
      }
      toast.success('Operação realizada com sucesso!');
      setIsModalOpen(false);
    } catch {
      toast.error('Erro ao salvar.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Desconectado com sucesso!');
  };

  const handleBannerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Enviando imagem...');
    try {
      const url = await uploadBannerImage(file);
      setBannerForm(prev => ({ ...prev, img: url }));
      toast.success('Imagem enviada!', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar imagem.', { id: toastId });
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-layout" translate="no" lang="pt">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <Link to="/" className="admin-brand-modern" style={{ textDecoration: 'none' }}>
          <div className="logo-box">
             <img src={settings?.logo || '/agropetssemfundo.png'} alt="Logo" />
          </div>
        </Link>
        <nav className="admin-nav-modern">
          <button className={`nav-link-modern ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}><div className="icon-box"><LayoutDashboard size={20} /></div><span>Insights</span></button>
          <button className={`nav-link-modern ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => { setActiveTab('pos'); setIsSidebarOpen(false); }}><div className="icon-box"><Zap size={20} /></div><span>PDV (Caixa)</span></button>
          <button className={`nav-link-modern ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => { setActiveTab('appointments'); setIsSidebarOpen(false); }}><div className="icon-box"><Calendar size={20} /></div><span>Agenda</span></button>
          <button className={`nav-link-modern ${activeTab === 'products' ? 'active' : ''}`} onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}><div className="icon-box"><Package size={20} /></div><span>Estoque</span></button>
          <button className={`nav-link-modern ${activeTab === 'inventory-logs' ? 'active' : ''}`} onClick={() => { setActiveTab('inventory-logs'); setIsSidebarOpen(false); }}><div className="icon-box"><RefreshCw size={20} /></div><span>Movimentações</span></button>
          <button className={`nav-link-modern ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}><div className="icon-box"><ShoppingBag size={20} /></div><span>Vendas</span></button>
          <button className={`nav-link-modern ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => { setActiveTab('financial'); setIsSidebarOpen(false); }}><div className="icon-box"><DollarSign size={20} /></div><span>Financeiro</span></button>
          <button className={`nav-link-modern ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }}><div className="icon-box"><Users size={20} /></div><span>Clientes</span></button>
          <button className={`nav-link-modern ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => { setActiveTab('categories'); setIsSidebarOpen(false); }}><div className="icon-box"><Grid size={20} /></div><span>Categorias</span></button>
          <button className={`nav-link-modern ${activeTab === 'marketing' ? 'active' : ''}`} onClick={() => { setActiveTab('marketing'); setIsSidebarOpen(false); }}><div className="icon-box"><Rocket size={20} /></div><span>Marketing</span></button>
          <button className={`nav-link-modern ${activeTab === 'team' ? 'active' : ''}`} onClick={() => { setActiveTab('team'); setIsSidebarOpen(false); }}><div className="icon-box"><Shield size={20} /></div><span>Equipe</span></button>
          <button className={`nav-link-modern ${activeTab === 'sellers' ? 'active' : ''}`} onClick={() => { setActiveTab('sellers'); setIsSidebarOpen(false); }}><div className="icon-box"><Users size={20} /></div><span>Vendedores</span></button>
          <button className={`nav-link-modern ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}><div className="icon-box"><Settings size={20} /></div><span>Ajustes</span></button>
          <div className="nav-divider"></div>
          <button className="nav-link-modern" onClick={handleLogout}><div className="icon-box"><LogOut size={20} /></div><span>Sair</span></button>
        </nav>
      </aside>

      <main className="admin-main-viewport">
        <header className="admin-top-header">
           <button className="btn-mobile-menu" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
           <div className="header-info-admin hide-mobile">
              <span className="system-label" style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-p)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Sistema de Gestão</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-h)', marginTop: '-2px', display: 'block' }}>Painel de Controle</span>
           </div>
           <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link to="/" className="btn-secondary-modern" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><Home size={16} /> <span className="hide-mobile">Página Principal</span></Link>
              <div className="header-user-profile" style={{ cursor: 'pointer' }} onClick={() => openModal('profile')}>
                 <div className="user-info-text hide-mobile">
                    <span className="u-name" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.name}</span>
                 </div>
                 <img src={`https://ui-avatars.com/api/?name=${user.name}&background=15803d&color=fff`} alt="User" style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              </div>
           </div>
        </header>

        <section className="admin-page-content">
          {activeTab === 'dashboard' && <DashboardOverview setActiveTab={setActiveTab} />}
          {activeTab === 'pos' && <POSManager />}
          {activeTab === 'appointments' && <AppointmentsManager selectedDate={selectedDate} setSelectedDate={setSelectedDate} openModal={openModal} />}
          {activeTab === 'products' && <InventoryManager openModal={openModal} editingItem={editingItem} setEditingItem={setEditingItem} isEditingProduct={isEditingProduct} setIsEditingProduct={setIsEditingProduct} />}
          {activeTab === 'inventory-logs' && <InventoryLogs />}
          {activeTab === 'orders' && <OrderManager />}
          {activeTab === 'financial' && <FinancialManager openModal={openModal} />}
          {activeTab === 'customers' && <CustomerManager openModal={openModal} />}
          {activeTab === 'marketing' && <MarketingManager openModal={openModal} />}
          {activeTab === 'settings' && <SettingsManager />}
          {activeTab === 'team' && <TeamManager openModal={openModal} />}
          {activeTab === 'sellers' && <SellerManager />}
          {activeTab === 'categories' && <CategoryManager openModal={openModal} />}
        </section>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content bento-item scale-in" style={{ maxWidth: '600px', maxHeight: '90vh', background: 'white', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {modalMode === 'customer' && (editingItem ? 'Editar Cliente' : 'Novo Cliente')}
                {modalMode === 'coupon' && (editingItem ? 'Editar Cupom' : 'Novo Cupom')}
                {modalMode === 'banner' && (editingItem ? 'Editar Banner' : 'Novo Banner')}
                {modalMode === 'team' && (editingItem ? 'Editar Usuário' : 'Novo Usuário')}
                {modalMode === 'category' && (editingItem ? 'Editar Categoria' : 'Nova Categoria')}
                {modalMode === 'profile' && 'Meu Perfil'}
              </h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-scroll-content" style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                {modalMode === 'customer' && (
                  <div className="registration-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '5px' }}><User size={14} /> Nome Completo</label><input type="text" className="admin-input" required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '5px' }}><Mail size={14} /> E-mail</label><input type="email" className="admin-input" required value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                      <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '5px' }}><Phone size={14} /> WhatsApp</label><input type="tel" className="admin-input" required value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    </div>
                  </div>
                )}
                
                {modalMode === 'coupon' && (
                  <div className="registration-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group"><label>Código</label><input type="text" className="admin-input" required value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                       <div className="form-group">
                         <label>Tipo</label>
                         <select className="admin-input" value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                           <option value="percentage">Porcentagem (%)</option>
                           <option value="fixed">Fixo (R$)</option>
                         </select>
                       </div>
                       <div className="form-group"><label>Valor</label><input type="number" className="admin-input" required value={couponForm.value} onChange={e => setCouponForm({...couponForm, value: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    </div>
                    <div className="form-group"><label>Compra mínima (R$)</label><input type="number" className="admin-input" min="0" step="0.01" value={couponForm.minimumPurchaseAmount} onChange={e => setCouponForm({...couponForm, minimumPurchaseAmount: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /><small style={{ color: '#64748b' }}>Use 0 para não exigir valor mínimo.</small></div>
                  </div>
                )}
                
                {modalMode === 'banner' && (
                  <div className="registration-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Imagem do Banner</label>
                      <div className="banner-upload-box" style={{ 
                        border: '2px dashed #e2e8f0', 
                        borderRadius: '12px', 
                        padding: '1rem', 
                        textAlign: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        position: 'relative'
                      }} onClick={() => document.getElementById('banner-img-input').click()}>
                        {bannerForm.img ? (
                          <img src={bannerForm.img} alt="Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                        ) : (
                          <div style={{ padding: '2rem 0', color: '#64748b' }}>
                            <Upload size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                            <p style={{ fontSize: '0.85rem' }}>Clique para enviar imagem</p>
                          </div>
                        )}
                        <input id="banner-img-input" type="file" hidden accept="image/*" onChange={handleBannerImageUpload} />
                      </div>
                    </div>
                    <div className="form-group"><label>Título</label><input type="text" className="admin-input" required value={bannerForm.title || ''} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-group"><label>Subtítulo</label><input type="text" className="admin-input" value={bannerForm.subtitle || ''} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group"><label>Texto do Botão</label><input type="text" className="admin-input" placeholder="Ex: Comprar Agora" value={bannerForm.buttonText || ''} onChange={e => setBannerForm({...bannerForm, buttonText: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                      <div className="form-group"><label>Link</label><input type="text" className="admin-input" placeholder="Ex: /categoria/cachorros" value={bannerForm.link || ''} onChange={e => setBannerForm({...bannerForm, link: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    </div>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Status</label>
                        <select className="admin-input" value={bannerForm.status} onChange={e => setBannerForm({...bannerForm, status: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Posição (Ordem)</label><input type="number" className="admin-input" value={bannerForm.position} onChange={e => setBannerForm({...bannerForm, position: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    </div>
                  </div>
                )}

                {modalMode === 'team' && (
                  <div className="registration-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group"><label>Nome Completo</label><input type="text" className="admin-input" required value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group"><label>E-mail</label><input type="email" className="admin-input" required value={teamForm.email} onChange={e => setTeamForm({...teamForm, email: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                      <div className="form-group">
                        <label>{editingItem ? 'Nova Senha (opcional)' : 'Senha Temporária'}</label>
                        <PasswordInput
                          placeholder={editingItem ? 'Deixe vazio para manter' : '••••••••'}
                          inputClassName="admin-input"
                          required={!editingItem} 
                          value={teamForm.password || ''} 
                          onChange={e => setTeamForm({...teamForm, password: e.target.value})} 
                          style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Nível de Acesso</label>
                      <select className="admin-input" value={teamForm.role} onChange={e => setTeamForm({...teamForm, role: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <option value="admin">Administrador (Total)</option>
                        <option value="editor">Editor (Restrito)</option>
                        <option value="seller">Vendedor (Acesso às vendas próprias)</option>
                      </select>
                    </div>
                  </div>
                )}

                {modalMode === 'category' && (
                  <div className="registration-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group"><label>Nome da Categoria</label><input type="text" className="admin-input" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-group"><label>URL da Imagem de Capa</label><input type="text" className="admin-input" value={categoryForm.img} onChange={e => setCategoryForm({...categoryForm, img: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                  </div>
                )}

                {modalMode === 'appointment' && (
                  <div className="registration-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group"><label>Data</label><input type="date" className="admin-input" required value={appointmentForm.date} onChange={e => setAppointmentForm({...appointmentForm, date: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                      <div className="form-group"><label>Hora</label><input type="time" className="admin-input" required value={appointmentForm.time} onChange={e => setAppointmentForm({...appointmentForm, time: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    </div>
                    <div className="form-group"><label>Nome do Cliente</label><input type="text" className="admin-input" required value={appointmentForm.customCustomerName} onChange={e => setAppointmentForm({...appointmentForm, customCustomerName: e.target.value, customerId: 'external'})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-group"><label>Nome do Pet</label><input type="text" className="admin-input" required value={appointmentForm.customPetName} onChange={e => setAppointmentForm({...appointmentForm, customPetName: e.target.value, petId: 'external'})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-group"><label>Serviço</label><input type="text" className="admin-input" required value={appointmentForm.serviceType} onChange={e => setAppointmentForm({...appointmentForm, serviceType: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-group"><label>Profissional</label><input type="text" className="admin-input" value={appointmentForm.professional} onChange={e => setAppointmentForm({...appointmentForm, professional: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                  </div>
                )}

                {modalMode === 'transaction' && (
                   <div className="registration-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     <div className="form-group"><label>Descrição / Título</label><input type="text" className="admin-input" required value={transactionForm.description} onChange={e => setTransactionForm({...transactionForm, description: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                     <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                       <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" className="admin-input" required value={transactionForm.amount} onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                       <div className="form-group">
                         <label>Tipo</label>
                         <select className="admin-input" value={transactionForm.type} onChange={e => setTransactionForm({...transactionForm, type: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                           <option value="expense">Saída (Despesa)</option>
                           <option value="income">Entrada (Receita)</option>
                         </select>
                       </div>
                     </div>
                     <div className="form-group"><label>Categoria</label><input type="text" className="admin-input" placeholder="Ex: Aluguel, Salários, Venda Direta" value={transactionForm.category} onChange={e => setTransactionForm({...transactionForm, category: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                   </div>
                )}

                {modalMode === 'profile' && (
                  <div className="registration-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group"><label>Nome</label><input type="text" className="admin-input" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-group"><label>E-mail</label><input type="email" className="admin-input" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                    <div className="form-group">
                      <label>Nova Senha (opcional)</label>
                      <PasswordInput
                        placeholder="Deixe vazio para manter"
                        inputClassName="admin-input"
                        value={profileForm.password || ''} 
                        onChange={e => setProfileForm({...profileForm, password: e.target.value})} 
                        style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ padding: '1.5rem 2rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc', marginTop: 'auto' }}>
                <button type="submit" className="btn-primary-modern" style={{ width: '100%', height: '54px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700 }}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
