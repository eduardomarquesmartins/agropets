import React from 'react';
import { Instagram, Facebook, Mail, MapPin, Phone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import './Footer.css';

const formatPhone = (phone) => {
  if (!phone) return "";
  let cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 3)} ${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  return phone;
};

const getWhatsAppLink = (phone) => {
  if (!phone) return "";
  let cleaned = ('' + phone).replace(/\D/g, '');
  return cleaned.startsWith('55') ? `https://wa.me/${cleaned}` : `https://wa.me/55${cleaned}`;
};

const Footer = () => {
  const location = useLocation();
  const { settings } = useSettingsStore();
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <footer className="footer">
      <div className="container footer-top">
        <div className="footer-col">
          <h3>Sobre a {settings.storeName}</h3>
          <p>{settings.footerText}</p>
          <div className="social-links">
            <a href="https://www.instagram.com/agropetscao/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={20} /></a>
            <a href="https://www.facebook.com/people/agropetscao/100086957164236/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={20} /></a>
            <a href={getWhatsAppLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>
        </div>
        
        <div className="footer-col">
          <h3>Institucional</h3>
          <div className="footer-links">
            <Link to="/sobre">Quem Somos</Link>
            <Link to="/politica-de-privacidade">Política de Privacidade</Link>
            <Link to="/trocas-e-devolucoes">Política de Troca</Link>
          </div>
        </div>
        
        <div className="footer-col">
          <h3>Atendimento</h3>
          <div className="footer-links">
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}><Phone size={16}/> {formatPhone(settings.whatsapp)}</div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}><Mail size={16}/> {settings.email}</div>
            <Link to="/faq">Perguntas Frequentes</Link>
            <Link to="/fale-conosco">Fale Conosco</Link>
          </div>
        </div>
        
      </div>
      <div className="container" style={{ textAlign: 'center', padding: '1.5rem 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
        <p>&copy; {new Date().getFullYear()} {settings.storeName} - Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
