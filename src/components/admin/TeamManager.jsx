import React from 'react';
import { 
  Shield, Edit, Power, Trash2, Users 
} from 'lucide-react';
import { useAdminUserStore } from '../../store/adminUserStore';
import toast from 'react-hot-toast';

const TeamManager = ({ openModal }) => {
  const { adminUsers, deleteAdminUser, toggleUserStatus } = useAdminUserStore();

  const handleDeleteTeam = (id) => {
    if (window.confirm('Excluir este usuário permanentemente? Ele perderá acesso ao painel imediatamente.')) {
      deleteAdminUser(id);
      toast.success('Usuário removido da equipe.');
    }
  };

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            <Shield size={14} /> Segurança & Acesso
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Equipe de Gestão</h1>
          <p>Gerencie quem tem acesso ao painel administrativo e seus respectivos níveis de permissão.</p>
        </div>
        <button className="btn-primary-modern pulse" onClick={() => openModal('team')}>
          <Users size={20} /> Novo Integrante
        </button>
      </div>

      <div className="bento-item" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ padding: '1.25rem' }}>Nome</th>
                <th>E-mail</th>
                <th>Nível de Acesso</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', padding: '1.25rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="user-cell">
                      <img src={`https://ui-avatars.com/api/?name=${u.name}&background=f1f5f9&color=64748b`} alt={u.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                      <span style={{ fontWeight: 800 }}>{u.name}</span>
                    </div>
                  </td>
                  <td><span style={{ opacity: 0.7, fontSize: '0.9rem' }}>{u.email}</span></td>
                  <td>
                    <span className={`tag-category ${u.role === 'admin' ? 'green' : 'gray'}`} style={{ fontWeight: 800, fontSize: '0.7rem' }}>
                      {u.role === 'admin' ? 'Administrador' : 'Editor'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-capsule ${u.status === 'active' ? 'green' : 'gray'}`} style={{ fontWeight: 800, fontSize: '0.7rem' }}>
                      {u.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="action-buttons-modern" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-action-outline edit" onClick={() => openModal('team', u)} title="Editar"><Edit size={14} /></button>
                      <button className="btn-action-outline" onClick={() => toggleUserStatus(u.id)} title={u.status === 'active' ? 'Desativar' : 'Ativar'} style={{ color: u.status === 'active' ? 'var(--accent-orange)' : 'var(--brand-p)' }}><Power size={14} /></button>
                      <button className="btn-action-outline delete" onClick={() => handleDeleteTeam(u.id)} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamManager;
