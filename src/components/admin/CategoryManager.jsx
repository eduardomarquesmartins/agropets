import React from 'react';
import { 
  Plus, Edit, Trash2, RefreshCw, Grid 
} from 'lucide-react';
import { useCategoryStore } from '../../store/categoryStore';
import { capitalizeTitle } from '../../utils/stringUtils';
import toast from 'react-hot-toast';

const CategoryManager = ({ openModal }) => {
  const { categories, deleteCategory, syncDefaultCategories } = useCategoryStore();

  const handleDeleteCategory = (id) => {
    if (window.confirm('Deseja realmente excluir esta categoria? Isso pode afetar a visibilidade de produtos vinculados.')) {
      deleteCategory(id);
      toast.success('Categoria removida.');
    }
  };

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            <Grid size={14} /> Arquitetura da Loja
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Categorias & Departamentos</h1>
          <p>Organize seus produtos em categorias intuitivas para facilitar a navegação do cliente.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary-modern" onClick={() => { if(confirm('Restaurar categorias padrão do sistema?')) syncDefaultCategories(); }} style={{ height: '50px', padding: '0 1.25rem' }}>
            <RefreshCw size={18} /> Restaurar Padrão
          </button>
          <button className="btn-primary-modern pulse" onClick={() => openModal('category')} style={{ height: '50px', padding: '0 1.5rem' }}>
            <Plus size={20} /> Nova Categoria
          </button>
        </div>
      </div>

      <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
        {categories.map(cat => (
          <div key={cat.id} className="bento-item fade-in" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9', transition: 'all 0.3s ease' }}>
            <div className="category-image-box" style={{ height: '180px', position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>
              <img src={cat.img || 'https://images.unsplash.com/photo-1541591419107-bb5e172d5d7b?q=80&w=400&auto=format&fit=crop'} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 100%)' }}></div>
              <h4 style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem', margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{capitalizeTitle(cat.name)}</h4>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>ID: {cat.id?.toString().slice(0,8)}</span>
              <div className="action-buttons-modern">
                <button className="btn-action-outline edit" onClick={() => openModal('category', cat)} title="Editar"><Edit size={16} /></button>
                <button className="btn-action-outline delete" onClick={() => handleDeleteCategory(cat.id)} title="Excluir"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;
