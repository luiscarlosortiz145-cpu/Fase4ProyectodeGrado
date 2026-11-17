# Sistema web para la gestión de recepción y entrega de encomiendas en conjuntos residenciales

Prototipo del proyecto de grado (Ingeniería de Sistemas, UNAD). Permite al portero registrar las
encomiendas que llegan, avisar al residente y confirmar la entrega con un soporte, dejando la
trazabilidad completa de cada paquete.

**Estado del prototipo (avance por sprints)**

| Sprint | Contenido | Estado |
|---|---|---|
| 1 | Base de datos y configuración del proyecto | Hecho |
| 2 | Inicio de sesión por rol y gestión de apartamentos y residentes (RF-01, RF-02) | Hecho |
| 3 | Registro de encomiendas (RF-03) | Hecho |
| 4 | Notificación al residente (RF-04) | Hecho: correo real por SMTP (modo simulado disponible) |
| 5 | Consulta de estado (RF-05) | Hecho (API) |
| 6 | Confirmación de entrega con soporte (RF-06) | Hecho (API) |
| 7 | Historial y filtro de pendientes (RF-07, RF-08) | Hecho (API) |
| 8a | Interfaz web (React): login, portero, residente y administrador | Hecho |
| 8b | Pruebas de usabilidad y despliegue | Pendiente |

## Tecnologías
Node.js + Express (API REST), PostgreSQL, JWT para la autenticación, bcrypt para las contraseñas.
Frontend en React con Vite.

## Requisitos
- Node.js 18 o superior
- PostgreSQL 14 o superior

## Instalación
```bash
# 1. Crear la base de datos
psql -U postgres -c "CREATE DATABASE encomiendas;"

# 2. Instalar dependencias y configurar
cd backend
npm install
cp .env.example .env      # en Windows: copy .env.example .env
# edita .env con tu usuario/contraseña de PostgreSQL y un JWT_SECRET propio

# 3. Crear tablas y cargar DATOS DE PRUEBA
npm run db:init

# 4. Ejecutar
npm run dev               # API en http://localhost:3000
npm test                  # pruebas funcionales

# 5. En otra terminal, la interfaz web
cd ../frontend
npm install
npm run dev               # abre http://localhost:5173
```

**Alternativa manual (sin `npm run db:init`):** en pgAdmin, sobre la base `encomiendas`, abre *Query Tool* y ejecuta primero `db/schema.sql` y después `db/datos_prueba.sql`.

Usuarios de prueba (contraseña `Prueba12345`): `admin@prueba.test`, `portero@prueba.test`,
`residente1@prueba.test`, `residente2@prueba.test`. **Son datos de prueba, no reales.**

## Endpoints principales
| Método | Ruta | Rol | Requisito |
|---|---|---|---|
| POST | `/api/auth/login` | todos | RF-02 |
| POST/GET | `/api/apartamentos` | administrador (GET también portero) | RF-01 |
| POST/GET | `/api/residentes` | administrador | RF-01 |
| POST | `/api/encomiendas` | portero | RF-03, RF-04 |
| GET | `/api/encomiendas?pendientes=true&id_apartamento=&fecha=&estado=` | portero, administrador, residente (solo las suyas) | RF-05, RF-07, RF-08 |
| GET | `/api/encomiendas/:id` | portero, administrador, residente (solo las suyas) | RF-05 |
| POST | `/api/encomiendas/:id/entrega` | portero | RF-06 |

## Estructura
```
db/schema.sql          esquema de la base de datos
backend/src            API (rutas, middleware, servicios)
backend/scripts        inicialización de la base de datos con datos de prueba
backend/test           pruebas funcionales
frontend/src           interfaz web en React (páginas por rol)
```
