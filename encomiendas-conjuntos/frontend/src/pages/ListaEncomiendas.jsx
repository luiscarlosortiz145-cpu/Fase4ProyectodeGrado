import { formatoFecha } from '../api.js';

// Tabla reutilizable para portero y residente
export default function ListaEncomiendas({ filas, accion, etiquetaAccion, siempre = false }) {
  if (!filas.length) return <p className="vacio">No hay encomiendas para mostrar.</p>;
  return (
    <table>
      <thead>
        <tr><th>Apto</th><th>Remitente / transportadora</th><th>Llegada</th><th>Estado</th>{accion && <th></th>}</tr>
      </thead>
      <tbody>
        {filas.map((e) => (
          <tr key={e.id_encomienda}>
            <td>{e.torre ? `${e.torre}-` : ''}{e.numero}</td>
            <td>{e.remitente_transportadora}</td>
            <td>{formatoFecha(e.fecha_recepcion)}</td>
            <td><span className={`estado ${e.estado}`}>{e.estado}</span></td>
            {accion && (
              <td>{(siempre || e.estado !== 'entregada') && <button onClick={() => accion(e)}>{etiquetaAccion}</button>}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
