// Cliente sencillo para la API. El token se guarda en sessionStorage.
const clave = 'encomiendas_sesion';

export const sesion = {
  leer() {
    try { return JSON.parse(sessionStorage.getItem(clave)); } catch { return null; }
  },
  guardar(s) { try { sessionStorage.setItem(clave, JSON.stringify(s)); } catch { /* sin almacenamiento */ } },
  borrar() { try { sessionStorage.removeItem(clave); } catch { /* sin almacenamiento */ } },
};

export async function api(metodo, ruta, cuerpo) {
  const s = sesion.leer();
  const r = await fetch('/api' + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: `Bearer ${s.token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || 'Error de comunicación con el servidor');
  return datos;
}

// Reduce la foto para que el soporte no pese demasiado (máx. 800 px, JPEG)
export function fotoComoTexto(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = reject;
    lector.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const escala = Math.min(1, 800 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

export const formatoFecha = (f) =>
  new Date(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
