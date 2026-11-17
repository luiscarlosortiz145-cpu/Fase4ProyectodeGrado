require('dotenv').config();
require('express-async-errors'); // permite que los errores async lleguen al manejador de errores
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // el soporte (foto/firma) llega como texto base64

app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/apartamentos', require('./routes/apartamentos'));
app.use('/api/residentes', require('./routes/residentes'));
app.use('/api/encomiendas', require('./routes/encomiendas'));

// Manejo de errores (Express 4 no captura promesas rechazadas, se envuelven abajo)
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
