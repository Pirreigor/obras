import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";

const ROLES = ["ADMINISTRADOR", "SUPERVISOR", "RESIDENTE", "CALIDAD_PRODUCCION"];
const FORM_INICIAL = { email: "", rol: "RESIDENTE" };

function EquipoPanel({ currentUser }) {
  const puedeGestionarVistas = currentUser?.rol === "ADMINISTRADOR";

  const [usuarios, setUsuarios] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [vistas, setVistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [form, setForm] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [mostrarModalInvitar, setMostrarModalInvitar] = useState(false);

  const [vistasUsuarioId, setVistasUsuarioId] = useState(null);
  const [vistasAsignadas, setVistasAsignadas] = useState([]);
  const [loadingVistas, setLoadingVistas] = useState(false);
  const [savingVistas, setSavingVistas] = useState(false);
  const [savedVistas, setSavedVistas] = useState(false);
  const [vistasError, setVistasError] = useState("");

  async function load() {
    setLoading(true);
    setListError("");
    try {
      const peticiones = [apiFetch("/api/usuarios"), apiFetch("/api/auth/invitaciones")];
      if (puedeGestionarVistas) {
        peticiones.push(apiFetch("/api/vistas"));
      }
      const [usuariosRes, invitacionesRes, vistasRes] = await Promise.all(peticiones);
      setUsuarios(usuariosRes.usuarios);
      setInvitaciones(invitacionesRes.invitaciones);
      if (vistasRes) {
        setVistas(vistasRes.vistas);
      }
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleOpenModalInvitar() {
    setForm(FORM_INICIAL);
    setInviteError("");
    setLastInviteLink("");
    setMostrarModalInvitar(true);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteError("");
    setLastInviteLink("");
    setSubmitting(true);
    try {
      const data = await apiFetch("/api/auth/invitaciones", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(FORM_INICIAL);
      setLastInviteLink(`${window.location.origin}/aceptar-invitacion?token=${data.invitacion.token}`);
      await load();
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id) {
    try {
      await apiFetch(`/api/auth/invitaciones/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setListError(err.message);
    }
  }

  async function handleToggleVistas(usuario) {
    if (vistasUsuarioId === usuario.id) {
      setVistasUsuarioId(null);
      return;
    }

    setVistasUsuarioId(usuario.id);
    setVistasError("");
    setSavedVistas(false);
    setLoadingVistas(true);
    try {
      const data = await apiFetch(`/api/usuarios/${usuario.id}/vistas`);
      setVistasAsignadas(data.vistas.map((v) => v.id));
    } catch (err) {
      setVistasError(err.message);
    } finally {
      setLoadingVistas(false);
    }
  }

  function toggleVista(vistaId) {
    setSavedVistas(false);
    setVistasAsignadas((prev) =>
      prev.includes(vistaId) ? prev.filter((id) => id !== vistaId) : [...prev, vistaId]
    );
  }

  async function handleSaveVistas() {
    setSavingVistas(true);
    setVistasError("");
    setSavedVistas(false);
    try {
      await apiFetch(`/api/usuarios/${vistasUsuarioId}/vistas`, {
        method: "PUT",
        body: JSON.stringify({ vistaIds: vistasAsignadas }),
      });
      setSavedVistas(true);
    } catch (err) {
      setVistasError(err.message);
    } finally {
      setSavingVistas(false);
    }
  }

  const pendientes = invitaciones.filter((inv) => inv.estado === "PENDIENTE");
  const usuarioSeleccionado = usuarios.find((u) => u.id === vistasUsuarioId);

  return (
    <>
      <section className="panel-card">
        <div className="panel-card-header">
          <h2>Equipo</h2>
          <button className="btn-small" type="button" onClick={handleOpenModalInvitar}>
            + Invitar
          </button>
        </div>
        {listError && <div className="form-error">{listError}</div>}
        {loading ? (
          <p className="muted">Cargando...</p>
        ) : usuarios.length === 0 ? (
          <p className="muted">Todavia no hay usuarios.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  {puedeGestionarVistas && <th>Vistas</th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.name}</td>
                    <td>{usuario.email}</td>
                    <td>
                      <span className="role-pill">{usuario.rol}</span>
                    </td>
                    {puedeGestionarVistas && (
                      <td>
                        {usuario.rol === "ADMINISTRADOR" ? (
                          <span className="muted">Acceso total</span>
                        ) : (
                          <button className="btn-link" type="button" onClick={() => handleToggleVistas(usuario)}>
                            {vistasUsuarioId === usuario.id ? "Cerrar" : "Gestionar vistas"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {puedeGestionarVistas && usuarioSeleccionado && (
          <div className="vista-block">
            <h3>Vistas de {usuarioSeleccionado.name}</h3>
            {vistasError && <div className="form-error">{vistasError}</div>}
            {loadingVistas ? (
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
                        checked={vistasAsignadas.includes(vista.id)}
                        onChange={() => toggleVista(vista.id)}
                      />
                      {vista.nombre}
                    </label>
                  ))}
                </div>
                <button
                  className="btn-primary vista-block"
                  type="button"
                  onClick={handleSaveVistas}
                  disabled={savingVistas}
                >
                  {savingVistas ? "Guardando..." : "Guardar"}
                </button>
                {savedVistas && <p className="muted save-msg">Guardado.</p>}
              </>
            )}
          </div>
        )}

        <h3>Invitaciones pendientes</h3>
        {!loading && pendientes.length === 0 ? (
          <p className="muted">No hay invitaciones pendientes.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Vence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((invitacion) => (
                  <tr key={invitacion.id}>
                    <td>{invitacion.email}</td>
                    <td>
                      <span className="role-pill">{invitacion.rol}</span>
                    </td>
                    <td>{new Date(invitacion.expiresAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-link" type="button" onClick={() => handleRevoke(invitacion.id)}>
                        Revocar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarModalInvitar && (
        <Modal title="Invitar a alguien" onClose={() => setMostrarModalInvitar(false)}>
          <p className="muted">
            Todavia no se envia el correo automaticamente: copia el enlace y compartilo vos mientras tanto.
          </p>
          {inviteError && <div className="form-error">{inviteError}</div>}
          <form className="stacked-form" onSubmit={handleInvite}>
            <div className="field">
              <label htmlFor="inviteEmail">Email</label>
              <input
                id="inviteEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="inviteRol">Rol</label>
              <select id="inviteRol" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES.map((rol) => (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Generando..." : "Generar invitacion"}
            </button>
          </form>
          {lastInviteLink && (
            <div className="invite-link-box">
              <p className="muted">Enlace de invitacion:</p>
              <code>{lastInviteLink}</code>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export default EquipoPanel;
