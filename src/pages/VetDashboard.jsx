import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  ClipboardList, 
  LogOut, 
  Plus, 
  Search, 
  X, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Star,
  Edit,
  Stethoscope,
  Menu,
  Bell,
  Trash2,
  Printer,
  ChevronRight,
  Activity,
  Award,
  FilePlus,
  RefreshCw,
  LayoutGrid,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { useCustomerStore } from '../store/customerStore';
import { usePetStore } from '../store/petStore';
import { useSettingsStore } from '../store/settingsStore';
import { useMedicalRecordStore } from '../store/medicalRecordStore';
import { emailService } from '../services/emailService';
import toast from 'react-hot-toast';
import CalendarPicker from '../components/CalendarPicker';
import './VetDashboard.css';

const VetDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuthStore();
  const { appointments, fetchAppointments, addAppointment, deleteAppointment } = useAppointmentStore();
  const { customers } = useCustomerStore();
  const { pets } = usePetStore();
  const { settings } = useSettingsStore();
  const { records, addRecord } = useMedicalRecordStore();

  const [activeTab, setActiveTab] = useState('inicio');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); // appointment, patient, prescription, medicalRecord
  const [selectedPet, setSelectedPet] = useState(null);
  
  const [medicalForm, setMedicalForm] = useState({ symptoms: '', diagnosis: '', weight: '', temperature: '' });
  const [prescriptionContent, setPrescriptionContent] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: ''
  });
  const [appointmentForm, setAppointmentForm] = useState({ 
    customerName: '', 
    petName: '', 
    petType: 'Cachorro',
    breed: '',
    phone: '',
    service: 'Consulta Veterinária', 
    observations: '',
    time: '09:00', 
    date: new Date().toLocaleDateString('sv-SE') 
  });

  useEffect(() => {
    if (!user || user.role !== 'vet') {
      navigate('/login');
    }
    fetchAppointments();
  }, [user, navigate, fetchAppointments]);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Desconectado com sucesso!');
  };

  if (!user) return null;

  // --- Handlers ---
  const openModal = (mode, data = null) => {
    setModalMode(mode);
    setSelectedPet(data);
    
    if (mode === 'medicalRecord' && data) {
       setMedicalForm({ symptoms: '', diagnosis: '', weight: '', temperature: '' });
    }
    
    setIsModalOpen(true);
  };

  const handleMedicalSubmit = (e) => {
    e.preventDefault();
    if (!selectedPet) return;
    
    // Busca o petId real se o objeto for um agendamento recém-criado sem vínculo
    let realPetId = selectedPet.petId || selectedPet.id; 
    
    // Se selecionamos a partir de um agendamento sem petId, tentamos achar o pet pelo nome
    if (!selectedPet.petId && selectedPet.petName) {
      const foundPet = pets.find(p => p.name.toLowerCase() === selectedPet.petName.toLowerCase());
      if (foundPet) realPetId = foundPet.id;
    }

    addRecord({
      petId: realPetId,
      petName: selectedPet.name || selectedPet.petName,
      ...medicalForm
    });
    toast.success('Prontuário atualizado!');
    setIsModalOpen(false);
  };

  const handleAppointmentSubmit = (e) => {
    e.preventDefault();
    // Validar se a data escolhida é segunda (1) ou sexta (5)
    const chosenDate = new Date(appointmentForm.date + 'T12:00:00');
    const weekday = chosenDate.getDay();
    if (weekday !== 1 && weekday !== 5) {
      toast.error('A veterinária atende somente às Segundas e Sextas-feiras!');
      return;
    }
    addAppointment({ ...appointmentForm, status: 'Confirmado' });
    toast.success('Agendamento realizado!');
    setIsModalOpen(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileForm);
      toast.success('Perfil atualizado com sucesso!');
      setIsModalOpen(false);
    } catch {
      toast.error('Erro ao atualizar perfil.');
    }
  };

  const handlePrescriptionPrint = () => {
    window.print();
  };

  const handleNotify = async (app) => {
    if (!app.email) {
      toast.error('E-mail do tutor não cadastrado.');
      return;
    }
    
    const loadingToast = toast.loading('Enviando lembrete...');
    try {
      await emailService.sendAppointmentReminder(app, { name: app.customerName || app.ownerName, email: app.email });
      toast.success('Lembrete enviado com sucesso!', { id: loadingToast });
    } catch {
      toast.error('Erro ao enviar lembrete.', { id: loadingToast });
    }
  };

  // --- Renderers ---
  const renderOverview = () => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const todayAppointments = appointments.filter(a => {
       const aDate = a.date || (a.dateTime ? a.dateTime.split('T')[0] : '');
       return aDate === todayStr;
    }).length;
    const pendingRecordsCount = appointments.filter(a => a.status !== 'Concluído').length;

    return (
      <div className="vet-content fade-in">
        <div className="vet-intro">
           <h1>Painel Geral</h1>
           <p>Olá, {(user.name || 'Usuário').split(' ')[0]}. Aqui está o resumo de hoje.</p>
        </div>

        <div className="vet-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
           <div className="stat-card-mini" style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', color: 'white' }}>
              <Calendar size={24} style={{ marginBottom: '12px', opacity: 0.8 }} />
              <span className="s-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Hoje</span>
              <span className="s-value" style={{ color: 'white' }}>{todayAppointments}</span>
           </div>
           <div className="stat-card-mini" style={{ borderLeft: '4px solid #f59e0b' }}>
              <Stethoscope size={24} color="#f59e0b" style={{ marginBottom: '12px' }} />
              <span className="s-label">Pendentes</span>
              <span className="s-value">{pendingRecordsCount}</span>
           </div>
           <div className="stat-card-mini" style={{ borderLeft: '4px solid #22c55e' }}>
              <Users size={24} color="#22c55e" style={{ marginBottom: '12px' }} />
              <span className="s-label">Pacientes</span>
              <span className="s-value">{pets.length}</span>
           </div>
           <div className="stat-card-mini" style={{ borderLeft: '4px solid #10b981' }}>
              <FilePlus size={24} color="#10b981" style={{ marginBottom: '12px' }} />
              <span className="s-label">Receitas</span>
              <span className="s-value">{records.length}</span>
           </div>
        </div>

        <div className="vet-two-cols" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
           <div className="vet-recent-activity bento-item" style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}><Activity size={20} color="#15803d" /> Próximos Atendimentos</h3>
              <div className="mini-agenda-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {appointments.slice(0, 4).map(app => (
                   <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <div style={{ width: '40px', height: '40px', background: '#dcfce7', color: '#15803d', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{app.time?.charAt(0) || '0'}</div>
                         <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{app.petName}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{app.service}</div>
                         </div>
                      </div>
                      <button onClick={() => setActiveTab('agenda')} style={{ border: 'none', background: 'transparent', color: '#15803d', cursor: 'pointer' }}><ChevronRight size={18} /></button>
                   </div>
                 ))}
              </div>
           </div>

           <div className="vet-quick-tools bento-item" style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Acesso Rápido</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                 <button className="btn-vet-primary" onClick={() => openModal('appointment')} style={{ width: '100%', justifyContent: 'flex-start' }}><Plus size={18} /> Novo Agendamento</button>
                 <button className="btn-vet-primary" onClick={() => setActiveTab('pacientes')} style={{ width: '100%', justifyContent: 'flex-start', background: '#f8fafc', color: '#1e293b', boxShadow: 'none', border: '1px solid #e2e8f0' }}><Users size={18} /> Ver Pacientes</button>
                 <button className="btn-vet-primary" onClick={() => setActiveTab('prontuarios')} style={{ width: '100%', justifyContent: 'flex-start', background: '#f8fafc', color: '#1e293b', boxShadow: 'none', border: '1px solid #e2e8f0' }}><FileText size={18} /> Histórico Clínico</button>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderAgenda = () => {
    const filteredAppointments = appointments.filter(app => {
      const appDate = app.date || (app.dateTime ? app.dateTime.split('T')[0] : '');
      return appDate === selectedDate;
    });

    return (
      <div className="vet-content fade-in">
        <div className="vet-intro">
          <div>
            <h1>Minha Agenda</h1>
            <p>Confira seus atendimentos marcados.</p>
          </div>
          <button className="btn-vet-primary" onClick={() => openModal('appointment')}>
            <Plus size={18} /> Novo Agendamento
          </button>
        </div>

        <div className="vet-agenda-layout">
          <aside className="agenda-sidebar-calendar">
            <CalendarPicker 
              appointments={appointments} 
              selectedDate={selectedDate} 
              onDateSelect={setSelectedDate}
              allowedWeekdays={[1, 5]}
            />
            
            <div className="agenda-stats-mini">
              <div className="stat-card-mini">
                <span className="s-label">Total do Dia</span>
                <span className="s-value">{filteredAppointments.length}</span>
              </div>
              <div className="stat-card-mini">
                <span className="s-label">Pendentes</span>
                <span className="s-value">{filteredAppointments.filter(a => a.status !== 'Concluído').length}</span>
              </div>
            </div>
          </aside>

          <div className="vet-grid-agenda">
            <div className="selected-date-header">
              <h3>{new Date(selectedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            </div>
            {filteredAppointments.length > 0 ? (
              filteredAppointments.sort((a,b) => (a.time || '00:00').localeCompare(b.time || '00:00')).map(app => (
                <div key={app.id} className="vet-card-appointment">
                  <div className="app-time">
                    <Clock size={16} />
                    <span>{app.time || (app.dateTime ? app.dateTime.split('T')[1].substring(0, 5) : '08:00')}</span>
                  </div>
                  <div className="app-info">
                    <h3>{app.petName}</h3>
                    <p>{app.customerName || app.ownerName} • {app.service}</p>
                    {app.notes && <div className="app-notes">{app.notes}</div>}
                  </div>
                  <div className="app-status">
                     <span className={`status-tag ${app.status?.toLowerCase() || 'pending'}`}>
                       {app.status || 'Pendente'}
                     </span>
                  </div>
                  <div className="app-actions">
                    <button title="Enviar Lembrete" onClick={() => handleNotify(app)} className="btn-notify"><Bell size={18} /></button>
                    <button title="Atendimento Clínico" onClick={() => openModal('medicalRecord', app)} className="btn-medical"><Stethoscope size={18} /></button>
                    <button title="Emitir Receita" onClick={() => openModal('prescription', app)} className="btn-prescription"><FilePlus size={18} /></button>
                    <button title="Excluir Agendamento" onClick={() => deleteAppointment(app.id)} className="btn-delete"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Calendar size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                <p>Nenhum agendamento para esta data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPatients = () => (
    <div className="vet-content fade-in">
      <div className="vet-intro">
        <div>
          <h1>Pacientes</h1>
          <p>Base de dados de pets e tutores.</p>
        </div>
        <div className="vet-search">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por pet ou tutor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="vet-table-wrapper">
        <table className="vet-table">
          <thead>
            <tr>
              <th>Pet</th>
              <th>Tutor</th>
              <th>Raça/Tipo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pets.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(pet => {
              const customer = customers.find(c => c.id === pet.customerId);
              return (
                <tr key={pet.id}>
                  <td>
                    <div className="pet-cell">
                      <div className="pet-avatar">{pet.name[0]}</div>
                      <strong>{pet.name}</strong>
                    </div>
                  </td>
                  <td>{customer?.name || 'Não vinculado'}</td>
                  <td>{pet.breed} ({pet.type})</td>
                  <td>
                    <div className="vet-actions-row">
                      <button className="btn-icon" onClick={() => openModal('patientHistory', pet)} title="Ver Histórico"><Activity size={16} /></button>
                      <button className="btn-icon" onClick={() => openModal('medicalRecord', pet)} title="Novo Prontuário"><FileText size={16} /></button>
                      <button className="btn-icon" onClick={() => openModal('prescription', pet)} title="Receita"><ClipboardList size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderModal = () => (
    <div className="modal-overlay vet-modal scroll-modal">
      <div className={`modal-content ${modalMode === 'prescription' ? 'prescription-modal-premium' : ''}`}>
        <div className="modal-header no-print">
          <h2>
            {modalMode === 'medicalRecord' && `Prontuário: ${selectedPet?.name || selectedPet?.petName}`}
            {modalMode === 'patientHistory' && `Histórico Clínico: ${selectedPet?.name || selectedPet?.petName}`}
            {modalMode === 'prescription' && `Emitir Receituário`}
            {modalMode === 'appointment' && 'Novo Agendamento'}
            {modalMode === 'settings' && 'Opções do Perfil'}
          </h2>
          <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
        </div>

        <div className="modal-body" style={{ padding: '0' }}>
          {modalMode === 'medicalRecord' && (
            <div style={{ padding: '2rem' }}>
              <form onSubmit={handleMedicalSubmit} className="vet-form">
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group-vet">
                    <label>Peso (kg)</label>
                    <input type="text" placeholder="0.00" value={medicalForm.weight} onChange={e => setMedicalForm({...medicalForm, weight: e.target.value})} />
                  </div>
                  <div className="form-group-vet">
                    <label>Temp. (°C)</label>
                    <input type="text" placeholder="38.5" value={medicalForm.temperature} onChange={e => setMedicalForm({...medicalForm, temperature: e.target.value})} />
                  </div>
                </div>
                <div className="form-group-vet" style={{ marginBottom: '1.5rem' }}>
                  <label>Sintomas / Queixa</label>
                  <textarea rows="3" placeholder="O que o pet está sentindo?" value={medicalForm.symptoms} onChange={e => setMedicalForm({...medicalForm, symptoms: e.target.value})} />
                </div>
                <div className="form-group-vet" style={{ marginBottom: '2rem' }}>
                  <label>Diagnóstico / Conduta</label>
                  <textarea rows="4" placeholder="Qual o diagnóstico e próximos passos?" value={medicalForm.diagnosis} onChange={e => setMedicalForm({...medicalForm, diagnosis: e.target.value})} />
                </div>
                <button type="submit" className="btn-vet-primary full">Salvar no Prontuário</button>
              </form>
            </div>
          )}

          {modalMode === 'patientHistory' && (
            <div style={{ padding: '2rem' }}>
               {(() => {
                 const petRecords = records.filter(r => r.petId === selectedPet?.id).sort((a,b) => new Date(b.date) - new Date(a.date));
                 if (petRecords.length === 0) return <div className="empty-state">Este paciente ainda não possui histórico clínico registrado.</div>;
                 return (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {petRecords.map(r => (
                        <div key={r.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.8rem' }}>
                             <strong style={{ fontSize: '1.1rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} /> {new Date(r.date).toLocaleDateString('pt-BR')}</strong>
                             <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{r.weight && `Peso: ${r.weight}kg`} {((r.weight && r.temperature) ? ' | ' : '')} {r.temperature && `Temp: ${r.temperature}°C`}</span>
                          </div>
                          <div style={{ marginBottom: '1.2rem' }}>
                             <strong style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '5px' }}>SINTOMAS / QUEIXAS:</strong>
                             <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>{r.symptoms || 'Não informado.'}</p>
                          </div>
                          <div>
                             <strong style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '5px' }}>DIAGNÓSTICO / CONDUTA:</strong>
                             <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>{r.diagnosis || 'Não informado.'}</p>
                          </div>
                        </div>
                      ))}
                   </div>
                 );
               })()}
            </div>
          )}

          {modalMode === 'prescription' && (
            <div className="prescription-simple-editor">
              <div className="editor-top-info">
                <div className="patient-tag">
                  <strong>Paciente:</strong> {selectedPet?.name || selectedPet?.petName}
                </div>
                <div className="tutor-tag">
                  <strong>Tutor:</strong> {selectedPet?.customerName || selectedPet?.ownerName || '---'}
                </div>
              </div>

              <div className="presc-form-group">
                <label>Prescrição Médica (Medicamentos, Doses e Orientações)</label>
                <textarea 
                  rows="18" 
                  className="presc-main-textarea"
                  placeholder="Ex:
1. Amoxicilina 500mg - 1 comprimido VO a cada 12h por 10 dias.
2. Limpeza local com soro fisiológico 2x ao dia."
                  value={prescriptionContent}
                  onChange={e => setPrescriptionContent(e.target.value)}
                />
              </div>

              <div className="presc-actions">
                <button onClick={handlePrescriptionPrint} className="btn-vet-primary large-btn"><Printer size={20} /> Gerar PDF / Imprimir Receita</button>
              </div>

              {/* O PAPEL CONTINUA EXISTINDO SÓ PARA IMPRESSÃO (INVISÍVEL NA TELA) */}
              <div className="prescription-print-template print-only" style={{ padding: '0', background: 'white' }}>
                 <div className="presc-paper-styled" style={{ padding: '1.5cm', border: '1px solid #eee', minHeight: '27cm', display: 'flex', flexDirection: 'column' }}>
                    <div className="presc-top-header" style={{ display: 'flex', gap: '30px', borderBottom: '4px solid #15803d', paddingBottom: '20px', marginBottom: '30px', alignItems: 'center' }}>
                       <img src={settings.logo || '/agropetssemfundo.png'} alt="Logo" style={{ width: '130px', height: '130px', objectFit: 'contain' }} />
                       <div style={{ flex: 1 }}>
                          <h1 style={{ margin: 0, color: '#15803d', fontSize: '2.2rem', fontWeight: 900 }}>{settings.storeName || 'Agropets'}</h1>
                          <p style={{ margin: '5px 0', fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>{settings.description || 'ATENDIMENTO VETERINÁRIO'}</p>
                          <div style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '10px' }}>
                             <p style={{ margin: 0 }}>📍 {settings.address}</p>
                             <p style={{ margin: 0 }}>📞 WhatsApp: {settings.whatsapp} | {settings.email || 'contato@agropets.com'}</p>
                          </div>
                       </div>
                    </div>


                    <div style={{ background: '#f1f5f9', padding: '25px', borderRadius: '15px', border: '1px solid #cbd5e1', marginBottom: '45px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                       <div>
                          <p style={{ margin: 0, fontSize: '1.4rem', color: '#15803d', fontWeight: 900 }}>{selectedPet?.name || selectedPet?.petName}</p>
                          <p style={{ margin: '5px 0 0', fontSize: '1rem' }}>Espécie/Raça: {selectedPet?.breed || 'Canina / SDR'}</p>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Tutor: {selectedPet?.customerName || selectedPet?.ownerName || '---'}</p>
                          <p style={{ margin: '5px 0 0', fontSize: '1rem' }}>Data: {new Date().toLocaleDateString('pt-BR')}</p>
                       </div>
                    </div>

                    <div style={{ flex: 1, padding: '0 10px' }}>
                       <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '30px', color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>USO TERAPÊUTICO:</h3>
                       <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: '1.35rem', lineHeight: '2.2', color: '#1e293b' }}>
                          {prescriptionContent || 'Nenhuma medicação prescrita.'}
                       </pre>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '10px' }}>
                        <div style={{ width: '300px', height: '1px', background: '#0f172a', marginBottom: '8px' }}></div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', textAlign: 'right' }}>{(user.name || 'Veterinário').toUpperCase().includes('DRA.') ? (user.name || 'Veterinário').toUpperCase() : `DRA. ${(user.name || 'Veterinário').toUpperCase()}`}</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', fontWeight: 600, textAlign: 'right' }}>MÉDICA VETERINÁRIA</p>
                    </div>
                </div>
              </div>
            </div>
          )}

          {modalMode === 'appointment' && (
            <div style={{ padding: '2rem' }}>
              <form onSubmit={handleAppointmentSubmit} className="vet-form">
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group-vet"><label>Nome do Pet</label><input type="text" required value={appointmentForm.petName} onChange={e => setAppointmentForm({...appointmentForm, petName: e.target.value})} /></div>
                  <div className="form-group-vet">
                    <label>Tipo de Animal</label>
                    <select value={appointmentForm.petType} onChange={e => setAppointmentForm({...appointmentForm, petType: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <option value="Cachorro">Cachorro</option>
                      <option value="Gato">Gato</option>
                      <option value="Pássaro">Pássaro</option>
                      <option value="Peixe">Peixe</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group-vet"><label>Nome do Tutor</label><input type="text" required value={appointmentForm.customerName} onChange={e => setAppointmentForm({...appointmentForm, customerName: e.target.value})} /></div>
                  <div className="form-group-vet"><label>WhatsApp</label><input type="tel" placeholder="(51) 9...." value={appointmentForm.phone} onChange={e => setAppointmentForm({...appointmentForm, phone: e.target.value})} /></div>
                </div>

                <div className="form-group-vet" style={{ marginBottom: '1rem' }}>
                  <label>Serviço</label>
                  <select value={appointmentForm.service} onChange={e => setAppointmentForm({...appointmentForm, service: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <option value="Consulta Veterinária">Consulta Veterinária</option>
                      <option value="Vacinação">Vacinação / Reforço</option>
                      <option value="Castração">Castração</option>
                      <option value="Limpeza de Tártaro">Limpeza de Tártaro</option>
                      <option value="Exame de Sangue">Exame de Sangue</option>
                      <option value="Urgência">Urgência / Emergência</option>
                  </select>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group-vet">
                    <label>Data <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>(Seg. e Sex. apenas)</span></label>
                    <input 
                      type="date" 
                      required 
                      value={appointmentForm.date} 
                      onChange={e => setAppointmentForm({...appointmentForm, date: e.target.value})} 
                    />
                  </div>
                  <div className="form-group-vet"><label>Hora</label><input type="time" required value={appointmentForm.time} onChange={e => setAppointmentForm({...appointmentForm, time: e.target.value})} /></div>
                </div>

                <div className="form-group-vet" style={{ marginBottom: '2rem' }}>
                  <label>Observações / Veterinária</label>
                  <textarea 
                      value={appointmentForm.observations} 
                      onChange={e => setAppointmentForm({...appointmentForm, observations: e.target.value})} 
                      placeholder="Ex: Alérgico a iodo, animal agitado..."
                      style={{ minHeight: '80px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                  />
                </div>
                <button type="submit" className="btn-vet-primary full">Confirmar Agendamento</button>
              </form>
            </div>
          )}

          {modalMode === 'settings' && (
            <div style={{ padding: '2rem' }}>
              <form onSubmit={handleProfileSubmit} className="vet-form">
                <div className="form-group-vet" style={{ marginBottom: '1rem' }}>
                  <label>Nome Completo / Como aparece no receituário</label>
                  <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                </div>
                <div className="form-group-vet" style={{ marginBottom: '1rem' }}>
                  <label>Login / E-mail</label>
                  <input type="email" required value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                </div>
                    <div className="form-group-vet" style={{ marginBottom: '1.5rem' }}>
                      <label>Nova Senha (deixe em branco para não alterar)</label>
                      <div className="password-input-wrapper" style={{ position: 'relative' }}>
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={profileForm.password} 
                          onChange={e => setProfileForm({...profileForm, password: e.target.value})} 
                          style={{ paddingRight: '45px' }}
                        />
                        <button 
                          type="button" 
                          className="password-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'none',
                            color: '#64748b',
                            cursor: 'pointer'
                          }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                <button type="submit" className="btn-vet-primary full">Salvar Alterações</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="vet-layout">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`vet-sidebar no-print ${isSidebarOpen ? 'open' : ''}`}>
        <div className="vet-brand">
          <div className="brand-info">
             <span className="b-name">Agropets Vet</span>
             <span className="b-role">Painel Médico</span>
          </div>
        </div>

        <nav className="vet-nav">
          <button className={activeTab === 'inicio' ? 'active' : ''} onClick={() => { setActiveTab('inicio'); setIsSidebarOpen(false); }}>
            <LayoutGrid size={20} /> <span>Início</span>
          </button>
          <button className={activeTab === 'agenda' ? 'active' : ''} onClick={() => { setActiveTab('agenda'); setIsSidebarOpen(false); }}>
            <Calendar size={20} /> <span>Agenda</span>
          </button>
          <button className={activeTab === 'pacientes' ? 'active' : ''} onClick={() => { setActiveTab('pacientes'); setIsSidebarOpen(false); }}>
            <Users size={20} /> <span>Pacientes</span>
          </button>
          <button className={activeTab === 'prontuarios' ? 'active' : ''} onClick={() => { setActiveTab('prontuarios'); setIsSidebarOpen(false); }}>
            <FileText size={20} /> <span>Prontuários</span>
          </button>
          <button onClick={() => openModal('settings')}>
            <Settings size={20} /> <span>Opções do Perfil</span>
          </button>
        </nav>

        <div className="vet-sidebar-bottom">
           <div className="vet-user-card">
              <img src={`https://ui-avatars.com/api/?name=${user.name || 'Veterinário'}&background=15803d&color=fff`} alt="" />
              <div className="u-info">
                <strong>{user.name}</strong>
                <span>Veterinária</span>
              </div>
           </div>
           <button className="btn-logout" onClick={handleLogout}>
             <LogOut size={18} /> Sair
           </button>
        </div>
      </aside>

      <main className="vet-main">
        <header className="vet-header no-print">
           <div className="header-left">
              <button className="btn-mobile-menu" onClick={() => setIsSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <LayoutDashboard size={20} />
              <span>Atendimento Veterinário</span>
           </div>
           <div className="header-right">
              <span className="date-str">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
           </div>
        </header>

        <section className="vet-page">
          {activeTab === 'inicio' && renderOverview()}
          {activeTab === 'agenda' && renderAgenda()}
          {activeTab === 'pacientes' && renderPatients()}
          {activeTab === 'prontuarios' && (
            <div className="vet-content fade-in">
              <h1>Prontuários Recentes</h1>
              <div className="vet-grid-agenda">
                {records.map(r => (
                  <div key={r.id} className="vet-card-appointment">
                    <div className="app-time"><Calendar size={16} /> <span>{new Date(r.date).toLocaleDateString()}</span></div>
                    <h3>{r.petName}</h3>
                    <p style={{ fontSize: '0.85rem' }}><strong>Diagnóstico:</strong> {r.diagnosis}</p>
                    <div className="app-notes"><strong>Sintomas:</strong> {r.symptoms}</div>
                    {r.weight && <div style={{ fontSize: '0.75rem', marginTop: '10px', opacity: 0.6 }}>Peso: {r.weight}kg | Temperatura: {r.temperature}°C</div>}
                  </div>
                ))}
                {records.length === 0 && <div className="empty-state">Nenhum registro clínico ainda.</div>}
              </div>
            </div>
          )}
        </section>
      </main>

      {isModalOpen && renderModal()}
    </div>
  );
};

export default VetDashboard;
