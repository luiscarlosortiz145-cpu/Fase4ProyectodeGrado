// Crea las tablas y carga DATOS DE PRUEBA (no son datos reales de ningún conjunto).
// Uso: npm run db:init
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  await db.query(schema);

  const hash = await bcrypt.hash('Prueba12345', 10);
  const u = (nombre, correo, rol) =>
    db.query(
      `INSERT INTO usuario (nombre, correo, telefono, contrasena, rol)
       VALUES ($1,$2,'3000000000',$3,$4) RETURNING id_usuario`, [nombre, correo, hash, rol]);

  await u('Administrador Prueba', 'admin@prueba.test', 'administrador');
  await u('Portero Prueba', 'portero@prueba.test', 'portero');
  const r1 = (await u('Residente Prueba Uno', 'residente1@prueba.test', 'residente')).rows[0].id_usuario;
  const r2 = (await u('Residente Prueba Dos', 'residente2@prueba.test', 'residente')).rows[0].id_usuario;

  const a1 = (await db.query("INSERT INTO apartamento (torre, numero) VALUES ('1','101') RETURNING id_apartamento")).rows[0].id_apartamento;
  const a2 = (await db.query("INSERT INTO apartamento (torre, numero) VALUES ('1','102') RETURNING id_apartamento")).rows[0].id_apartamento;

  for (const [uid, aid] of [[r1, a1], [r2, a2]]) {
    await db.query('INSERT INTO residente_apartamento (id_usuario, id_apartamento) VALUES ($1,$2)', [uid, aid]);
    await db.query("INSERT INTO consentimiento (id_usuario, finalidad) VALUES ($1,'Datos de prueba')", [uid]);
  }
  console.log('Base de datos lista con datos de prueba. Contraseña de todos los usuarios: Prueba12345');
  await db.pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
