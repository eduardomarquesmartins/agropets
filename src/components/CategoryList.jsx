import React from 'react';
import { Link } from 'react-router-dom';
import { useCategoryStore } from '../store/categoryStore';
import './CategoryList.css';

const CategoryList = () => {
  const { categories } = useCategoryStore();
  return (
    <div className="home-section">
      <div className="container">
        <div className="category-header">
          <span className="category-badge">O que você procura?</span>
          <h2 className="category-section-title">Explore por <span>Categorias</span></h2>
        </div>
      </div>
      
      <div className="category-stories-wrapper">
        <div className="category-grid">
          {categories.filter(cat => 
            ['cachorros', 'gatos', 'passaros', 'peixes', 'agropecuaria', 'jardim'].includes(cat.id)
          ).map((cat) => (
            <Link to={`/categoria/${cat.id}`} key={cat.id} className="category-card">
              <div className="category-img-container">
                <div className="category-img-wrapper">
                  <img 
                    src={cat.img} 
                    alt={cat.name} 
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1541591419107-bb5e172d5d7b?q=80&w=300&auto=format&fit=crop';
                      e.target.onerror = null;
                    }}
                  />
                </div>
              </div>
              <h3>{cat.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
