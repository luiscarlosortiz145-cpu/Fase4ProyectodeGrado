const express = require('express');
const db = require('../db');
const { autenticar, permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// Listar apartamentos (portero y administrador)
router.get('/', permitirRoles('administrador', 'portero'), async (req, res) => {
  const { rows } = await db.query('SELECT * FROM apartamento ORDER BY torre, numero');
  res.json(rows);
});

// RF-01: el administrador registra apartamentos
router.post('/', permitirRoles('administrador'), async (req, res) => {
  const { torre = '', numero } = req.body || {};
  if (!numero) return res.status(400).json({ error: 'El número de apartamento es obligatorio' });
  try {
    const { rows } = await db.query(
      'INSERT INTO apartamento (torre, numero) VALUES ($1, $2) RETURNING *',
      [String(torre).trim(), String(numero).trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese apartamento ya existe' });
    throw e;
  }
});

module.exports = router;
