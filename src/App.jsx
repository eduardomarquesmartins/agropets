import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Footer from './components/Footer';
import Header from './components/Header';
import Hero from './components/Hero';
import CategoryList from './components/CategoryList';
import ProductList from './components/ProductList';
import AgroVetSection from './components/AgroVetSection';
import ScrollToTop from './components/ScrollToTop';
import MobileNavbar from './components/MobileNavbar';
import WhatsAppFloat from './components/WhatsAppFloat';
import CartQuickFinish from './components/CartQuickFinish';
import ProtectedRoute from './components/ProtectedRoute';
import { lazyWithRetry } from './utils/lazyWithRetry';

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
import { captureSellerReferral } from './utils/sellerAttribution';

const Cart = lazyWithRetry(() => import('./pages/Cart'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const UserDashboard = lazyWithRetry(() => import('./pages/UserDashboard'));
const CategoryPage = lazyWithRetry(() => import('./pages/CategoryPage'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const Checkout = lazyWithRetry(() => import('./pages/Checkout'));
const ProductDetail = lazyWithRetry(() => import('./pages/ProductDetail'));
const VetDashboard = lazyWithRetry(() => import('./pages/VetDashboard'));
const Institutional = lazyWithRetry(() => import('./pages/Institutional'));
const SearchPage = lazyWithRetry(() => import('./pages/SearchPage'));
const SellerDashboard = lazyWithRetry(() => import('./pages/SellerDashboard'));

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
      <ProductList title="Ofertas Imperdíveis" limit={4} viewAllTo="/busca?discount=1&sort=discount" />
      <ProductList title="Para Cães" filterCategory="cachorros" limit={4} viewAllTo="/categoria/cachorros" />
      <ProductList title="Destaques para Gatos" filterCategory="gatos" limit={4} viewAllTo="/categoria/gatos" />
      <AgroVetSection />
    </>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
    </div>
  );
}

function PublicLayout() {
  const location = useLocation();
  const { isDrawerOpen } = useCartStore();
  const shouldShowQuickFinish = location.pathname !== '/cart' && location.pathname !== '/checkout' && !isDrawerOpen;

  return (
    <div className="app-container">
      <Header />
      <main className="main-content-mobile-fix">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
      {shouldShowQuickFinish && <CartQuickFinish />}
      <MobileNavbar />
    </div>
  );
}

function DashboardLayout() {
  return <Outlet />;
}

function CategoryPageRoute() {
  const location = useLocation();
  return <CategoryPage key={`${location.pathname}${location.search}`} />;
}

function SearchPageRoute() {
  const location = useLocation();
  return <SearchPage key={location.search} />;
}

function AppContent() {
  React.useEffect(() => {
    captureSellerReferral(window.location.search);
  }, []);
  const { user, initialize } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isVet = user?.role === 'vet';
  const { settings, fetchSettings } = useSettingsStore();

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
    initialize();
  }, [initialize]);

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

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/minha-conta"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/categoria/:categoryData" element={<CategoryPageRoute />} />
        <Route path="/produto/:id" element={<ProductDetail />} />
        <Route path="/busca" element={<SearchPageRoute />} />
        <Route path="/ofertas" element={<Navigate to="/busca?discount=1&sort=discount" replace />} />
        <Route path="/sobre" element={<Institutional />} />
        <Route path="/politica-de-privacidade" element={<Institutional />} />
        <Route path="/trocas-e-devolucoes" element={<Institutional />} />
        <Route path="/faq" element={<Institutional />} />
        <Route path="/fale-conosco" element={<Institutional />} />
      </Route>

      <Route element={<DashboardLayout />}>
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vet"
          element={
            <ProtectedRoute allowedRoles={['vet']}>
              <VetDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendedor"
          element={
            <ProtectedRoute allowedRoles={['seller']}>
              <SellerDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Toaster position="top-right" />
      <Suspense fallback={<RouteLoadingFallback />}>
        <AppContent />
      </Suspense>
    </Router>
  );
}

export default App;
