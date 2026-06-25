
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  ShieldCheck, HelpCircle, Info, MapPin, 
  RefreshCw, MessageCircle, ChevronRight,
  Target, Heart, Star, Phone, Mail, Clock
} from 'lucide-react';
import './Institutional.jsx.css';

const Institutional = () => {
  const location = useLocation();
  const path = location.pathname;

  const renderContent = () => {
    switch (path) {
      case '/sobre':
        return (
          <div className="inst-content fade-in">
            <h1 className="inst-title"><Info size={32} /> Quem Somos</h1>
            <div className="inst-hero-section">
              <div className="inst-hero-content">
                <img src="/agropetssemfundo.png" alt="Agropets Logo" className="inst-logo-large" />
                <h2 className="inst-hero-tagline">Muito mais que um pet shop</h2>
                <p className="inst-subtitle">Sua parceira completa: agropecuária, pet shop e atendimento veterinário em um só lugar.</p>
              </div>
            </div>
            <div className="inst-grid">
              <div className="inst-card">
                <Target size={24} className="accent-icon" />
                <h3>Nossa Missão</h3>
                <p>Impulsionar a força local e garantir a saúde animal através de uma gama de produtos premium e serviços de excelência.</p>
              </div>
              <div className="inst-card">
                <Heart size={24} className="accent-icon" />
                <h3>Nossos Valores</h3>
                <p>Compromisso com o bem-estar animal, ética no campo, inovação constante e atendimento personalizado que entende a rotina do tutor.</p>
              </div>
              <div className="inst-card">
                <Star size={24} className="accent-icon" />
                <h3>Nossa Visão</h3>
                <p>Ser o principal agropecuário e veterinário de Viamão e região, conectando o cuidado doméstico à produtividade rural.</p>
              </div>
            </div>
            <p className="inst-text">
              Com raízes profundas em Viamão/RS, a Agropets consolidou-se como uma agropecuária de referência, unindo a tradição e modernidade dos melhores cuidados pet. Nossa estrutura integra uma loja completa com insumos agrícolas, rações de alta de qualidade, acessórios premium e atendimento veterinário preparado para todas as necessidades do seu melhor amigo e da sua produção.
            </p>
          </div>
        );
      case '/nossas-lojas':
        return (
          <div className="inst-content fade-in">
            <h1 className="inst-title"><MapPin size={32} /> Nossas Lojas</h1>
            <div className="store-card bento-item">
              <div className="store-info">
                <h2>Agropets - Matriz Viamão</h2>
                <div className="info-item">
                  <MapPin size={18} />
                  <span>Av. Senador Salgado Filho, 3631 - Viamópolis, Viamão - RS</span>
                </div>
                <div className="info-item">
                  <Clock size={18} />
                  <span>Segunda a Sábado: 08:00 às 19:00</span>
                </div>
                <div className="info-item">
                  <Clock size={18} />
                  <span><strong>Veterinária:</strong> Segundas e Sextas-feiras</span>
                </div>
                <div className="info-item">
                  <Phone size={18} />
                  <span>(51) 9 8624-0794</span>
                </div>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Agropets+Av.+Senador+Salgado+Filho+3631+Viamão+RS" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary-slim"
                >
                  Ver no Mapa <ChevronRight size={16} />
                </a>
              </div>
              <div className="store-map-placeholder">
                <img src="/agrovet-shop.png" alt="Agropets Matriz Viamão" />
              </div>
            </div>
          </div>
        );
      case '/politica-de-privacidade':
        return (
          <div className="inst-content fade-in">
            <h1 className="inst-title"><ShieldCheck size={32} /> Política de Privacidade</h1>
            <div className="legal-text">
              <p>Sua privacidade é importante para nós. É política da Agropets respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site Agropets.</p>
              <h3>1. Coleta de Informações</h3>
              <p>Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento.</p>
              <h3>2. Uso de Dados</h3>
              <p>Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei ou para processar seu pedido (ex: entrega e gateways de pagamento).</p>
              <h3>3. Segurança</h3>
              <p>Protegemos os dados armazenados dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.</p>
            </div>
          </div>
        );
      case '/trocas-e-devolucoes':
        return (
          <div className="inst-content fade-in">
            <h1 className="inst-title"><RefreshCw size={32} /> Trocas e Devoluções</h1>
            <div className="legal-text">
              <p>Na Agropets, queremos que sua experiência de compra seja excelente. Se por algum motivo precisar trocar um produto, siga nossa política:</p>
              <h3>Prazos para Troca</h3>
              <ul>
                <li><strong>Produtos não perecíveis:</strong> Até 7 dias após o recebimento.</li>
                <li><strong>Medicamentos:</strong> Não aceitamos trocas de medicamentos após a saída da loja por questões sanitárias, exceto em caso de desvio de qualidade comprovado pelo fabricante.</li>
                <li><strong>Rações:</strong> Troca garantida em caso de defeito na embalagem ou problema de qualidade.</li>
              </ul>
              <h3>Condições do Produto</h3>
              <p>O produto deve estar na embalagem original, sem indícios de uso, acompanhado da nota fiscal ou cupom de compra.</p>
            </div>
          </div>
        );
      case '/faq':
        return (
          <div className="inst-content fade-in">
            <h1 className="inst-title"><HelpCircle size={32} /> Perguntas Frequentes</h1>
            <div className="faq-list">
              <div className="faq-item">
                <h3>Qual o valor da entrega?</h3>
                <p>Nossa taxa de entrega é fixa para a maior parte de Viamão/RS. Você pode consultar o valor exato selecionando seu bairro no carrinho de compras.</p>
              </div>
              <div className="faq-item">
                <h3>Quais as formas de pagamento?</h3>
                <p>Aceitamos Pix, cartões de crédito/débito (levamos a maquininha até você) e dinheiro diretamente na entrega.</p>
              </div>
              <div className="faq-item">
                <h3>Como agendar uma consulta veterinária?</h3>
                <p>Você pode agendar pelo nosso WhatsApp (51) 9 8624-0794 ou diretamente na nossa loja física.</p>
              </div>
              <div className="faq-item">
                <h3>Entregam em outras cidades?</h3>
                <p>Atualmente nosso foco de entrega rápida é exclusivo para a cidade de Viamão/RS e arredores imediatos.</p>
              </div>
            </div>
          </div>
        );
      case '/fale-conosco':
        return (
          <div className="inst-content fade-in">
            <h1 className="inst-title"><MessageCircle size={32} /> Fale Conosco</h1>
            <div className="contact-grid">
              <div className="contact-info-card">
                <h3>Canais de Atendimento</h3>
                <div className="contact-method">
                  <Phone className="icon" />
                  <div>
                    <strong>WhatsApp de Vendas</strong>
                    <p>(51) 9 8624-0794</p>
                  </div>
                </div>
                <div className="contact-method">
                  <Mail className="icon" />
                  <div>
                    <strong>E-mail</strong>
                    <p>contato@agropets.com.br</p>
                  </div>
                </div>
                <div className="contact-method">
                  <MapPin className="icon" />
                  <div>
                    <strong>Localização</strong>
                    <p>Av. Senador Salgado Filho, 3631, Viamão/RS</p>
                  </div>
                </div>
              </div>
              <div className="contact-form-card bento-item">
                <h3>Envie uma mensagem</h3>
                <div className="form-group-inst">
                  <label>Seu Nome</label>
                  <input type="text" placeholder="Como podemos te chamar?" />
                </div>
                <div className="form-group-inst">
                  <label>Sua Mensagem</label>
                  <textarea placeholder="No que podemos te ajudar hoje?" rows="4"></textarea>
                </div>
                <button className="btn-primary">Enviar Mensagem</button>
              </div>
            </div>
          </div>
        );
      default:
        return <div>Página não encontrada</div>;
    }
  };

  return (
    <div className="institutional-page container">
      <div className="inst-sidebar">
        <Link to="/sobre" className={path === '/sobre' ? 'active' : ''}>Quem Somos</Link>
        <Link to="/nossas-lojas" className={path === '/nossas-lojas' ? 'active' : ''}>Nossas Lojas</Link>
        <Link to="/faq" className={path === '/faq' ? 'active' : ''}>FAQ</Link>
        <Link to="/politica-de-privacidade" className={path === '/politica-de-privacidade' ? 'active' : ''}>Privacidade</Link>
        <Link to="/trocas-e-devolucoes" className={path === '/trocas-e-devolucoes' ? 'active' : ''}>Trocas</Link>
        <Link to="/fale-conosco" className={path === '/fale-conosco' ? 'active' : ''}>Contato</Link>
      </div>
      <div className="inst-main">
        {renderContent()}
      </div>
    </div>
  );
};

export default Institutional;
