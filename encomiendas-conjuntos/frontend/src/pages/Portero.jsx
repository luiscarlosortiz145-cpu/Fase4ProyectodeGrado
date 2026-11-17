import { useEffect, useState } from 'react';
import { api, fotoComoTexto } from '../api.js';
import ListaEncomiendas from './ListaEncomiendas.jsx';

export default function Portero() {
  const [aptos, setAptos] = useState([]);
  const [filas, setFilas] = useState([]);
  const [filtroApto, setFiltroApto] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [solo, setSolo] = useState(true);
  const [msg, setMsg] = useState(null); // {tipo, texto}
  const [form, setForm] = useState({ id_apartamento: '', remitente_transportadora: '', descripcion: '' });
  const [entrega, setEntrega] = useState(null); // encomienda seleccionada
  const [retira, setRetira] = useState('');
  const [foto, setFoto] = useState(null);

  async function cargar() {
    const p = new URLSearchParams();
    if (solo) p.set('pendientes', 'true');
    if (filtroApto) p.set('id_apartamento', filtroApto);
    if (filtroFecha) p.set('fecha', filtroFecha);
    setFilas(await api('GET', '/encomiendas?' + p.toString()));
  }
  useEffect(() => { api('GET', '/apartamentos').then(setAptos).catch(() => {}); }, []);
  useEffect(() => { cargar().catch((e) => setMsg({ tipo: 'error', texto: e.message })); }, [solo, filtroApto, filtroFecha]);

  async function registrar(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await api('POST', '/encomiendas', form);
      const falla = r.notificaciones.some((n) => n.resultado === 'fallido');
      setMsg({
        tipo: falla ? 'error' : 'ok',
        texto: falla ? 'Encomienda registrada, pero falló el aviso al residente.' : 'Encomienda registrada y residente notificado.',
      });
      setForm({ id_apartamento: form.id_apartamento, remitente_transportadora: '', descripcion: '' });
      cargar();
    } catch (err) { setMsg({ tipo: 'error', texto: err.message }); }
  }

  async function confirmar(e) {
    e.preventDefault();
    setMsg(null);
    try {
      if (!foto) throw new Error('Adjunta la foto del soporte de entrega');
      await api('POST', `/encomiendas/${entrega.id_encomienda}/entrega`, { nombre_quien_retira: retira, soporte: foto });
      setEntrega(null); setRetira(''); setFoto(null);
      setMsg({ tipo: 'ok', texto: 'Entrega confirmada.' });
      cargar();
    } catch (err) { setMsg({ tipo: 'error', texto: err.message }); }
  }

  return (
    <main>
      {msg && <p className={msg.tipo === 'ok' ? 'ok' : 'error'} role="status">{msg.texto}</p>}

      <section className="tarjeta">
        <h2>Nueva encomienda</h2>
        <form onSubmit={registrar} className="fila">
          <label>Apartamento
            <select value={form.id_apartamento} onChange={(e) => setForm({ ...form, id_apartamento: e.target.value })} required>
              <option value="">Selecciona…</option>
              {aptos.map((a) => <option key={a.id_apartamento} value={a.id_apartamento}>{a.torre ? `${a.torre}-` : ''}{a.numero}</option>)}
            </select>
          </label>
          <label>Remitente / transportadora
            <input value={form.remitente_transportadora} onChange={(e) => setForm({ ...form, remitente_transportadora: e.target.value })} required />
          </label>
          <label>Descripción (opcional)
            <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </label>
          <button type="submit">Registrar y notificar</button>
        </form>
      </section>

      <section className="tarjeta">
        <h2>Encomiendas</h2>
        <div className="fila filtros">
          <label>Apartamento
            <select value={filtroApto} onChange={(e) => setFiltroApto(e.target.value)}>
              <option value="">Todos</option>
              {aptos.map((a) => <option key={a.id_apartamento} value={a.id_apartamento}>{a.torre ? `${a.torre}-` : ''}{a.numero}</option>)}
            </select>
          </label>
          <label>Fecha
            <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} /> Solo pendientes
          </label>
        </div>
        <ListaEncomiendas filas={filas} accion={setEntrega} etiquetaAccion="Entregar" />
      </section>

      {entrega && (
        <div className="fondo" role="dialog" aria-modal="true">
          <form className="tarjeta modal" onSubmit={confirmar}>
            <h2>Confirmar entrega</h2>
            <p>Apto {entrega.numero} · {entrega.remitente_transportadora}</p>
            <label>Nombre de quien retira
              <input value={retira} onChange={(e) => setRetira(e.target.value)} required />
            </label>
            <label>Foto del soporte
              <input type="file" accept="image/*" capture="environment"
                onChange={async (e) => e.target.files[0] && setFoto(await fotoComoTexto(e.target.files[0]))} />
            </label>
            {foto && <img src={foto} alt="Vista previa del soporte" className="previa" />}
            <div className="fila">
              <button type="submit">Confirmar entrega</button>
              <button type="button" className="secundario" onClick={() => { setEntrega(null); setFoto(null); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
