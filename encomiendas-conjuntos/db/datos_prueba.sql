-- DATOS DE PRUEBA (no son datos reales). Contraseña de todos los usuarios: Prueba12345
-- pgcrypto permite generar el hash bcrypt directamente en SQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuario (nombre, correo, telefono, contrasena_hash, rol) VALUES
 ('Administrador Prueba',  'luis.carlos.ortiz145@gmail.com',      '3000000000', crypt('Prueba12345', gen_salt('bf', 10)), 'administrador'),
 ('Portero Prueba',        'luis.carlos.ortiz1451@gmail.com',    '3000000000', crypt('Prueba12345', gen_salt('bf', 10)), 'portero'),
 ('Residente Prueba Uno',  'luis.carlos.ortiz1452@gmail.com', '3000000000', crypt('Prueba12345', gen_salt('bf', 10)), 'residente'),
 ('Residente Prueba Dos',  'luis.carlos.ortiz1453@gmail.com', '3000000000', crypt('Prueba12345', gen_salt('bf', 10)), 'residente');

INSERT INTO apartamento (torre, numero) VALUES ('1', '101'), ('1', '102');

-- Cada residente queda asociado a su apartamento
INSERT INTO residente_apartamento (id_usuario, id_apartamento)
SELECT u.id_usuario, a.id_apartamento FROM usuario u, apartamento a
WHERE (u.correo = 'luis.carlos.ortiz1452@gmail.com' AND a.numero = '101')
   OR (u.correo = 'luis.carlos.ortiz1453@gmail.com' AND a.numero = '102');

-- Y con su autorización de uso de datos (Ley 1581 de 2012)
INSERT INTO consentimiento (id_usuario, finalidad)
SELECT id_usuario, 'Datos de prueba' FROM usuario WHERE rol = 'residente';
