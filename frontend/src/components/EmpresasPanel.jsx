import { useEffect, useState } from "react";
import { apiFetch } from "../api";

const FORM_INICIAL = { nombre: "", adminName: "", adminEmail: "", adminPassword: "" };

function EmpresasPanel() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setListError("");
    try {
      const data = await apiFetch("/api/empresas");
      setEmpresas(data.empresas);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await apiFetch("/api/empresas", { method: "POST", body: JSON.stringify(form) });
      setForm(FORM_INICIAL);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel-grid">
      <section className="panel-card">
        <h2>Empresas</h2>
        {listError && <div className="form-error">{listError}</div>}
        {loading ? (
          <p className="muted">Cargando...</p>
        ) : empresas.length === 0 ? (
          <p className="muted">Todavia no hay empresas.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Creada</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id}>
                  <td>{empresa.nombre}</td>
                  <td>{new Date(empresa.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel-card">
        <h2>Agregar empresa</h2>
        <p className="muted">Se crea junto con su primer Administrador, que despues invita al resto del equipo.</p>
        {formError && <div className="form-error">{formError}</div>}
        <form className="stacked-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="nombre">Nombre de la empresa</label>
            <input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="adminName">Nombre del administrador</label>
            <input
              id="adminName"
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="adminEmail">Email del administrador</label>
            <input
              id="adminEmail"
              type="email"
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="adminPassword">Contrasena inicial</label>
            <input
              id="adminPassword"
              type="password"
              value={form.adminPassword}
              onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Creando..." : "Crear empresa"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default EmpresasPanel;
