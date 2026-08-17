// En build de produccion sin VITE_API_URL, usa rutas relativas al mismo
// dominio (Nginx proxya /api/ al backend). En dev, apunta al backend local.
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:4100");

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("obras_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
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

export { API_URL, apiFetch };
