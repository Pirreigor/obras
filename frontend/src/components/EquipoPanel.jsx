import { useEffect, useState } from "react";
import { apiFetch } from "../api";

const ROLES = ["ADMINISTRADOR", "SUPERVISOR", "RESIDENTE", "CALIDAD_PRODUCCION"];
const FORM_INICIAL = { email: "", rol: "RESIDENTE" };

function EquipoPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [form, setForm] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState("");

  async function load() {
    setLoading(true);
    setListError("");
    try {
      const [usuariosRes, invitacionesRes] = await Promise.all([
        apiFetch("/api/usuarios"),
        apiFetch("/api/auth/invitaciones"),
      ]);
      setUsuarios(usuariosRes.usuarios);
      setInvitaciones(invitacionesRes.invitaciones);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  const pendientes = invitaciones.filter((inv) => inv.estado === "PENDIENTE");

  return (
    <div className="panel-grid">
      <section className="panel-card">
        <h2>Equipo</h2>
        {listError && <div className="form-error">{listError}</div>}
        {loading ? (
          <p className="muted">Cargando...</p>
        ) : usuarios.length === 0 ? (
          <p className="muted">Todavia no hay usuarios.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>Invitaciones pendientes</h3>
        {!loading && pendientes.length === 0 ? (
          <p className="muted">No hay invitaciones pendientes.</p>
        ) : (
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
        )}
      </section>

      <section className="panel-card">
        <h2>Invitar a alguien</h2>
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
      </section>
    </div>
  );
}

export default EquipoPanel;
