import React from 'react';
import { useInventoryStore } from '../../store/inventoryStore';
import { RefreshCw, History } from 'lucide-react';

const InventoryLogs = () => {
  const { logs } = useInventoryStore();

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            <History size={14} /> Auditoria de Estoque
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Rastreabilidade</h1>
          <p>Histórico completo de entradas, saídas e ajustes manuais de estoque.</p>
        </div>
      </div>

      <div className="bento-item" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ padding: '1.25rem' }}>Data & Hora</th>
                <th>Produto</th>
                <th>Operação</th>
                <th>Qtd.</th>
                <th>Motivo / Origem</th>
              </tr>
            </thead>
            <tbody>
              {logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => (
                <tr key={log.id}>
                  <td style={{ padding: '1.25rem', opacity: 0.7, fontSize: '0.85rem' }}>
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--text-h)' }}>{log.productName}</td>
                  <td>
                    <span className={`status-capsule ${log.type === 'entry' ? 'green' : 'orange'}`} style={{ fontWeight: 800, fontSize: '0.7rem' }}>
                      {log.type === 'entry' ? 'ENTRADA' : 'SAÍDA'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 900, fontSize: '1.1rem', color: log.type === 'entry' ? '#15803d' : '#f97316' }}>
                    {log.type === 'entry' ? '+' : '-'}{log.quantity} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>un</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{log.reason}</span>
                       <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Registrado por Sistema</span>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                   <td colSpan="5" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                      <RefreshCw size={40} className="spin" style={{ marginBottom: '1rem' }} />
                      <p>Nenhuma movimentação registrada no histórico.</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryLogs;
