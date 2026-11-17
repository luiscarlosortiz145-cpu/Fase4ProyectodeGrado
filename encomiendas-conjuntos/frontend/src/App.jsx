import { useState } from 'react';
import { api, sesion } from './api.js';
import Portero from './pages/Portero.jsx';
import Residente from './pages/Residente.jsx';
import Administrador from './pages/Administrador.jsx';

function Login({ alEntrar }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault();
    setError('');
    try {
      const r = await api('POST', '/auth/login', { correo, contrasena });
      sesion.guardar(r);
      alEntrar(r);
    } catch (err) { setError(err.message); }
  }

  return (
    <main className="tarjeta login">
      <h1>Encomiendas del conjunto</h1>
      <form onSubmit={enviar}>
        <label>Correo
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoFocus />
        </label>
        <label>Contraseña
          <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit">Ingresar</button>
      </form>
    </main>
  );
}

export default function App() {
  const [s, setS] = useState(sesion.leer());

  function salir() { sesion.borrar(); setS(null); }

  if (!s) return <Login alEntrar={setS} />;

  const vistas = { portero: Portero, residente: Residente, administrador: Administrador };
  const Vista = vistas[s.usuario.rol];
  return (
    <>
      <header className="barra">
        <strong>Encomiendas</strong>
        <span>{s.usuario.nombre} · {s.usuario.rol}</span>
        <button className="secundario" onClick={salir}>Salir</button>
      </header>
      <Vista />
    </>
  );
}
