import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, Clock, ChevronDown, ArrowRight, CheckCircle, Calendar, X, Sparkles, ShieldCheck } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { evolutionApi } from '../services/evolutionApi';
import toast from 'react-hot-toast';
import './AgroVetSection.css';

const formatPhone = (phone) => {
  if (!phone) return "";
  let cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) cleaned = cleaned.substring(2);
  if (cleaned.length === 11) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 3)} ${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  if (cleaned.length === 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  return phone;
};

const getWhatsAppLink = (phone) => {
  if (!phone) return "";
  let cleaned = ('' + phone).replace(/\D/g, '');
  return cleaned.startsWith('55') ? `https://wa.me/${cleaned}` : `https://wa.me/55${cleaned}`;
};

// ——— FAQ simples ———
const faqs = [
  { q: 'Preciso agendar para a consulta?', a: 'Sim, recomendamos agendar pelo WhatsApp. Casos urgentes são avaliados na hora conforme disponibilidade.' },
  { q: 'Vocês têm medicamentos com receita veterinária?', a: 'Sim! Dispensamos medicamentos controlados com receituário. Nossa equipe orienta a compra de todos os produtos.' },
  { q: 'Aceitam plano pet?', a: 'Trabalhamos com os principais planos pet da região. Entre em contato para verificar a sua cobertura.' },
  { q: 'Fazem entrega de produtos?', a: 'Sim! Entregamos em Viamão e região. Consulte as condições pelo WhatsApp.' },
];

const FAQItem = ({ faq }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`av-faq-item ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="av-faq-q">
        <span>{faq.q}</span>
        <div className={`av-faq-arrow ${open ? 'rotated' : ''}`}><ChevronDown size={18} /></div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="av-faq-a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <p>{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BookingForm = ({ waLink }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', phone: '', petName: '', petType: 'Cachorro', service: 'Consulta Veterinária', notes: ''
  });
  const [isSending, setIsSending] = useState(false);
  const { addAppointment } = useAppointmentStore();

  const services = ['Consulta Veterinária', 'Vacinação', 'Castração', 'Exame Laboratorial'];
  const petTypes = ['Cachorro', 'Gato', 'Pássaro', 'Peixe', 'Roedor', 'Outro'];

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1 && (!formData.name || !formData.phone)) return toast.error('Preencha nome e WhatsApp!');
    if (step === 2 && (!formData.petName || !formData.service)) return toast.error('Preencha os dados do Pet e o Serviço!');
    setStep(step + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    
    try {
      const message = evolutionApi.formatBookingMessage(formData);
      // Fallback para link direto se a API não estiver configurada ou falhar
      const waUrl = `${waLink}?text=${encodeURIComponent(message)}`;
      
      // 1. Persistência no Supabase para gestão interna
      try {
        await addAppointment(formData);
      } catch (dbError) {
        console.error("Supabase fail, continuing with WhatsApp:", dbError);
        // Continuamos mesmo se o DB falhar para não bloquear o cliente
      }

      // 2. Tentativa de envio via Evolution API se houver configuração
      const result = await evolutionApi.sendText(formData.phone, message);
      
      if (result.success) {
        toast.success('Solicitação enviada! Nossa equipe entrará em contato.');
      } else {
        // Fallback: abrir WhatsApp do cliente
        window.open(waUrl, '_blank');
        toast.success('Abrindo WhatsApp para finalizar agendamento...');
      }
      
      setStep(4); // Passo de sucesso
    } catch {
      toast.error('Erro ao processar agendamento.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="av-booking-card">
      <div className="av-booking-header">
        <Calendar size={20} />
        <h3>Agendamento Rápido</h3>
        <div className="av-step-indicator">Passo {step} de 3</div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form 
            key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="av-form-step" onSubmit={handleNext}
          >
            <p className="av-form-tip">Comece informando como podemos falar com você.</p>
            <div className="av-input-group">
              <label>Seu Nome</label>
              <input type="text" placeholder="Ex: Maria Silva" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="av-input-group">
              <label>WhatsApp</label>
              <input type="tel" placeholder="(51) 99999-9999" required value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <button type="submit" className="av-btn-step-next">Continuar <ArrowRight size={18} /></button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form 
            key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="av-form-step" onSubmit={handleNext}
          >
            <div className="av-input-group">
              <label>Nome do Pet</label>
              <input type="text" placeholder="Ex: Bob, Mel..." required value={formData.petName || ''} onChange={e => setFormData({...formData, petName: e.target.value})} />
            </div>
            <div className="av-input-grid">
              <div className="av-input-group">
                <label>Tipo</label>
                <select value={formData.petType || ''} onChange={e => setFormData({...formData, petType: e.target.value})}>
                  {petTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="av-input-group">
                <label>Serviço</label>
                <select value={formData.service || ''} onChange={e => setFormData({...formData, service: e.target.value})}>
                  {services.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="av-btn-row">
              <button type="button" className="av-btn-back" onClick={() => setStep(1)}>Voltar</button>
              <button type="submit" className="av-btn-step-next">Próximo <ArrowRight size={18} /></button>
            </div>
          </motion.form>
        )}

        {step === 3 && (
          <motion.form 
            key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="av-form-step" onSubmit={handleSubmit}
          >
            <div className="av-input-group">
              <label>Observações (Opcional)</label>
              <textarea placeholder="Conte-nos um pouco sobre a necessidade do seu pet..." value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <div className="av-summary-box">
              <div className="av-summary-item"><span>Pet:</span> <strong>{formData.petName}</strong></div>
              <div className="av-summary-item"><span>Serviço:</span> <strong>{formData.service}</strong></div>
            </div>
            <div className="av-btn-row">
              <button type="button" className="av-btn-back" onClick={() => setStep(2)}>Voltar</button>
              <button type="submit" className="av-btn-submit" disabled={isSending}>
                {isSending ? 'Enviando...' : <><Phone size={18} /> Solicitar Agendamento</>}
              </button>
            </div>
          </motion.form>
        )}

        {step === 4 && (
          <motion.div 
            key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="av-form-success"
          >
            <div className="av-success-icon"><CheckCircle size={48} color="#15803d" /></div>
            <h4>Solicitação Enviada!</h4>
            <p>Nossa equipe técnica entrará em contato em breve para confirmar o horário disponível.</p>
            <button className="av-btn-reset" onClick={() => setStep(1)}>Novo agendamento</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ——— PÁGINA ———
const AgroVetSection = () => {
  const { settings } = useSettingsStore();
  const waLink = getWhatsAppLink(settings.whatsapp);

  return (
    <div className="av-page" id="agro-vet">

      {/* ══════════════════════════════
          HERO — full-bleed assimétrico
      ══════════════════════════════ */}
      <section className="av-hero">
        <div className="av-hero-card">
          {/* coluna texto */}
          <div className="av-hero-text">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >

              <h1>
                Agropets<em>VET</em>
              </h1>

              <p className="av-hero-lead">
                Soluções completas para o campo e para o seu pet: atendimento veterinário especializado, farmácia técnica e as melhores marcas de agropecuária.
              </p>

              <div className="av-hero-facts">
                <div className="av-fact">
                  <span className="av-fact-val">Agropecuária</span>
                  <span className="av-fact-label">insumos e tradição</span>
                </div>
                <div className="av-fact-divider" />
                <div className="av-fact">
                  <span className="av-fact-val">Veterinária</span>
                  <span className="av-fact-label">cuidado especializado</span>
                </div>
                <div className="av-fact-divider" />
                <div className="av-fact">
                  <span className="av-fact-val">Farmácia</span>
                  <span className="av-fact-label">completa e técnica</span>
                </div>
              </div>

              <div className="av-hero-actions">
                <a 
                  href={`${waLink}?text=Olá! Gostaria de iniciar um agendamento no Agro VET.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="av-btn-primary"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Iniciar agendamento
                </a>
                <div className="av-hero-contact">
                  <MapPin size={14} />
                  <span>{settings.address}</span>
                </div>
                <div className="av-hero-contact">
                  <Clock size={14} />
                  <span>Seg e Sex · 8h–19h</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* coluna imagem */}
          <motion.div
            className="av-hero-img-col"
            initial={{ opacity: 0, scale: 1.05 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
          >
            <div className="av-hero-img-wrap">
              <img
                src="/funny-cat-hero-nobg.png"
                alt="Dr. Leo — Diretor Clínico do Agro VET"
              />
              <div className="av-hero-img-badge">
                <ShieldCheck size={16} color="#15803d" />
                <span>CRMV-RS REGISTRADO</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════
          AGENDAMENTO
      ══════════════════════════════ */}
      <section className="av-booking-section" id="agendamento">
        <div className="container av-booking-container">
          <div className="av-booking-intro">
            <span className="av-tag">Atendimento com hora marcada</span>
            <h2>Agende agora a consulta do seu PET</h2>
            <p>Escolha o serviço, informe os dados e receba a confirmação diretamente no seu WhatsApp. Prático, rápido e sem filas.</p>
            
            <div className="av-trust-points">
              <div className="av-trust-item"><CheckCircle size={16} /> Veterinários qualificados</div>
              <div className="av-trust-item"><CheckCircle size={16} /> Atendimento humanizado</div>
              <div className="av-trust-item"><CheckCircle size={16} /> Infraestrutura completa</div>
            </div>
          </div>
          
          <BookingForm waLink={waLink} />
        </div>
      </section>

      {/* ══════════════════════════════
          SERVIÇOS — layout editorial
      ══════════════════════════════ */}
      <section className="av-services" id="sessao-veterinaria">
        <div className="av-services-label">O que fazemos</div>

        {/* Serviço 01 — Consulta */}
        <motion.div
          className="av-service-row"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="av-service-img-col">

            <img
              src="/dog-banana-vet.png"
              alt="Consulta Veterinária - Agropets VET"
              className="av-service-photo"
            />
          </div>
          <div className="av-service-info">
            <span className="av-service-tag" style={{ background: '#dcfce7', color: '#15803d' }}>Veterinário</span>
            <h2 className="av-service-title">Consulta<br />Veterinária</h2>
            <p className="av-service-desc">
              Atendimento veterinário completo para cães, gatos e animais de pequeno porte. Nossa veterinária faz diagnóstico preciso, orientação de tratamento e acompanhamento com muito carinho.
            </p>
            <ul className="av-service-list">
              {['Consultas & retornos', 'Vacinação completa', 'Castração', 'Exames e curativos'].map(i => (
                <li key={i}><CheckCircle size={14} color="#15803d" /> {i}</li>
              ))}
            </ul>
            <div className="av-service-price-tag">Consulta a partir de <strong>R$ 120</strong></div>
            <a href={`${waLink}?text=Olá! Quero agendar uma consulta veterinária.`} target="_blank" rel="noopener noreferrer" className="av-service-cta">
              Agendar consulta <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>

        {/* Serviço 02 — Farmácia */}
        <motion.div
          className="av-service-row reverse"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="av-service-img-col">

            <img
              src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=800&auto=format&fit=crop"
              alt="Farmácia — remédios para pets"
              className="av-service-photo"
            />
          </div>
          <div className="av-service-info">
            <span className="av-service-tag" style={{ background: '#dcfce7', color: '#166534' }}>Farmácia</span>
            <h2 className="av-service-title">Farmácia<br />Veterinária</h2>
            <p className="av-service-desc">
              Linha completa de medicamentos, antiparasitários, suplementos e nutracêuticos com orientação do nosso time técnico. Você sai da consulta e já resolve tudo na mesma visita.
            </p>
            <ul className="av-service-list">
              {['Medicamentos prescritos', 'Antiparasitários', 'Suplementos & nutracêuticos', 'Dermatológicos e xampus'].map(i => (
                <li key={i}><CheckCircle size={14} color="#166534" /> {i}</li>
              ))}
            </ul>
            <div className="av-service-price-tag">Antipulgas a partir de <strong>R$ 29,90</strong></div>
            <a href={`${waLink}?text=Olá! Quero consultar medicamentos na Farmácia Agro VET.`} target="_blank" rel="noopener noreferrer" className="av-service-cta" style={{ '--cta-color': '#166534' }}>
              Consultar disponibilidade <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>

        {/* Serviço 03 — Loja */}
        <motion.div
          className="av-service-row"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="av-service-img-col">

            <img
              src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop"
              alt="Golden Retriever feliz na loja"
              className="av-service-photo"
            />
          </div>
          <div className="av-service-info">
            <span className="av-service-tag" style={{ background: '#fef3c7', color: '#b45309' }}>Loja</span>
            <h2 className="av-service-title">Produtos<br />para o seu PET</h2>
            <p className="av-service-desc">
              Rações premium, petiscos, brinquedos, coleiras e acessórios das melhores marcas. Com entrega em Viamão e região — porque o cuidado começa em casa.
            </p>
            <ul className="av-service-list">
              {['Rações premium (dry, wet & raw)', 'Petiscos & snacks naturais', 'Acessórios, coleiras & caminhas', 'Entrega em Viamão/RS'].map(i => (
                <li key={i}><CheckCircle size={14} color="#b45309" /> {i}</li>
              ))}
            </ul>
            <div className="av-service-price-tag">Rações a partir de <strong>R$ 39,90</strong></div>
            <a href={`${waLink}?text=Olá! Quero ver os produtos da loja Agro VET.`} target="_blank" rel="noopener noreferrer" className="av-service-cta" style={{ '--cta-color': '#b45309' }}>
              Ver produtos disponíveis <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════
          TICKER STRIP
      ══════════════════════════════ */}
      <section className="av-strip">
        <div className="av-strip-track">
          {'Saúde animal com carinho — Viamão/RS — Veterinário · Farmácia · Loja — (51) 9 8624-0794 — Saúde animal com carinho — Viamão/RS — Veterinário · Farmácia · Loja — '.repeat(3)}
        </div>
      </section>

      {/* ══════════════════════════════
          FAQ
      ══════════════════════════════ */}
      <section className="av-faq-section">
        <div className="av-faq-inner">
          <div className="av-faq-left">
            <span className="av-tag">Dúvidas frequentes</span>
            <h2>Alguma pergunta?</h2>
            <p>Se não encontrar o que procura, é só mandar mensagem.</p>
            <a href={`${waLink}?text=Olá! Tenho uma dúvida sobre o Agro VET.`} target="_blank" rel="noopener noreferrer" className="av-btn-outline">
              <Phone size={16} /> Falar pelo WhatsApp
            </a>
          </div>
          <div className="av-faq-right">
            {faqs.map((f, i) => <FAQItem key={i} faq={f} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          CTA FINAL
      ══════════════════════════════ */}
      <section className="av-cta">
        <img
          src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=1200&auto=format&fit=crop"
          alt="Cachorro feliz e saudável"
          className="av-cta-bg"
        />
        <div className="av-cta-overlay" />
        <div className="av-cta-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2>Seu pet merece o melhor.</h2>
            <p>Venha nos visitar ou agende pelo WhatsApp — atendemos com hora marcada.</p>
            <div className="av-cta-row">
              <a href={`${waLink}?text=Olá! Quero agendar pelo Agro VET.`} target="_blank" rel="noopener noreferrer" className="av-btn-white">
                <Phone size={18} /> {formatPhone(settings.whatsapp)}
              </a>
              <div className="av-cta-address">
                <MapPin size={16} />
                <span>{settings.address}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default AgroVetSection;
