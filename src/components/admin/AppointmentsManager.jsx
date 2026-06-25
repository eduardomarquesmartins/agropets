import React from 'react';
import { 
  Plus, Calendar, Trash2, Edit
} from 'lucide-react';
import CalendarPicker from '../CalendarPicker';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useCustomerStore } from '../../store/customerStore';
import { usePetStore } from '../../store/petStore';

const AppointmentsManager = ({ selectedDate, setSelectedDate, openModal }) => {
  const { appointments, deleteAppointment, updateAppointment } = useAppointmentStore();
  const { customers } = useCustomerStore();
  const { pets } = usePetStore();

  const statusColors = {
    'scheduled': 'orange',
    'in-progress': 'green',
    'completed': 'green',
    'cancelled': 'gray'
  };

  const filteredAppointments = appointments.filter(app => {
    const appDate = app.date || (app.dateTime ? app.dateTime.split('T')[0] : '');
    return appDate === selectedDate;
  });

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            <Calendar size={14} /> Atendimento Clínico
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Agenda de Serviços</h1>
          <p>Controle de Consultas e Atendimentos Veterinários. <strong style={{ color: '#f59e0b' }}>Atendimento: Segundas e Sextas-feiras.</strong></p>
        </div>
        <button className="btn-primary-modern pulse" onClick={() => openModal('appointment')}>
          <Plus size={18} /> Novo Agendamento
        </button>
      </div>

      <div className="admin-agenda-container">
        <aside className="admin-agenda-sidebar">
          <CalendarPicker 
            appointments={appointments} 
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate}
            allowedWeekdays={[1, 5]}
          />
          
          <div className="agenda-day-summary bento-item" style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem', fontWeight: 800 }}>RESUMO DO DIA</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Total:</span>
              <strong style={{ color: 'var(--brand-p)' }}>{filteredAppointments.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Pendentes:</span>
              <strong style={{ color: 'var(--accent-orange)' }}>{filteredAppointments.filter(a => a.status !== 'completed').length}</strong>
            </div>
          </div>
        </aside>

        <div className="admin-agenda-main bento-item" style={{ padding: '0' }}>
          <div className="selected-date-title" style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
             <h3 style={{ margin: 0, fontWeight: 800 }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ padding: '1.25rem' }}>Hora</th>
                  <th>Cliente / Pet</th>
                  <th>Serviço</th>
                  <th className="hide-mobile">Profissional</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', padding: '1.25rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.sort((a,b) => (a.time || '').localeCompare(b.time || '')).map(app => {
                  const customer = customers.find(c => c.id === app.customerId);
                  const pet = pets.find(p => p.id === app.petId);
                  return (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 800, padding: '1.25rem', color: 'var(--brand-p)' }}>
                        {app.time || (app.dateTime ? app.dateTime.split('T')[1].substring(0, 5) : '--:--')}
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="product-names">
                            <span className="p-name" style={{ fontWeight: 800 }}>{app.customerId === 'external' ? app.customCustomerName : (customer?.name || 'Cliente Externo')}</span>
                            <span className="p-sku" style={{ fontSize: '0.75rem' }}>{app.customerId === 'external' ? app.customPetName : (pet?.name || 'Pet não identificado')}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="tag-category green" style={{ fontWeight: 800, fontSize: '0.7rem' }}>{app.serviceType || app.service}</span></td>
                      <td className="hide-mobile" style={{ opacity: 0.8 }}>{app.professional}</td>
                      <td>
                        <select 
                          className={`status-capsule ${statusColors[app.status]}`}
                          value={app.status}
                          onChange={(e) => updateAppointment(app.id, { status: e.target.value })}
                          style={{ border: 'none', cursor: 'pointer', outline: 'none', fontWeight: 800, padding: '6px 12px', borderRadius: '100px' }}
                        >
                          <option value="scheduled">Agendado</option>
                          <option value="in-progress">Em Andamento</option>
                          <option value="completed">Finalizado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div className="action-buttons-modern">
                          <button className="btn-action-outline edit" onClick={() => openModal('appointment', app)} title="Editar"><Edit size={14} /></button>
                          <button className="btn-action-outline delete" onClick={() => { if(confirm('Excluir agendamento?')) deleteAppointment(app.id); }} title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Calendar size={48} />
                        <p style={{ fontWeight: 700 }}>Nenhum agendamento para este dia.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsManager;
