// En build de produccion sin VITE_API_URL, usa rutas relativas al mismo
// dominio (Nginx proxya /api/ al backend). En dev, apunta al backend local.
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:4100");

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("obras_token");
  // Si el body es FormData (subida de archivos), no se fuerza el
  // Content-Type: el browser tiene que fijar el boundary del multipart.
  const esFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = { ...(esFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || "Error inesperado");
    error.status = res.status;
    throw error;
  }

  return data;
}

// Para endpoints que devuelven un archivo (ej. exportar a Excel) en vez
// de JSON: hace el fetch con el token de auth y dispara la descarga.
async function apiDownload(path, filenameFallback) {
  const token = localStorage.getItem("obras_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "No se pudo descargar el archivo");
  }

  const disposicion = res.headers.get("Content-Disposition") || "";
  const match = disposicion.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : filenameFallback;

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = filename;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}

export { API_URL, apiFetch, apiDownload };
