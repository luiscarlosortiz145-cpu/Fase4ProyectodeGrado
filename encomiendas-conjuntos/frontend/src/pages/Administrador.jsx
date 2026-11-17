import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Administrador() {
  const [aptos, setAptos] = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [msg, setMsg] = useState(null);
  const [apto, setApto] = useState({ torre: '', numero: '' });
  const vacio = { nombre: '', correo: '', telefono: '', contrasena: '', id_apartamento: '', consentimiento: false };
  const [res, setRes] = useState(vacio);

  async function cargar() {
    setAptos(await api('GET', '/apartamentos'));
    setResidentes(await api('GET', '/residentes'));
  }
  useEffect(() => { cargar().catch((e) => setMsg({ tipo: 'error', texto: e.message })); }, []);

  async function crearApto(e) {
    e.preventDefault(); setMsg(null);
    try { await api('POST', '/apartamentos', apto); setApto({ torre: '', numero: '' }); setMsg({ tipo: 'ok', texto: 'Apartamento registrado.' }); cargar(); }
    catch (err) { setMsg({ tipo: 'error', texto: err.message }); }
  }
  async function crearRes(e) {
    e.preventDefault(); setMsg(null);
    try { await api('POST', '/residentes', res); setRes(vacio); setMsg({ tipo: 'ok', texto: 'Residente registrado.' }); cargar(); }
    catch (err) { setMsg({ tipo: 'error', texto: err.message }); }
  }

  return (
    <main>
      {msg && <p className={msg.tipo === 'ok' ? 'ok' : 'error'} role="status">{msg.texto}</p>}
      <section className="tarjeta">
        <h2>Apartamentos</h2>
        <form onSubmit={crearApto} className="fila">
          <label>Torre <input value={apto.torre} onChange={(e) => setApto({ ...apto, torre: e.target.value })} /></label>
          <label>Número <input value={apto.numero} onChange={(e) => setApto({ ...apto, numero: e.target.value })} required /></label>
          <button type="submit">Agregar</button>
        </form>
        <p>{aptos.map((a) => `${a.torre ? a.torre + '-' : ''}${a.numero}`).join(' · ') || 'Sin apartamentos'}</p>
      </section>
      <section className="tarjeta">
        <h2>Nuevo residente</h2>
        <form onSubmit={crearRes} className="fila">
          <label>Nombre <input value={res.nombre} onChange={(e) => setRes({ ...res, nombre: e.target.value })} required /></label>
          <label>Correo <input type="email" value={res.correo} onChange={(e) => setRes({ ...res, correo: e.target.value })} required /></label>
          <label>Teléfono <input value={res.telefono} onChange={(e) => setRes({ ...res, telefono: e.target.value })} /></label>
          <label>Contraseña inicial <input type="password" minLength={8} value={res.contrasena} onChange={(e) => setRes({ ...res, contrasena: e.target.value })} required /></label>
          <label>Apartamento
            <select value={res.id_apartamento} onChange={(e) => setRes({ ...res, id_apartamento: e.target.value })} required>
              <option value="">Selecciona…</option>
              {aptos.map((a) => <option key={a.id_apartamento} value={a.id_apartamento}>{a.torre ? `${a.torre}-` : ''}{a.numero}</option>)}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={res.consentimiento} onChange={(e) => setRes({ ...res, consentimiento: e.target.checked })} />
            El residente autoriza el uso de sus datos para gestionar sus encomiendas (Ley 1581 de 2012)
          </label>
          <button type="submit">Registrar residente</button>
        </form>
      </section>
      <section className="tarjeta">
        <h2>Residentes</h2>
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Apto</th></tr></thead>
          <tbody>{residentes.map((r) => <tr key={r.id_usuario}><td>{r.nombre}</td><td>{r.correo}</td><td>{r.torre ? `${r.torre}-` : ''}{r.numero}</td></tr>)}</tbody>
        </table>
      </section>
    </main>
  );
}
