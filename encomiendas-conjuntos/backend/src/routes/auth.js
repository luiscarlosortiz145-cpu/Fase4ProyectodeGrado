const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// RF-02: inicio de sesión por rol
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body || {};
  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }
  const { rows } = await db.query(
    'SELECT id_usuario, nombre, correo, rol, contrasena FROM usuario WHERE correo = $1 AND activo = TRUE',
    [correo.toLowerCase().trim()]
  );
  const u = rows[0];
  const ok = u && (await bcrypt.compare(contrasena, u.contrasena));
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id_usuario: u.id_usuario, rol: u.rol, nombre: u.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  res.json({ token, usuario: { id_usuario: u.id_usuario, nombre: u.nombre, correo: u.correo, rol: u.rol } });
});

router.get('/me', autenticar, (req, res) => res.json(req.usuario));

module.exports = router;
