import type { IOrder } from '../models';

/* ---- Formatação ---- */

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildOrderMessage(order: IOrder): string {
  const lines = order.items
    .map((i) => `▪ ${i.qty}x ${i.name} → ${formatMoney(i.price * i.qty)}`)
    .join('\n');

  const deliveryLine =
    order.deliveryType === 'delivery'
      ? `🛵 *ENTREGA*\n📍 ${order.address ?? 'Endereço não informado'}\n💳 Pagamento: ${order.payment}`
      : `🛍️ *RETIRADA NA LOJA*\nAv. das Patas, 1234 — Jardins, SP`;

  return [
    `🐾 *Novo Pedido #${order._id.toString().slice(-6).toUpperCase()}*`,
    '',
    lines,
    '',
    `*TOTAL: ${formatMoney(order.total)}*`,
    '━━━━━━━━━━━━━━━━━━',
    deliveryLine,
    order.notes ? `📝 Obs: ${order.notes}` : '',
  ]
    .filter((l) => l !== null)
    .join('\n')
    .trim();
}

/* ---- WhatsApp via Twilio ---- */

export async function sendOrderWhatsApp(order: IOrder): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_FROM;

  /* Em desenvolvimento, apenas loga — não envia de verdade */
  if (!sid || !token || !from) {
    console.log('[Notifications] Twilio não configurado. Mensagem que seria enviada:');
    console.log(buildOrderMessage(order));
    return;
  }

  /* Importação dinâmica do SDK Twilio para não forçar dependência em dev */
  const twilio = await import('twilio').then((m) => m.default);
  const client = twilio(sid, token);

  const storePhone = process.env.STORE_WHATSAPP ?? '+5511999999999';

  await client.messages.create({
    from,
    to:   `whatsapp:${storePhone}`,
    body: buildOrderMessage(order),
  });

  console.log(`[Notifications] WhatsApp enviado para pedido ${order._id}`);
}

/* ---- Notificações futuras (stubs) ---- */

export async function sendContactEmail(_name: string, _email: string, _message: string): Promise<void> {
  /* Implementar com nodemailer quando SMTP estiver configurado */
  console.log('[Notifications] sendContactEmail — stub não implementado.');
}

export async function sendNewsletterConfirmation(_email: string): Promise<void> {
  /* Implementar com nodemailer quando SMTP estiver configurado */
  console.log('[Notifications] sendNewsletterConfirmation — stub não implementado.');
}
