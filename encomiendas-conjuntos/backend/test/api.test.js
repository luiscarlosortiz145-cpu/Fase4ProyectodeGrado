// Pruebas funcionales de la API. Requieren la base de datos inicializada (npm run db:init).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-pruebas';
const app = require('../src/app');
const db = require('../src/db');

// Correos de los usuarios de prueba. Si cambiaste los correos en datos_prueba.sql,
// ponlos aquí (o defínelos como variables de entorno).
const CORREO_ADMIN = process.env.TEST_CORREO_ADMIN || 'admin@prueba.test';
const CORREO_PORTERO = process.env.TEST_CORREO_PORTERO || 'portero@prueba.test';
const CORREO_RESIDENTE1 = process.env.TEST_CORREO_RESIDENTE1 || 'residente1@prueba.test';
const CORREO_RESIDENTE2 = process.env.TEST_CORREO_RESIDENTE2 || 'residente2@prueba.test';

let server, base;
before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { server.close(); await db.pool.end(); });

async function llamar(metodo, ruta, token, cuerpo) {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: r.status, body: await r.json() };
}
const login = async (correo) => (await llamar('POST', '/auth/login', null, { correo, contrasena: 'Prueba12345' })).body.token;

test('RF-02: login correcto e incorrecto', async () => {
  const ok = await llamar('POST', '/auth/login', null, { correo: CORREO_PORTERO, contrasena: 'Prueba12345' });
  assert.equal(ok.status, 200); assert.equal(ok.body.usuario.rol, 'portero');
  const mal = await llamar('POST', '/auth/login', null, { correo: CORREO_PORTERO, contrasena: 'incorrecta' });
  assert.equal(mal.status, 401);
});

test('RN-05: el residente no puede registrar encomiendas ni entrar a rutas de administrador', async () => {
  const t = await login(CORREO_RESIDENTE1);
  assert.equal((await llamar('POST', '/encomiendas', t, { id_apartamento: 1, remitente_transportadora: 'X' })).status, 403);
  assert.equal((await llamar('GET', '/residentes', t)).status, 403);
  assert.equal((await llamar('GET', '/encomiendas')).status, 401);
});

test('RF-01 / RN-01: residente sin consentimiento no se registra; con consentimiento sí', async () => {
  const t = await login(CORREO_ADMIN);
  const aptos = (await llamar('GET', '/apartamentos', t)).body;
  const base1 = { nombre: 'Nuevo Residente', correo: `nuevo${Date.now()}@prueba.test`, contrasena: 'ClaveSegura1', id_apartamento: aptos[0].id_apartamento };
  assert.equal((await llamar('POST', '/residentes', t, base1)).status, 400);
  const ok = await llamar('POST', '/residentes', t, { ...base1, consentimiento: true });
  assert.equal(ok.status, 201);
});

test('RF-03/04/05/06/07/08: flujo completo de una encomienda', async () => {
  const portero = await login(CORREO_PORTERO);
  const r1 = await login(CORREO_RESIDENTE1);
  const r2 = await login(CORREO_RESIDENTE2);
  const aptos = (await llamar('GET', '/apartamentos', portero)).body;
  const apto101 = aptos.find((a) => a.numero === '101').id_apartamento;

  // validaciones
  assert.equal((await llamar('POST', '/encomiendas', portero, { id_apartamento: apto101 })).status, 400);
  assert.equal((await llamar('POST', '/encomiendas', portero, { id_apartamento: 99999, remitente_transportadora: 'X' })).status, 422);

  // RF-03 + RF-04
  const c = await llamar('POST', '/encomiendas', portero, { id_apartamento: apto101, remitente_transportadora: 'Transportadora de prueba' });
  assert.equal(c.status, 201);
  assert.equal(c.body.estado, 'notificada');
  assert.ok(c.body.notificaciones.length >= 1);
  const id = c.body.id_encomienda;

  // RF-05: detalle con trazabilidad; el residente 2 no ve la encomienda del apto 101
  const det = await llamar('GET', `/encomiendas/${id}`, r1);
  assert.equal(det.status, 200); assert.equal(det.body.estado, 'notificada');
  assert.equal((await llamar('GET', `/encomiendas/${id}`, r2)).status, 404);

  // RF-08: pendientes
  const pend = await llamar('GET', `/encomiendas?pendientes=true&id_apartamento=${apto101}`, portero);
  assert.ok(pend.body.some((e) => e.id_encomienda === id));

  // RF-06: entrega exige soporte
  assert.equal((await llamar('POST', `/encomiendas/${id}/entrega`, portero, { nombre_quien_retira: 'Residente Prueba Uno' })).status, 400);
  const ent = await llamar('POST', `/encomiendas/${id}/entrega`, portero, { nombre_quien_retira: 'Residente Prueba Uno', soporte: 'data:image/png;base64,AAAA' });
  assert.equal(ent.status, 201); assert.equal(ent.body.estado, 'entregada');
  assert.equal((await llamar('POST', `/encomiendas/${id}/entrega`, portero, { nombre_quien_retira: 'X', soporte: 'Y' })).status, 409);

  // RF-07: historial del residente solo con sus encomiendas; ya no aparece como pendiente
  const hist = await llamar('GET', '/encomiendas', r1);
  assert.ok(hist.body.length >= 1 && hist.body.every((e) => e.id_apartamento === apto101));
  const pend2 = await llamar('GET', '/encomiendas?pendientes=true', portero);
  assert.ok(!pend2.body.some((e) => e.id_encomienda === id));
});
