import { validateAndFormatPhone } from '../utils/stringUtils';

/**
 * Serviço de integração com a Evolution API para envio de mensagens via WhatsApp.
 */

export const evolutionApi = {
  /**
   * Envia uma mensagem de texto simples.
   * @param {string} number Número do destinatário (com código do país e DDD)
   * @param {string} text Conteúdo da mensagem
   */
  async sendText(number) {
    const cleanNumber = validateAndFormatPhone(number);
    
    if (!cleanNumber) {
      console.warn('Número de telefone inválido para Evolution API:', number);
      return { success: false, error: 'Número de telefone inválido' };
    }

    // A chave da Evolution API não pode ser distribuída no bundle do navegador.
    // O envio automático deve ser feito exclusivamente por uma função protegida no servidor.
    console.warn('Envio automático de WhatsApp indisponível no cliente. Use o link wa.me.');
    return { success: false, error: 'Envio automático indisponível' };
  },

  /**
   * Formata os dados do pedido para uma mensagem amigável no WhatsApp.
   */
  formatOrderMessage(formData, cart, subtotal, deliveryFee, total, discount = 0) {
    let message = `*📦 NOVO PEDIDO - AGROPETS*\n\n`;
    message += `👤 *Cliente:* ${formData.nome}\n`;
    message += `📱 *WhatsApp:* ${formData.whatsapp}\n\n`;
    
    message += `🛒 *Itens:*\n`;
    cart.forEach(item => {
      const weightLabel = item.selectedVariation ? ` (${item.selectedVariation.weight})` : '';
      message += `• ${item.quantity}x ${item.name}${weightLabel} (_R$ ${item.price.toFixed(2)}_)\n`;
    });
    
    message += `\n💰 *Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    if (discount > 0) {
      message += `🎟️ *Desconto:* - R$ ${discount.toFixed(2).replace('.', ',')}\n`;
    }
    message += `🛵 *Taxa de Entrega:* R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
    message += `⭐ *TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}\n\n`;
    
    message += `💳 *Pagamento na Entrega:* ${formData.formaPagamento}\n`;
    if (formData.formaPagamento === 'Dinheiro' && formData.troco && parseFloat(formData.troco) > 0) {
      const troco = (parseFloat(formData.troco) - total).toFixed(2).replace('.', ',');
      message += `💵 *Troco para:* R$ ${parseFloat(formData.troco).toFixed(2).replace('.', ',')} _(troco: R$ ${troco})_\n`;
    }
    message += `\n`;
    
    message += `📍 *Endereço de Entrega:*\n`;
    message += `*Rua:* ${formData.endereco}, ${formData.numero}\n`;
    if (formData.distancia) message += `*Distância:* ${formData.distancia} km\n`;
    if (formData.bairro) message += `*Bairro:* ${formData.bairro}\n`;
    if (formData.cep) message += `*CEP:* ${formData.cep}\n`;
    if (formData.complemento) message += `*Complemento:* ${formData.complemento}\n`;
    
    message += `\n⏰ _Pedido enviado via site em ${new Date().toLocaleString('pt-BR')}_`;
    
    return message;
  },

  /**
   * Formata os dados de um agendamento de serviço para o WhatsApp.
   */
  formatBookingMessage(bookingData) {
    let message = `*🏥 AGENDAMENTO AGRO VET*\n\n`;
    message += `👤 *Cliente:* ${bookingData.name}\n`;
    message += `📱 *WhatsApp:* ${bookingData.phone}\n\n`;
    
    message += `🐾 *Pet:* ${bookingData.petName} (${bookingData.petType})\n`;
    message += `🩺 *Serviço:* ${bookingData.service}\n`;
    
    if (bookingData.notes) {
      message += `📝 *Observações:* ${bookingData.notes}\n`;
    }
    
    message += `\n🗓️ _Solicitação enviada em ${new Date().toLocaleString('pt-BR')}_`;
    message += `\n\n*Aguarde a confirmação da nossa equipe.*`;
    
    return message;
  },

  /**
   * Formata as atualizações de status de pedido para o WhatsApp (CRM).
   */
  formatStatusUpdateMessage(order, newStatus) {
    let message = `*📦 ATUALIZAÇÃO DO PEDIDO - AGROPETS*\n\n`;
    message += `Olá *${order.customer}*,\n\n`;
    message += `O status do seu pedido *#[${order.id}]* foi alterado para:\n`;
    message += `🚀 *${newStatus.toUpperCase()}*\n\n`;

    switch(newStatus) {
      case 'Preparando':
        message += `✅ Sua compra já está sendo separada e embalada com carinho pela nossa equipe! 🐾\n`;
        break;
      case 'Em Rota de Entrega':
        message += `🛵 Boas notícias! O entregador da Agropets acaba de sair com sua entrega. Prepare o pet! 🐾\n`;
        break;
      case 'Concluído':
        message += `🎉 Oba! Seu pedido foi entregue com sucesso. Esperamos que seu pet aprove! ❤️\n`;
        break;
      case 'Cancelado':
        message += `⚠️ Seu pedido foi cancelado. Se tiver alguma dúvida, por favor, entre em contato conosco.\n`;
        break;
      default:
        message += `Acompanhe as novidades pelo nosso site.\n`;
    }

    message += `\n_Atualizado automaticamente em ${new Date().toLocaleString('pt-BR')}_`;
    
    return message;
  }
};
