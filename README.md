Automatización de pedidos (WhatsApp)

Resumen
- Servidor Express que recibe pedidos desde el formulario y envía mensajes vía WhatsApp Cloud API.

Archivos creados
- `server.js` : servidor Express con endpoint `/api/order` y webhook `/webhook`.
- `package.json` : dependencias y scripts.
- `.env.sample` : variables de entorno de ejemplo.

Instalación y ejecución
1. Copia `.env.sample` a `.env` y rellena:

- `WA_PHONE_ID` : Phone Number ID de tu WhatsApp Cloud API
- `WA_ACCESS_TOKEN` : Access token (Bearer)
- `OPERATOR_NUMBER` : tu número (ej. 595982164843)
- `PORT` : puerto (opcional)
- `WEBHOOK_TOKEN` : token para verificar webhooks

2. Instala dependencias:

```bash
npm install
```

3. Arranca el servidor en desarrollo:

```bash
npm run dev
```

Uso
- El frontend (`index.html`) se modificará para enviar un POST a `/api/order` con el formulario.
- El servidor notificará al operador y enviará un mensaje automático al cliente (si la cuenta permite mensajes).
- Configura el webhook de WhatsApp Cloud API apuntando a `https://tu-dominio.com/webhook` y usa `WEBHOOK_TOKEN` para la verificación.

Limitaciones y notas
- WhatsApp Cloud API requiere que uses plantillas aprobadas para mensajes fuera de la ventana de 24 horas. Si tus plantillas no están aprobadas, el envío al cliente puede fallar; el servidor sigue notificando al operador.
- Si no dispones de la Cloud API ahora, puedo implementar un fallback que solo notifique al operador y abra el chat del cliente para que reciba el mensaje manualmente.

Siguiente paso
- Si estás de acuerdo, pega las credenciales en `.env` o indícame cuándo las quieres añadir y pruebo el flujo en tu máquina.
 - Si estás de acuerdo, pega las credenciales en `.env` o indícame cuándo las quieres añadir y pruebo el flujo en tu máquina.

Despliegue en Vercel
- Subir el repo a GitHub.
- En Vercel, crea un nuevo proyecto importando tu repo.
- En Settings → Environment Variables añade:
	- `WA_PHONE_ID`, `WA_ACCESS_TOKEN`, `OPERATOR_NUMBER`, `WEBHOOK_TOKEN`.
- Opcional: añade `PORT` si quieres otro puerto (no necesario en Vercel).

Rutas importantes en Vercel (después del deploy):
- `https://<tu-proyecto>.vercel.app/api/order` — endpoint para recibir pedidos.
- `https://<tu-proyecto>.vercel.app/api/webhook` — webhook para configurar en Meta/WhatsApp Cloud API.

Webhook (Meta/WhatsApp Cloud API)
- Configura la URL del webhook en la consola de Meta: `https://<tu-proyecto>.vercel.app/api/webhook` y usa `WEBHOOK_TOKEN` para verificación.

Notas finales
- Vercel expone HTTPS por defecto, así que la URL será válida para configurar webhooks.
- Asegúrate de pedir y aprobar plantillas en WhatsApp Manager si quieres enviar mensajes proactivos fuera de la ventana de 24h.
