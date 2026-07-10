import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useWishlistStore, useCartStore } from '../store/cartStore';
import { ShoppingBag, Heart, User as UserIcon, LogOut, Settings, Trash2, ShoppingCart, Dog, MapPin, Phone, Hash, Calendar, Box, CheckCircle, Clock, Plus, Edit } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { usePetStore } from '../store/petStore';
import toast from 'react-hot-toast';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { wishlist, toggleWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();
  const { fetchUserOrders } = useOrderStore();
  
  const { pets, addPet, updatePet, deletePet, fetchPets } = usePetStore();
  const activeTabParam = searchParams.get('tab');
  const activeTab = activeTabParam === 'wishlist' || activeTabParam === 'profile' ? activeTabParam : 'orders';
  const setActiveTab = (tab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'orders') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tab);
    }
    setSearchParams(nextParams, { replace: true });
  };
  
  const [userOrders, setUserOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Pet Modal State
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [petForm, setPetForm] = useState({
    name: '',
    type: 'Cachorro',
    breed: '',
    age: '',
    weight: ''
  });

  useEffect(() => {
    if (user?.email) {
      const loadOrders = async () => {
        setIsLoadingOrders(true);
        const phone = (user.phone || user.whatsapp || '').replace(/\D/g, '');
        const data = await fetchUserOrders(phone);
        setUserOrders(data);
        setIsLoadingOrders(false);
      };
      loadOrders();
    }
    fetchPets();
  }, [user, fetchUserOrders, fetchPets]);

  const handlePetSubmit = async (e) => {
    e.preventDefault();
    if (!petForm.name) return toast.error('Nome é obrigatório');

    const petData = {
      ...petForm,
      customerId: user.id
    };

    if (editingPet) {
      await updatePet(editingPet.id, petData);
      toast.success('Pet atualizado com sucesso!');
    } else {
      await addPet(petData);
      toast.success('Pet cadastrado com sucesso!');
    }

    closePetModal();
  };

  const closePetModal = () => {
    setIsPetModalOpen(false);
    setEditingPet(null);
    setPetForm({ name: '', type: 'Cachorro', breed: '', age: '', weight: '' });
  };

  const openPetModal = (pet = null) => {
    if (pet) {
      setEditingPet(pet);
      setPetForm({
        name: pet.name,
        type: pet.type || 'Cachorro',
        breed: pet.breed || '',
        age: pet.age || '',
        weight: pet.weight || ''
      });
    } else {
      setEditingPet(null);
      setPetForm({ name: '', type: 'Cachorro', breed: '', age: '', weight: '' });
    }
    setIsPetModalOpen(true);
  };

  const handleDeletePet = async (petId) => {
    if (window.confirm('Tem certeza que deseja excluir este pet?')) {
      await deletePet(petId);
      toast.success('Pet removido.');
    }
  };

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Desconectado com sucesso!');
  };

  const handleAddToCart = (product) => {
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

  const renderOrders = () => (
    <div className="fade-in">
      <div className="content-header">
        <h2>Meus Pedidos</h2>
        <p>Acompanhe o status das suas compras recentes na Agropets.</p>
      </div>

      {isLoadingOrders ? (
        <div className="empty-state">
          <div className="loading-spinner-simple" style={{ width: '40px', height: '40px', border: '3px solid var(--brand-p-soft)', borderTopColor: 'var(--brand-p)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '1rem' }}>Carregando seus pedidos...</p>
        </div>
      ) : userOrders.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={56} />
          <h4>Nenhum pedido encontrado</h4>
          <p>Você ainda não realizou nenhuma compra conosco. Que tal explorar nossas ofertas incríveis e garantir o melhor para seu pet?</p>
          <Link to="/" className="btn-primary-action">
            <ShoppingBag size={18} /> Explorar Produtos
          </Link>
        </div>
      ) : (
        <div className="orders-list-premium">
          {userOrders.map(order => (
            <div key={order.id} className="order-card-premium">
              <div className="order-main-info">
                <div className="order-id-date">
                  <span className="order-number">#{order.order_number}</span>
                  <span className="order-date">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="order-status-badge" data-status={order.status}>
                  {order.status === 'Entregue' ? <CheckCircle size={14} /> : 
                   order.status === 'Cancelado' ? <Trash2 size={14} /> : <Clock size={14} />}
                  {order.status}
                </div>
              </div>
              <div className="order-items-summary">
                <Box size={16} />
                <span>{order.items?.length || 0} produto(s)</span>
              </div>
              <div className="order-footer">
                <span className="order-total">Total: <strong>R$ {Number(order.total).toFixed(2).replace('.', ',')}</strong></span>
                <span className="order-payment">{order.payment}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderWishlist = () => (
    <div className="fade-in">
      <div className="content-header">
        <h2>Lista de Desejos</h2>
        <p>Produtos que você favoritou e quer acompanhar.</p>
      </div>

      {wishlist.length === 0 ? (
        <div className="empty-state">
          <Heart size={56} />
          <h4>Sua lista está vazia</h4>
          <p>Você ainda não adicionou nenhum produto aos favoritos. Explore a loja e clique no coração para salvar os itens que mais gostar!</p>
          <Link to="/" className="btn-primary-action">
            <Heart size={18} /> Ver Destaques
          </Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map(item => (
            <div key={item.id} className="wishlist-item">
              <button 
                className="remove-wishlist" 
                onClick={() => {
                  toggleWishlist(item);
                  toast.success('Removido dos favoritos');
                }}
                title="Remover"
              >
                <Trash2 size={16} />
              </button>
              <img src={item.img} alt={item.name} />
              <Link to={`/produto/${item.id}`} className="p-name">{item.name}</Link>
              <span className="p-price">R$ {item.price.toFixed(2)}</span>
              <button 
                className="btn-primary-action" 
                style={{ width: '100%', padding: '0.8rem' }}
                onClick={() => handleAddToCart(item)}
              >
                <ShoppingCart size={16} /> Adicionar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="fade-in">
      <div className="content-header">
        <h2>Meus Dados</h2>
        <p>Gerencie suas informações pessoais e visualize seus pets.</p>
      </div>

      <div className="profile-grid-dashboard">
        <div className="profile-section-card">
          <h3 className="section-title-premium"><UserIcon size={18} /> Informações Básicas</h3>
          <div className="user-form-group">
            <label>Nome Completo</label>
            <div className="input-with-icon-static">
              <UserIcon size={16} />
              <input type="text" className="user-input-premium" disabled value={user.name || ''} />
            </div>
          </div>
          <div className="user-form-group">
            <label>E-mail</label>
            <div className="input-with-icon-static">
              <Settings size={16} />
              <input type="email" className="user-input-premium" disabled value={user.email || ''} />
            </div>
          </div>
          <div className="profile-row-dash">
            <div className="user-form-group">
              <label>CPF</label>
              <div className="input-with-icon-static">
                <Hash size={16} />
                <input type="text" className="user-input-premium" disabled value={user.cpf || 'Não informado'} />
              </div>
            </div>
            <div className="user-form-group">
              <label>WhatsApp</label>
              <div className="input-with-icon-static">
                <Phone size={16} />
                <input type="text" className="user-input-premium" disabled value={user.phone || user.whatsapp || 'Não informado'} />
              </div>
            </div>
          </div>
        </div>

        <div className="profile-section-card">
          <h3 className="section-title-premium"><MapPin size={18} /> Endereço de Entrega</h3>
          <div className="user-form-group">
            <label>CEP</label>
            <div className="input-with-icon-static">
              <Hash size={16} />
              <input type="text" className="user-input-premium" disabled value={user.cep || 'Não informado'} />
            </div>
          </div>
          <div className="user-form-group">
            <label>Logradouro</label>
            <div className="input-with-icon-static">
              <MapPin size={16} />
              <input type="text" className="user-input-premium" disabled value={`${user.address || user.endereco || ''}${user.number ? ', ' + user.number : ''}`} placeholder="Endereço não cadastrado" />
            </div>
          </div>
          <div className="profile-row-dash">
            <div className="user-form-group">
              <label>Bairro</label>
              <input type="text" className="user-input-premium" disabled value={user.neighborhood || user.bairro || 'Não informado'} />
            </div>
            <div className="user-form-group">
              <label>Cidade</label>
              <input type="text" className="user-input-premium" disabled value={user.location || user.city || 'Viamão - RS'} />
            </div>
          </div>
        </div>

        <div className="profile-section-card full-width-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="section-title-premium" style={{ margin: 0 }}><Dog size={18} /> Meus Pets</h3>
            <button className="btn-add-pet-small" onClick={() => openPetModal()}>
              <Plus size={14} /> Adicionar Pet
            </button>
          </div>
          
          {pets.filter(p => p.customerId === user.id).length === 0 ? (
            <div className="empty-state-mini">
              <Dog size={32} />
              <p>Você ainda não cadastrou nenhum pet. Adicione o perfil deles para receber recomendações!</p>
            </div>
          ) : (
            <div className="pet-dashboard-grid">
              {pets.filter(p => p.customerId === user.id).map(pet => (
                <div key={pet.id} className="pet-dash-card">
                  <div className="pet-dash-avatar">
                    <Dog size={24} />
                  </div>
                  <div className="pet-dash-info">
                    <strong>{pet.name}</strong>
                    <span>{pet.type} • {pet.breed || 'SRD'}</span>
                  </div>
                  <div className="pet-dash-actions">
                    <button onClick={() => openPetModal(pet)} title="Editar"><Edit size={14} /></button>
                    <button onClick={() => handleDeletePet(pet.id)} title="Remover"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="user-dashboard">
      <div className="container dashboard-layout">
        
        <aside className="user-sidebar">
          <div className="user-profile-summary">
            <div className="user-avatar-wrapper">
               <img src={`https://ui-avatars.com/api/?name=${user.name || 'Usuário'}&background=ffffff&color=15803d`} alt="Avatar" className="user-avatar" />
            </div>
            <div>
              <h3>{user.name || 'Bem-vindo!'}</h3>
              <p><Heart size={12} fill="currentColor" /> Cliente VIP</p>
            </div>
          </div>

          <nav className="user-nav-modern">
            <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
              <ShoppingBag size={20} /> Meus Pedidos
            </button>
            <button className={activeTab === 'wishlist' ? 'active' : ''} onClick={() => setActiveTab('wishlist')}>
              <Heart size={20} /> Lista de Desejos
            </button>
            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              <Settings size={20} /> Meus Dados
            </button>
          </nav>

          <div className="user-logout">
            <button onClick={handleLogout} className="user-nav-modern" style={{width: '100%', outline: 'none', background: 'transparent', border: 'none', padding: 0}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem 1.25rem', width: '100%', borderRadius: '16px', color: '#ef4444', fontWeight: 700}}>
                 <LogOut size={20} /> Sair da Conta
              </div>
            </button>
          </div>
        </aside>

        <main className="user-content">
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'wishlist' && renderWishlist()}
          {activeTab === 'profile' && renderProfile()}
        </main>

      </div>

      {isPetModalOpen && (
        <div className="modal-overlay-user">
          <div className="modal-content-user fade-in">
            <div className="modal-header-user">
              <h3>{editingPet ? 'Editar Pet' : 'Cadastrar Novo Pet'}</h3>
              <button onClick={closePetModal} className="btn-close-modal">×</button>
            </div>
            <form onSubmit={handlePetSubmit} className="modal-body-user">
              <div className="form-group-user">
                <label>Nome do Pet</label>
                <input 
                  type="text" 
                  value={petForm.name} 
                  onChange={e => setPetForm({...petForm, name: e.target.value})}
                  placeholder="Ex: Totó"
                  required
                />
              </div>
              <div className="form-row-user">
                <div className="form-group-user">
                  <label>Tipo</label>
                  <select value={petForm.type} onChange={e => setPetForm({...petForm, type: e.target.value})}>
                    <option value="Cachorro">Cachorro</option>
                    <option value="Gato">Gato</option>
                    <option value="Pássaro">Pássaro</option>
                    <option value="Roedor">Roedor</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="form-group-user">
                  <label>Raça</label>
                  <input 
                    type="text" 
                    value={petForm.breed} 
                    onChange={e => setPetForm({...petForm, breed: e.target.value})}
                    placeholder="Ex: Golden Retriever"
                  />
                </div>
              </div>
              <div className="form-row-user">
                <div className="form-group-user">
                  <label>Idade (anos)</label>
                  <input 
                    type="number" 
                    value={petForm.age} 
                    onChange={e => setPetForm({...petForm, age: e.target.value})}
                    placeholder="Ex: 3"
                  />
                </div>
                <div className="form-group-user">
                  <label>Peso (kg)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={petForm.weight} 
                    onChange={e => setPetForm({...petForm, weight: e.target.value})}
                    placeholder="Ex: 12.5"
                  />
                </div>
              </div>
              <div className="modal-footer-user">
                <button type="button" onClick={closePetModal} className="btn-cancel-user">Cancelar</button>
                <button type="submit" className="btn-save-user">Salvar Pet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
