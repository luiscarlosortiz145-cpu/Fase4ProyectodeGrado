// Servicio de notificaciones (RF-04).
// En modo "simulado" (por defecto) no se envía nada real: solo se registra el resultado.
// El envío real por correo/WhatsApp se implementa en el Sprint 4.
async function enviar({ canal, destinatario, asunto, mensaje }) {
  if ((process.env.NOTIFICACIONES_MODO || 'simulado') === 'simulado') {
    console.log(`[notificación simulada] (${canal}) a ${destinatario.correo}: ${asunto}`);
    return 'simulado';
  }
  // TODO Sprint 4: integrar correo (SMTP) y/o WhatsApp
  throw new Error('Modo de notificación real aún no implementado');
}

module.exports = { enviar };
