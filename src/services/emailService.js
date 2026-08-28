const callEmailApi = async (payload) => {
  try {
    // Em produção (Vercel), usa a serverless function
    // Em dev local, chama a Resend API diretamente
    const isDev = false;
    const resendKey = '';

    if (isDev && resendKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: payload.from || 'Agropets <onboarding@resend.dev>',
          to: Array.isArray(payload.to) ? payload.to : [payload.to],
          subject: payload.subject,
          html: payload.html,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Resend API Error (dev):', err);
        return { success: false, error: err.message || 'Erro ao enviar e-mail' };
      }
      return { success: true };
    }

    // Produção — usa a serverless function da Vercel
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { success: false, error: 'Sessão expirada.' };

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Email API Error:', errorData.error, errorData.message, errorData.name);
      return { success: false, error: errorData.error || 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Fetch error:', error);
    return { success: false, error: error.message };
  }
};

export const emailService = {
  sendPasswordResetEmail: async (toEmail) => {
    const { supabase } = await import('./supabase');
    if (!supabase) return { success: false, error: 'Serviço de autenticação indisponível.' };
    const { error } = await supabase.auth.resetPasswordForEmail(toEmail, {
      redirectTo: `${window.location.origin}/login`,
    });
    return error ? { success: false, error: error.message } : { success: true };
  },

  sendOrderConfirmation: async (order, user) => {
    const itemsHtml = (order.items || []).map(item => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity || item.qty || 1}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">R$ ${((item.price || 0) * (item.quantity || item.qty || 1)).toFixed(2).replace('.', ',')}</td>
      </tr>
    `).join('');

    return await callEmailApi({
      from: 'Agropets <onboarding@resend.dev>',
      to: [user.email],
      subject: `Pedido Confirmado #${order.id} - Agropets`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #15803d;">Pedido Recebido! 🎉</h2>
          <p>Olá ${user.name}, seu pedido foi recebido e já estamos preparando tudo.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="border-bottom: 2px solid #15803d;">
                <th style="text-align: left; padding-bottom: 10px;">Item</th>
                <th style="text-align: right; padding-bottom: 10px;">Preço</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: right; font-weight: bold; font-size: 1.1rem;">
            <p>Total: R$ ${order.total.toFixed(2)}</p>
          </div>
          <p><strong>Forma de Pagamento:</strong> ${order.payment}</p>
          <p><strong>Entregar em:</strong> ${order.address.endereco}, ${order.address.numero} - ${order.address.bairro}</p>
        </div>
      `
    });
  },

  sendAppointmentReminder: async (appointment, user) => {
    return await callEmailApi({
      from: 'Veterinária Agropets <onboarding@resend.dev>',
      to: [user.email],
      subject: `Lembrete de Consulta: ${appointment.petName} - Agropets`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #15803d; text-align: center;">Lembrete de Consulta 🐾</h2>
          <p>Olá ${user.name}, este é um lembrete do agendamento para o(a) <strong>${appointment.petName}</strong>.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #15803d; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date(appointment.date).toLocaleDateString('pt-BR')}</p>
            <p style="margin: 5px 0;"><strong>Horário:</strong> ${appointment.time}</p>
            <p style="margin: 5px 0;"><strong>Serviço:</strong> ${appointment.service}</p>
          </div>
          <p>Por favor, chegue com 10 minutos de antecedência. Se precisar desmarcar, nos avise via WhatsApp.</p>
        </div>
      `
    });
  },

  sendDeliveryStatusUpdate: async (order, user, newStatus) => {
    const statusMap = {
      'Preparando': 'Preparando seu Pedido 📦',
      'Em Rota de Entrega': 'Saiu para Entrega 🚚',
      'Concluído': 'Entregue com Sucesso ✅',
      'Cancelado': 'Cancelado ❌'
    };
    
    return await callEmailApi({
      from: 'Agropets <onboarding@resend.dev>',
      to: [user.email],
      subject: `Atualização do Pedido #${order.id} - Agropets`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #15803d;">Status do Pedido Atualizado!</h2>
          <p>Olá ${user.name}, o status do seu pedido <strong>#${order.id}</strong> mudou para:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="background: #f0fdf4; color: #16a34a; padding: 15px 30px; border-radius: 50px; font-weight: bold; font-size: 1.2rem; border: 1px solid #dcfce7;">
              ${statusMap[newStatus] || newStatus}
            </span>
          </div>
          <p>Acompanhe seus pedidos na sua área de cliente no nosso site.</p>
        </div>
      `
    });
  },

  sendPromotionalEmail: async (recipient, subject, content, images = []) => {
    const imagesHtml = images.length > 0 
      ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
          ${images.map(img => `<img src="${img}" style="width: 100%; border-radius: 8px;" />`).join('')}
         </div>`
      : '';

    const result = await callEmailApi({
      from: 'Marketing Agropets <onboarding@resend.dev>',
      to: [recipient.email],
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #15803d; text-align: center;">Novidade na Agropets! 🐾</h2>
          <div style="line-height: 1.6; color: #334155; white-space: pre-wrap;">
            ${content}
          </div>
          ${imagesHtml}
          <hr style="margin: 30px 0; border: 0; border-top: 1px solid #f1f5f9;" />
          <p style="text-align: center; font-size: 0.8rem; color: #94a3b8;">
            Você recebeu este e-mail porque é cadastrado na nossa comunidade.
            <br />
            <a href="#" style="color: #15803d;">Gerenciar notificações</a>
          </p>
        </div>
      `
    });
    return result.success;
  }
};
