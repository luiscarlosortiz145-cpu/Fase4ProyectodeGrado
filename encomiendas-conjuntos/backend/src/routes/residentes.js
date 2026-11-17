const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { autenticar, permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar, permitirRoles('administrador'));

const FINALIDAD = 'Gestión de recepción y entrega de encomiendas (Ley 1581 de 2012)';

// RF-01 / RN-01: no se registra un residente sin autorización de uso de datos
router.post('/', async (req, res) => {
  const { nombre, correo, telefono, contrasena, id_apartamento, consentimiento } = req.body || {};
  if (!nombre || !correo || !contrasena || !id_apartamento) {
    return res.status(400).json({ error: 'Nombre, correo, contraseña y apartamento son obligatorios' });
  }
  if (consentimiento !== true) {
    return res.status(400).json({ error: 'Se requiere la autorización de uso de datos del residente' });
  }
  if (contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const apto = await client.query('SELECT 1 FROM apartamento WHERE id_apartamento = $1', [id_apartamento]);
    if (!apto.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El apartamento no existe' });
    }
    const hash = await bcrypt.hash(contrasena, 10);
    const u = await client.query(
      `INSERT INTO usuario (nombre, correo, telefono, contrasena, rol)
       VALUES ($1, $2, $3, $4, 'residente') RETURNING id_usuario, nombre, correo, telefono, rol`,
      [nombre.trim(), correo.toLowerCase().trim(), telefono || null, hash]
    );
    const id = u.rows[0].id_usuario;
    await client.query('INSERT INTO residente_apartamento (id_usuario, id_apartamento) VALUES ($1, $2)', [id, id_apartamento]);
    await client.query('INSERT INTO consentimiento (id_usuario, finalidad) VALUES ($1, $2)', [id, FINALIDAD]);
    await client.query('COMMIT');
    res.status(201).json({ ...u.rows[0], id_apartamento });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    throw e;
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, a.id_apartamento, a.torre, a.numero
     FROM usuario u
     JOIN residente_apartamento ra ON ra.id_usuario = u.id_usuario AND ra.fecha_fin IS NULL
     JOIN apartamento a ON a.id_apartamento = ra.id_apartamento
     WHERE u.rol = 'residente' AND u.activo = TRUE
     ORDER BY a.torre, a.numero, u.nombre`
  );
  res.json(rows);
});

module.exports = router;
