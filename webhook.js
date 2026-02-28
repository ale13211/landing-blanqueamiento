const axios = require('axios');

async function sendWhatsAppText(phoneId, token, to, message) {
  const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: message }
  };

  const res = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  return res.data;
}

module.exports = async (req, res) => {
  const WA_PHONE_ID = process.env.WA_PHONE_ID;
  const WA_TOKEN = process.env.WA_ACCESS_TOKEN;
  const OPERATOR_NUMBER = process.env.OPERATOR_NUMBER;
  const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || 'webhook_token_sample';

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === WEBHOOK_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        return res.sendStatus(403);
      }
    }
    return res.sendStatus(400);
  }

  // POST - recibir mensajes entrantes
  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (body && body.entry) {
        for (const entry of body.entry) {
          if (!entry.changes) continue;
          for (const change of entry.changes) {
            const val = change.value;
            if (!val.messages) continue;
            for (const message of val.messages) {
              const from = message.from; // número del cliente
              const text = (message.text && message.text.body) ? message.text.body.trim().toLowerCase() : '';

              if (text === 'si' || text === 's' || text === 'confirmo' || text === 'confirmar') {
                const confirmMsg = 'Gracias por confirmar. Tu pedido está siendo procesado. Te avisaremos cuando salga el envío.';
                if (WA_PHONE_ID && WA_TOKEN) await sendWhatsAppText(WA_PHONE_ID, WA_TOKEN, from, confirmMsg);
              } else if (text === 'no') {
                const helpMsg = 'Entendido. ¿En qué podemos ayudarte? Responde con tu pregunta o llama al +595982164843.';
                if (WA_PHONE_ID && WA_TOKEN) await sendWhatsAppText(WA_PHONE_ID, WA_TOKEN, from, helpMsg);
              } else {
                // Reenviar mensaje al operador
                const forward = `Mensaje del cliente ${from}: ${text}`;
                if (WA_PHONE_ID && WA_TOKEN && OPERATOR_NUMBER) await sendWhatsAppText(WA_PHONE_ID, WA_TOKEN, OPERATOR_NUMBER, forward);
              }
            }
          }
        }
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error('Webhook processing error', err);
      return res.sendStatus(500);
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
};
