const express = require('express');
const db = require('../db');
const { autenticar, permitirRoles } = require('../middleware/auth');
const notificaciones = require('../services/notificaciones');

const router = express.Router();
router.use(autenticar);

// Condición SQL que limita a un residente a las encomiendas de su(s) apartamento(s) (RN-05)
const SOLO_MIS_APTOS = `e.id_apartamento IN (
  SELECT id_apartamento FROM residente_apartamento WHERE id_usuario = $1 AND fecha_fin IS NULL)`;

// RF-03 + RF-04: registrar encomienda y notificar al residente
router.post('/', permitirRoles('portero'), async (req, res) => {
  const { id_apartamento, remitente_transportadora, descripcion } = req.body || {};
  if (!id_apartamento || !remitente_transportadora || !String(remitente_transportadora).trim()) {
    return res.status(400).json({ error: 'Apartamento y remitente/transportadora son obligatorios' });
  }

  // Residentes del apartamento con consentimiento vigente (RN-01)
  const destinatarios = await db.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.telefono
     FROM residente_apartamento ra
     JOIN usuario u ON u.id_usuario = ra.id_usuario AND u.activo = TRUE
     WHERE ra.id_apartamento = $1 AND ra.fecha_fin IS NULL
       AND EXISTS (SELECT 1 FROM consentimiento c WHERE c.id_usuario = u.id_usuario AND c.vigente)`,
    [id_apartamento]
  );
  if (!destinatarios.rowCount) {
    return res.status(422).json({ error: 'El apartamento no existe o no tiene residentes con autorización de datos' });
  }

  const ins = await db.query(
    `INSERT INTO encomienda (id_apartamento, id_portero, remitente_transportadora, descripcion)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id_apartamento, req.usuario.id_usuario, String(remitente_transportadora).trim(), descripcion || null]
  );
  let enc = ins.rows[0];

  // RF-04: notificar; si falla el envío, la encomienda queda registrada y el fallo es visible
  let enviadas = 0;
  const avisos = [];
  for (const d of destinatarios.rows) {
    let resultado;
    try {
      resultado = await notificaciones.enviar({
        canal: 'correo',
        destinatario: d,
        asunto: 'Tienes una encomienda en la portería',
        mensaje:
          `Hola ${d.nombre},\n\nLlegó una encomienda de ${enc.remitente_transportadora} para tu apartamento. ` +
          `Puedes recogerla en la portería.\n\nMensaje automático del sistema de encomiendas.`,
      });
      enviadas++;
    } catch (e) {
      console.error('Error al notificar:', e.message);
      resultado = 'fallido';
    }
    await db.query(
      'INSERT INTO notificacion (id_encomienda, id_usuario, canal, resultado) VALUES ($1, $2, $3, $4)',
      [enc.id_encomienda, d.id_usuario, 'correo', resultado]
    );
    avisos.push({ id_usuario: d.id_usuario, canal: 'correo', resultado });
  }
  if (enviadas > 0) {
    const up = await db.query("UPDATE encomienda SET estado = 'notificada' WHERE id_encomienda = $1 RETURNING *", [enc.id_encomienda]);
    enc = up.rows[0];
  }
  res.status(201).json({ ...enc, notificaciones: avisos });
});

// RF-05, RF-07, RF-08: listar con filtros. Residente: solo su apartamento (historial).
router.get('/', async (req, res) => {
  const { estado, id_apartamento, fecha, pendientes } = req.query;
  const params = [];
  const where = [];

  if (req.usuario.rol === 'residente') {
    params.push(req.usuario.id_usuario);
    where.push(SOLO_MIS_APTOS.replace('$1', `$${params.length}`));
  }
  if (estado) { params.push(estado); where.push(`e.estado = $${params.length}`); }
  if (pendientes === 'true') where.push("e.estado <> 'entregada'");
  if (id_apartamento && req.usuario.rol !== 'residente') {
    params.push(id_apartamento); where.push(`e.id_apartamento = $${params.length}`);
  }
  if (fecha) { params.push(fecha); where.push(`e.fecha_recepcion::date = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT e.*, a.torre, a.numero
     FROM encomienda e JOIN apartamento a ON a.id_apartamento = e.id_apartamento
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY e.fecha_recepcion DESC`,
    params
  );
  res.json(rows);
});

// RF-05: detalle de una encomienda con su trazabilidad
router.get('/:id', async (req, res) => {
  const params = [req.params.id];
  let extra = '';
  if (req.usuario.rol === 'residente') {
    params.push(req.usuario.id_usuario);
    extra = ' AND ' + SOLO_MIS_APTOS.replace('$1', '$2');
  }
  const enc = await db.query(
    `SELECT e.*, a.torre, a.numero FROM encomienda e
     JOIN apartamento a ON a.id_apartamento = e.id_apartamento
     WHERE e.id_encomienda = $1${extra}`, params);
  if (!enc.rowCount) return res.status(404).json({ error: 'Encomienda no encontrada' });
  const [noti, ent] = await Promise.all([
    db.query('SELECT canal, fecha_envio, resultado FROM notificacion WHERE id_encomienda = $1 ORDER BY fecha_envio', [req.params.id]),
    db.query('SELECT nombre_quien_retira, fecha_entrega, id_portero FROM entrega WHERE id_encomienda = $1', [req.params.id]),
  ]);
  res.json({ ...enc.rows[0], notificaciones: noti.rows, entrega: ent.rows[0] || null });
});

// RF-06 / RN-03: confirmar entrega con soporte (foto o firma)
router.post('/:id/entrega', permitirRoles('portero'), async (req, res) => {
  const { nombre_quien_retira, soporte } = req.body || {};
  if (!nombre_quien_retira || !soporte) {
    return res.status(400).json({ error: 'Se requiere el nombre de quien retira y el soporte (foto o firma)' });
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT estado FROM encomienda WHERE id_encomienda = $1 FOR UPDATE', [req.params.id]);
    if (!enc.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Encomienda no encontrada' }); }
    if (enc.rows[0].estado === 'entregada') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La encomienda ya fue entregada' });
    }
    const ent = await client.query(
      `INSERT INTO entrega (id_encomienda, id_portero, nombre_quien_retira, soporte_url)
       VALUES ($1, $2, $3, $4) RETURNING id_entrega, id_encomienda, nombre_quien_retira, fecha_entrega`,
      [req.params.id, req.usuario.id_usuario, nombre_quien_retira.trim(), soporte]
    );
    await client.query("UPDATE encomienda SET estado = 'entregada' WHERE id_encomienda = $1", [req.params.id]);
    await client.query('COMMIT');
    res.status(201).json({ ...ent.rows[0], estado: 'entregada' });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

module.exports = router;
