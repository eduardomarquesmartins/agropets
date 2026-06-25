import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Footer from './components/Footer';
import Header from './components/Header';
import Hero from './components/Hero';
import CategoryList from './components/CategoryList';
import ProductList from './components/ProductList';

import Cart from './pages/Cart';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import CategoryPage from './pages/CategoryPage';
import AdminDashboard from './pages/AdminDashboard';
import Checkout from './pages/Checkout';
import ProductDetail from './pages/ProductDetail';
import VetDashboard from './pages/VetDashboard';
import Institutional from './pages/Institutional';
import SearchPage from './pages/SearchPage';
import AgroVetSection from './components/AgroVetSection';
import ScrollToTop from './components/ScrollToTop';
import MobileNavbar from './components/MobileNavbar';
import WhatsAppFloat from './components/WhatsAppFloat';
import CartQuickFinish from './components/CartQuickFinish';
import CookieConsentBanner from './components/CookieConsentBanner';

import './App.css';

import { useSearchStore, useCartStore } from './store/cartStore';
import { useSettingsStore } from './store/settingsStore';
import { useAuthStore } from './store/authStore';
import { useProductStore } from './store/productStore';
import { useCategoryStore } from './store/categoryStore';
import { useBannerStore } from './store/bannerStore';
import { usePetStore } from './store/petStore';
import { useMedicalRecordStore } from './store/medicalRecordStore';
import { useOrderStore } from './store/orderStore';
import { useCouponStore } from './store/couponStore';
import { useCustomerStore } from './store/customerStore';
import { useAdminUserStore } from './store/adminUserStore';
import { useFinancialStore } from './store/financialStore';
import { useInventoryStore } from './store/inventoryStore';
import { useAppointmentStore } from './store/appointmentStore';

function Home() {
  const searchQuery = useSearchStore((state) => state.searchQuery);

  if (searchQuery) {
    return (
      <div style={{ paddingTop: '2rem' }}>
        <ProductList title={`Resultados para: "${searchQuery}"`} />
      </div>
    );
  }

  return (
    <>
      <Hero />
      <CategoryList />
      <ProductList title="Principais Destaques" filterFeatured={true} limit={4} viewAllTo="/busca?featured=1" />
      <ProductList title={"Ofertas Imperd\u00edveis"} limit={4} viewAllTo="/busca?discount=1&sort=discount" />
      <ProductList title={"Para C\u00e3es"} filterCategory="cachorros" limit={4} viewAllTo="/categoria/cachorros" />
      <ProductList title="Destaques para Gatos" filterCategory="gatos" limit={4} viewAllTo="/categoria/gatos" />
      <AgroVetSection />
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isVet = user?.role === 'vet';
  const { settings, fetchSettings } = useSettingsStore();
  const { isDrawerOpen } = useCartStore();

  const { fetchProducts } = useProductStore();
  const { fetchCategories } = useCategoryStore();
  const { fetchBanners } = useBannerStore();
  const { fetchPets } = usePetStore();
  const { fetchRecords } = useMedicalRecordStore();
  const { fetchOrders } = useOrderStore();
  const { fetchCoupons } = useCouponStore();
  const { fetchCustomers } = useCustomerStore();
  const { fetchAdminUsers } = useAdminUserStore();
  const { fetchTransactions } = useFinancialStore();
  const { fetchLogs } = useInventoryStore();
  const { fetchAppointments } = useAppointmentStore();

  React.useEffect(() => {
    fetchSettings();
    fetchProducts();
    fetchCategories();
    fetchBanners();

    if (user) {
      if (isAdmin) {
        fetchOrders();
        fetchCoupons();
        fetchCustomers();
        fetchAdminUsers();
        fetchTransactions();
        fetchLogs();
        fetchAppointments();
        fetchPets();
        fetchRecords();
      } else if (isVet) {
        fetchAppointments();
        fetchPets();
        fetchRecords();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, isVet]);

  React.useEffect(() => {
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--brand-p', settings.primaryColor);
      document.documentElement.style.setProperty('--brand-p-soft', settings.primaryColor + '15');
    }
  }, [settings.primaryColor]);

  if (isAdmin && location.pathname.startsWith('/admin')) {
    return (
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </>
    );
  }

  if (isVet && location.pathname.startsWith('/vet')) {
    return (
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/vet" element={<VetDashboard />} />
        </Routes>
      </>
    );
  }

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      <Header />
      <main className="main-content-mobile-fix">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/minha-conta" element={<UserDashboard />} />
          <Route path="/categoria/:categoryData" element={<CategoryPage key={`${location.pathname}${location.search}`} />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/busca" element={<SearchPage key={location.search} />} />
          <Route path="/sobre" element={<Institutional />} />
          <Route path="/nossas-lojas" element={<Institutional />} />
          <Route path="/politica-de-privacidade" element={<Institutional />} />
          <Route path="/trocas-e-devolucoes" element={<Institutional />} />
          <Route path="/faq" element={<Institutional />} />
          <Route path="/fale-conosco" element={<Institutional />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Login />} />
          <Route path="/vet" element={isVet ? <VetDashboard /> : <Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <WhatsAppFloat />
      {location.pathname !== '/cart' && location.pathname !== '/checkout' && !isDrawerOpen && <CartQuickFinish />}
      <MobileNavbar />
      {/* <CookieConsentBanner /> */}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AppContent />
    </Router>
  );
}

export default App;
