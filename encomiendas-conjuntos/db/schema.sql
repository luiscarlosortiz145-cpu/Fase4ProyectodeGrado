-- Esquema de base de datos (PostgreSQL) - Sistema de encomiendas
DROP TABLE IF EXISTS entrega, notificacion, encomienda, consentimiento, residente_apartamento, apartamento, usuario CASCADE;

CREATE TABLE usuario (
  id_usuario      SERIAL PRIMARY KEY,
  nombre          VARCHAR(120) NOT NULL,
  correo          VARCHAR(160) NOT NULL UNIQUE,
  telefono        VARCHAR(20),
  contrasena VARCHAR(100) NOT NULL,
  rol             VARCHAR(15)  NOT NULL CHECK (rol IN ('portero','residente','administrador')),
  activo          BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE apartamento (
  id_apartamento SERIAL PRIMARY KEY,
  torre          VARCHAR(10) NOT NULL DEFAULT '',
  numero         VARCHAR(10) NOT NULL,
  UNIQUE (torre, numero)
);

CREATE TABLE residente_apartamento (
  id              SERIAL PRIMARY KEY,
  id_usuario      INT NOT NULL REFERENCES usuario(id_usuario),
  id_apartamento  INT NOT NULL REFERENCES apartamento(id_apartamento),
  fecha_inicio    DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin       DATE
);

CREATE TABLE consentimiento (
  id_consentimiento SERIAL PRIMARY KEY,
  id_usuario        INT NOT NULL REFERENCES usuario(id_usuario),
  fecha             TIMESTAMP NOT NULL DEFAULT NOW(),
  finalidad         VARCHAR(200) NOT NULL,
  vigente           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE encomienda (
  id_encomienda            SERIAL PRIMARY KEY,
  id_apartamento           INT NOT NULL REFERENCES apartamento(id_apartamento),
  id_portero               INT NOT NULL REFERENCES usuario(id_usuario),
  remitente_transportadora VARCHAR(120) NOT NULL,
  descripcion              VARCHAR(250),
  fecha_recepcion          TIMESTAMP NOT NULL DEFAULT NOW(),
  estado                   VARCHAR(12) NOT NULL DEFAULT 'recibida'
                           CHECK (estado IN ('recibida','notificada','entregada'))
);

CREATE TABLE notificacion (
  id_notificacion SERIAL PRIMARY KEY,
  id_encomienda   INT NOT NULL REFERENCES encomienda(id_encomienda),
  id_usuario      INT NOT NULL REFERENCES usuario(id_usuario),
  canal           VARCHAR(10) NOT NULL CHECK (canal IN ('correo','whatsapp')),
  fecha_envio     TIMESTAMP NOT NULL DEFAULT NOW(),
  resultado       VARCHAR(20) NOT NULL
);

CREATE TABLE entrega (
  id_entrega          SERIAL PRIMARY KEY,
  id_encomienda       INT NOT NULL UNIQUE REFERENCES encomienda(id_encomienda),
  id_portero          INT NOT NULL REFERENCES usuario(id_usuario),
  nombre_quien_retira VARCHAR(120) NOT NULL,
  soporte_url         TEXT NOT NULL,
  fecha_entrega       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_encomienda_apto_estado ON encomienda (id_apartamento, estado);
CREATE INDEX idx_encomienda_fecha ON encomienda (fecha_recepcion);
