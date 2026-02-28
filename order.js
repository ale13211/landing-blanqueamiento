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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WA_PHONE_ID = process.env.WA_PHONE_ID;
  const WA_TOKEN = process.env.WA_ACCESS_TOKEN;
  const OPERATOR_NUMBER = process.env.OPERATOR_NUMBER;

  if (!WA_PHONE_ID || !WA_TOKEN || !OPERATOR_NUMBER) {
    console.warn('Missing WhatsApp credentials in environment');
  }

  try {
    const { nombre, apellido, telefono, direccion, referencia, departamento, ciudad, total } = req.body;

    if (!nombre || !telefono) return res.status(400).json({ error: 'Falta nombre o teléfono' });

    const clientPhone = String(telefono).replace(/\D+/g, '');

    const operadorMsg = `Nuevo pedido:\nNombre: ${nombre} ${apellido}\nTel: ${clientPhone}\nDepto: ${departamento}\nCiudad: ${ciudad}\nDirección: ${direccion}\nReferencia: ${referencia}\nTotal: ${total}`;

    // Notificar operador (si está configurado)
    if (WA_PHONE_ID && WA_TOKEN && OPERATOR_NUMBER) {
      try {
        await sendWhatsAppText(WA_PHONE_ID, WA_TOKEN, OPERATOR_NUMBER, operadorMsg);
      } catch (err) {
        console.error('Error notificando al operador:', err.response ? err.response.data : err.message);
      }
    }

    // Enviar mensaje automático al cliente (puede fallar si no hay plantillas aprobadas)
    const clienteMsg = `Hola ${nombre}, gracias por tu pedido.\n\nDetalle de envío:\nDepartamento: ${departamento}\nCiudad: ${ciudad}\nDirección: ${direccion}\nTotal a pagar: ${total}\n\nPor favor confirma: ¿Confirmás el pedido? Responde SI para confirmar o NO si tenés dudas.`;

    let clienteNotified = false;
    if (WA_PHONE_ID && WA_TOKEN) {
      try {
        await sendWhatsAppText(WA_PHONE_ID, WA_TOKEN, clientPhone, clienteMsg);
        clienteNotified = true;
      } catch (err) {
        console.warn('No se pudo enviar mensaje automático al cliente. Revisa plantillas/permisos.');
      }
    }

    return res.json({ ok: true, operadorNotified: !!OPERATOR_NUMBER, clienteNotified });
  } catch (err) {
    console.error('Order handler error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
};
