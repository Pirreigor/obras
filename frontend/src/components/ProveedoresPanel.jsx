import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";

const FORM_INICIAL = { nombre: "", telefono: "", rubro: "" };

function ProveedoresPanel({ currentUser }) {
  const esAdmin = currentUser?.rol === "ADMINISTRADOR";

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [proveedorEnEdicion, setProveedorEnEdicion] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  async function loadProveedores() {
    setLoading(true);
    setListError("");
    try {
      const data = await apiFetch("/api/proveedores");
      setProveedores(data.proveedores);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProveedores();
  }, []);

  function handleOpenForm(proveedor) {
    setProveedorEnEdicion(proveedor || null);
    setFormError("");
    setForm(proveedor ? { nombre: proveedor.nombre, telefono: proveedor.telefono, rubro: proveedor.rubro || "" } : FORM_INICIAL);
    setMostrarForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const body = { nombre: form.nombre, telefono: form.telefono, rubro: form.rubro || undefined };
      if (proveedorEnEdicion) {
        const data = await apiFetch(`/api/proveedores/${proveedorEnEdicion.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setProveedores((prev) => prev.map((p) => (p.id === data.proveedor.id ? data.proveedor : p)));
      } else {
        const data = await apiFetch("/api/proveedores", { method: "POST", body: JSON.stringify(body) });
        setProveedores((prev) => [data.proveedor, ...prev]);
      }
      setMostrarForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEliminar(proveedor) {
    setEliminandoId(proveedor.id);
    setListError("");
    try {
      await apiFetch(`/api/proveedores/${proveedor.id}`, { method: "DELETE" });
      setProveedores((prev) => prev.filter((p) => p.id !== proveedor.id));
    } catch (err) {
      setListError(err.message);
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <section className="panel-card">
      <div className="panel-card-header">
        <h2>Proveedores</h2>
        <button className="btn-small" type="button" onClick={() => handleOpenForm(null)}>
          + Registrar proveedor
        </button>
      </div>

      {listError && <div className="form-error">{listError}</div>}
      {loading ? (
        <p className="muted">Cargando...</p>
      ) : proveedores.length === 0 ? (
        <p className="muted">Todavia no hay proveedores registrados.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Telefono</th>
                <th>Rubro</th>
                {esAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {proveedores.map((proveedor) => (
                <tr key={proveedor.id}>
                  <td>{proveedor.nombre}</td>
                  <td>{proveedor.telefono}</td>
                  <td>{proveedor.rubro || "-"}</td>
                  {esAdmin && (
                    <td>
                      <button className="btn-link" type="button" onClick={() => handleOpenForm(proveedor)}>
                        Editar
                      </button>{" "}
                      <button
                        className="btn-link"
                        type="button"
                        disabled={eliminandoId === proveedor.id}
                        onClick={() => handleEliminar(proveedor)}
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarForm && (
        <Modal
          title={proveedorEnEdicion ? "Editar proveedor" : "Nuevo proveedor"}
          onClose={() => setMostrarForm(false)}
        >
          {formError && <div className="form-error">{formError}</div>}
          <form className="stacked-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="proveedorNombre">Nombre</label>
              <input
                id="proveedorNombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="proveedorTelefono">Telefono</label>
              <input
                id="proveedorTelefono"
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="proveedorRubro">Rubro (opcional)</label>
              <input
                id="proveedorRubro"
                placeholder="ej. Estructura metalica, Obras civiles, Electricidad"
                value={form.rubro}
                onChange={(e) => setForm({ ...form, rubro: e.target.value })}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : proveedorEnEdicion ? "Guardar cambios" : "Crear proveedor"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default ProveedoresPanel;
