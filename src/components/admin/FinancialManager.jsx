import React from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2, PieChart 
} from 'lucide-react';
import { useFinancialStore } from '../../store/financialStore';
import toast from 'react-hot-toast';

const FinancialManager = ({ openModal }) => {
  const { transactions, deleteTransaction } = useFinancialStore();

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const balance = income - expense;

  const handleDeleteTransaction = (id) => {
    if (window.confirm('Excluir este lançamento financeiro?')) {
      deleteTransaction(id);
      toast.success('Lançamento removido.');
    }
  };

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            <PieChart size={14} /> Fluxo de Caixa
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Gestão Financeira</h1>
          <p>Controle total de entradas, saídas e saúde financeira da loja.</p>
        </div>
        <button className="btn-primary-modern" onClick={() => openModal('transaction')}>
          <Plus size={18} /> Lançar Despesa/Receita
        </button>
      </div>

      <div className="financial-stats-grid">
        <div className="bento-item financial-card income" style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
          <div className="icon-circle" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Entradas</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#064e3b' }}>R$ {income.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
        <div className="bento-item financial-card expense" style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
          <div className="icon-circle" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Saídas</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7f1d1d' }}>R$ {expense.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
        <div className={`bento-item financial-card balance ${balance >= 0 ? 'positive' : 'negative'}`} style={{ background: balance >= 0 ? 'var(--brand-p)' : '#b91c1c', border: 'none', color: 'white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div className="icon-circle" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase' }}>Saldo Líquido</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 900 }}>R$ {balance.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
      </div>

      <div className="bento-item" style={{ padding: '0', marginTop: '2rem', overflow: 'hidden' }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ padding: '1.25rem' }}>Data</th>
                <th>Descrição</th>
                <th className="hide-mobile">Categoria</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'right', padding: '1.25rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
                <tr key={t.id}>
                  <td style={{ padding: '1.25rem', opacity: 0.7 }}>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t.description}</td>
                  <td className="hide-mobile"><span className="tag-category green" style={{ fontWeight: 800, fontSize: '0.7rem' }}>{t.category || 'Geral'}</span></td>
                  <td>
                    <span className={`status-capsule ${t.type === 'income' ? 'green' : 'orange'}`} style={{ fontWeight: 800, fontSize: '0.7rem', padding: '4px 10px' }}>
                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', color: t.type === 'income' ? '#15803d' : '#b91c1c' }}>
                    R$ {Number(t.amount || 0).toFixed(2).replace('.', ',')}
                  </td>
                  <td style={{ textAlign: 'right', padding: '1.25rem' }}>
                    <div className="action-buttons-modern" style={{ justifyContent: 'flex-end' }}>
                       <button className="btn-action-outline delete" onClick={() => handleDeleteTransaction(t.id)} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>Sem transações registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialManager;
