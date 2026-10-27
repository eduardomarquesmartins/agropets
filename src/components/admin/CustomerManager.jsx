import React, { useState } from 'react';
import { 
  Users, Plus, Search, Trash2, Mail, Phone, MapPin, Hash 
} from 'lucide-react';
import { useCustomerStore } from '../../store/customerStore';
import { usePetStore } from '../../store/petStore';
import toast from 'react-hot-toast';

const CustomerManager = ({ openModal }) => {
  const { customers, deleteCustomer } = useCustomerStore();
  const { pets } = usePetStore();
  const [customerSearch, setCustomerSearch] = useState('');

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  const handleDeleteCustomer = (id) => {
    if (window.confirm('Remover este cliente? Todos os dados vinculados serão perdidos.')) {
      deleteCustomer(id);
      toast.success('Cliente removido com sucesso!');
    }
  };

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            <Users size={14} /> Relacionamento
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Comunidade Agropets</h1>
          <p>Gerencie seus clientes e seus respectivos pets com eficiência.</p>
        </div>
        <button className="btn-primary-modern pulse" onClick={() => openModal('customer')}>
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <div className="bento-grid" style={{ marginBottom: '2rem' }}>
        <div className="bento-item bento-stat">
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-p)', textTransform: 'uppercase' }}>Total de Clientes</h3>
          <div className="value" style={{ fontSize: '2.5rem', fontWeight: 900 }}>{customers.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--brand-p)', fontWeight: 700 }}>
             <Users size={14} /> Base ativa
          </div>
        </div>
        <div className="bento-item bento-stat">
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-p)', textTransform: 'uppercase' }}>Pets Cadastrados</h3>
          <div className="value" style={{ fontSize: '2.5rem', fontWeight: 900 }}>{pets.length}</div>
        </div>
        <div className="bento-item bento-stat" style={{ gridColumn: 'span 6' }}>
           <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-p)', textTransform: 'uppercase' }}>Busca Rápida</h3>
           <div className="header-search" style={{ marginTop: '1rem', flex: 1, height: '50px', padding: '0 1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Nome, e-mail ou WhatsApp..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', fontWeight: 600, background: 'transparent' }}
            />
          </div>
        </div>
      </div>

      <div className="bento-item" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ padding: '1.25rem' }}>Cliente</th>
                <th className="hide-mobile">Localização</th>
                <th>Pets</th>
                <th style={{ padding: '1.25rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="user-cell">
                      <div className="product-names">
                        <span className="p-name" style={{ fontWeight: 800, fontSize: '1rem' }}>{c.name}</span>
                        <span className="p-sku" style={{ fontSize: '0.75rem' }}>{c.email} • {c.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-mobile">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <MapPin size={14} style={{ opacity: 0.5 }} /> {c.location || 'Não informado'}
                    </div>
                  </td>
                  <td>
                    <span className="tag-category green" style={{ padding: '6px 12px', borderRadius: '100px', fontWeight: 800, fontSize: '0.7rem' }}>
                      {pets.filter(p => p.customerId === c.id).length} Pets
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="action-buttons-modern">
                      <button className="btn-action-outline edit" onClick={() => openModal('customer', c)} title="Ver Detalhes"><Search size={16} /></button>
                      <button className="btn-action-outline delete" onClick={() => handleDeleteCustomer(c.id)} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerManager;

