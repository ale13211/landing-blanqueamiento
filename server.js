require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
const path = require('path');

// Servir archivos estáticos (index.html) para pruebas locales/publicas
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
const WA_PHONE_ID = process.env.WA_PHONE_ID; // e.g. '109876543210' (Phone Number ID)
const WA_TOKEN = process.env.WA_ACCESS_TOKEN; // Bearer token
const OPERATOR_NUMBER = process.env.OPERATOR_NUMBER; // e.g. '595982164843'

if (!WA_PHONE_ID || !WA_TOKEN || !OPERATOR_NUMBER) {
  console.warn('Warning: WA_PHONE_ID, WA_ACCESS_TOKEN or OPERATOR_NUMBER not set in .env');
}

async function sendWhatsAppText(to, message) {
  const url = `https://graph.facebook.com/v17.0/${WA_PHONE_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: message }
  };

  try {
    const res = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' }
    });
    return res.data;
  } catch (err) {
    console.error('Error sending WhatsApp message', err.response ? err.response.data : err.message);
    throw err;
  }
}

app.post('/api/order', async (req, res) => {
  try {
    const { nombre, apellido, telefono, direccion, referencia, departamento, ciudad, total } = req.body;

    if (!nombre || !telefono) return res.status(400).json({ error: 'Falta nombre o teléfono' });

    // Normalizar teléfono (el cliente debe enviar con código de país sin +)
    const clientPhone = telefono.replace(/\D+/g, '');

    // 1) Notificar al operador
    const operadorMsg = `Nuevo pedido:\nNombre: ${nombre} ${apellido}\nTel: ${clientPhone}\nDepto: ${departamento}\nCiudad: ${ciudad}\nDirección: ${direccion}\nReferencia: ${referencia}\nTotal: ${total}`;

    await sendWhatsAppText(OPERATOR_NUMBER, operadorMsg);

    // 2) Enviar respuesta automática al cliente con detalles de envío y confirmación
    // Nota: si tu cuenta necesita plantillas aprobadas, reemplaza por una plantilla aprobada.
    const clienteMsg = `Hola ${nombre}, gracias por tu pedido.\n\nDetalle de envío:\nDepartamento: ${departamento}\nCiudad: ${ciudad}\nDirección: ${direccion}\nTotal a pagar: ${total}\n\nPor favor confirma: ¿Confirmás el pedido? Responde SI para confirmar o NO si tenés dudas.`;

    // Intentamos enviar al cliente (puede fallar si la política / plantillas no están en regla)
    let clienteResp = null;
    try {
      clienteResp = await sendWhatsAppText(clientPhone, clienteMsg);
    } catch (err) {
      // Si falla, seguimos pero reportamos el error en la respuesta
      console.warn('No se pudo enviar mensaje automático al cliente (posible falta de plantilla o permiso).');
    }

    return res.json({ ok: true, operadorNotified: true, clienteNotified: !!clienteResp });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Webhook endpoint (para recibir mensajes entrantes y confirmar automáticamente si el cliente responde SI)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_TOKEN || 'webhook_token_sample';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

app.post('/webhook', async (req, res) => {
  // Recibir eventos desde WhatsApp Cloud API
  try {
    const body = req.body;
    // Manejo muy simple: si el mensaje de usuario contiene 'SI' o 'S' confirmamos
    if (body && body.entry) {
      // extraer mensajes (estructura según WhatsApp Cloud API)
      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          const val = change.value;
          if (!val.messages) continue;
          for (const message of val.messages) {
            const from = message.from; // número del cliente
            const text = (message.text && message.text.body) ? message.text.body.trim().toLowerCase() : '';

            if (text === 'si' || text === 's' || text === 'confirmo' || text === 'confirmar') {
              // enviar confirmación final
              const confirmMsg = 'Gracias por confirmar. Tu pedido está siendo procesado. Te avisaremos cuando salga el envío.';
              await sendWhatsAppText(from, confirmMsg);
            } else if (text === 'no') {
              // enviar mensaje pidiendo detalles
              const helpMsg = 'Entendido. ¿En qué podemos ayudarte? Responde con tu pregunta o llama al +595982164843.';
              await sendWhatsAppText(from, helpMsg);
            } else {
              // opcional: si detectamos duda, reenviar a operador
              const forward = `Mensaje del cliente ${from}: ${text}`;
              await sendWhatsAppText(OPERATOR_NUMBER, forward);
            }
          }
        }
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error', err);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
