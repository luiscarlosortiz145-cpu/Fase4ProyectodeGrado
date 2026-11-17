// Servicio de notificaciones (RF-04).
// Modos (variable NOTIFICACIONES_MODO en .env):
//   simulado (por defecto): no envía nada, solo registra el resultado.
//   real: envía el aviso por correo con SMTP (por ejemplo, Gmail con contraseña de aplicación).
const nodemailer = require('nodemailer');

let transporte = null;
function obtenerTransporte() {
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT || 465);
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: puerto,
      secure: puerto === 465, // 465 = TLS directo; 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000, // no dejar al portero esperando si el correo no responde
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporte;
}

async function enviar({ canal, destinatario, asunto, mensaje }) {
  if ((process.env.NOTIFICACIONES_MODO || 'simulado') === 'simulado') {
    console.log(`[notificación simulada] (${canal}) a ${destinatario.correo}: ${asunto}`);
    return 'simulado';
  }
  if (canal !== 'correo') throw new Error('Por ahora solo está implementado el canal de correo');
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Faltan SMTP_USER y SMTP_PASS en el archivo .env');
  }
  await obtenerTransporte().sendMail({
    from: process.env.SMTP_FROM || `Portería del conjunto <${process.env.SMTP_USER}>`,
    to: destinatario.correo,
    subject: asunto,
    text: mensaje,
  });
  return 'enviado';
}

module.exports = { enviar };
