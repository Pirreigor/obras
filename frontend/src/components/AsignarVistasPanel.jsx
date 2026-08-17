import { useEffect, useState } from "react";
import { apiFetch } from "../api";

function AsignarVistasPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [vistas, setVistas] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [asignadas, setAsignadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAsignadas, setLoadingAsignadas] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [usuariosRes, vistasRes] = await Promise.all([
          apiFetch("/api/usuarios"),
          apiFetch("/api/vistas"),
        ]);
        setUsuarios(usuariosRes.usuarios);
        setVistas(vistasRes.vistas);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSelectUser(id) {
    setSelectedUserId(id);
    setSaved(false);
    setError("");
    if (!id) {
      setAsignadas([]);
      return;
    }
    setLoadingAsignadas(true);
    try {
      const data = await apiFetch(`/api/usuarios/${id}/vistas`);
      setAsignadas(data.vistas.map((v) => v.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAsignadas(false);
    }
  }

  function toggleVista(vistaId) {
    setSaved(false);
    setAsignadas((prev) =>
      prev.includes(vistaId) ? prev.filter((id) => id !== vistaId) : [...prev, vistaId]
    );
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await apiFetch(`/api/usuarios/${selectedUserId}/vistas`, {
        method: "PUT",
        body: JSON.stringify({ vistaIds: asignadas }),
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedUser = usuarios.find((u) => String(u.id) === String(selectedUserId));
  const esAdministrador = selectedUser?.rol === "ADMINISTRADOR";

  return (
    <div className="panel-grid">
      <section className="panel-card">
        <h2>Asignar vistas</h2>
        <p className="muted">
          Elegi que puede ver cada persona, sin importar su rol. El Administrador ya tiene acceso a todo.
        </p>

        {error && <div className="form-error">{error}</div>}

        {loading ? (
          <p className="muted">Cargando...</p>
        ) : (
          <div className="field">
            <label htmlFor="usuarioSelect">Usuario</label>
            <select
              id="usuarioSelect"
              value={selectedUserId}
              onChange={(e) => handleSelectUser(e.target.value)}
            >
              <option value="">Selecciona un usuario</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.name} ({usuario.rol})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedUserId && esAdministrador && (
          <p className="muted vista-block">
            Los Administradores ya tienen acceso a todo; no hace falta asignarles vistas.
          </p>
        )}

        {selectedUserId && !esAdministrador && (
          <div className="vista-block">
            {loadingAsignadas ? (
              <p className="muted">Cargando vistas...</p>
            ) : vistas.length === 0 ? (
              <p className="muted">Todavia no hay vistas en el catalogo.</p>
            ) : (
              <>
                <div className="vista-checklist">
                  {vistas.map((vista) => (
                    <label key={vista.id} className="vista-check">
                      <input
                        type="checkbox"
                        checked={asignadas.includes(vista.id)}
                        onChange={() => toggleVista(vista.id)}
                      />
                      {vista.nombre}
                    </label>
                  ))}
                </div>
                <button className="btn-primary vista-block" type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                {saved && <p className="muted save-msg">Guardado.</p>}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AsignarVistasPanel;
