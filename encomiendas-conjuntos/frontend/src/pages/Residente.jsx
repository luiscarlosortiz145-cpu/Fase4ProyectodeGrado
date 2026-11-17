import { useEffect, useState } from 'react';
import { api, formatoFecha } from '../api.js';
import ListaEncomiendas from './ListaEncomiendas.jsx';

export default function Residente() {
  const [filas, setFilas] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('GET', '/encomiendas').then(setFilas).catch((e) => setError(e.message)); }, []);

  async function ver(e) { setDetalle(await api('GET', `/encomiendas/${e.id_encomienda}`)); }

  return (
    <main>
      <section className="tarjeta">
        <h2>Mis encomiendas</h2>
        {error && <p className="error">{error}</p>}
        <ListaEncomiendas filas={filas} accion={ver} etiquetaAccion="Ver detalle" siempre />
      </section>
      {detalle && (
        <section className="tarjeta">
          <h3>Seguimiento · {detalle.remitente_transportadora}</h3>
          <ul className="linea">
            <li>Recibida en portería: {formatoFecha(detalle.fecha_recepcion)}</li>
            {detalle.notificaciones.map((n, i) => <li key={i}>Aviso por {n.canal}: {formatoFecha(n.fecha_envio)} ({n.resultado})</li>)}
            {detalle.entrega && <li>Entregada a {detalle.entrega.nombre_quien_retira}: {formatoFecha(detalle.entrega.fecha_entrega)}</li>}
          </ul>
        </section>
      )}
    </main>
  );
}
