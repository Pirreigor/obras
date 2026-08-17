import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";

const NUEVA = "__nueva__";
const TAREA_FORM_INICIAL = { actividadCatalogoId: "", actividadCatalogoNombre: "", fechaInicioPlan: "", fechaFinPlan: "" };

function TareasModal({ subObra, puedeCrear, puedeMarcarUrgente, onClose }) {
  const [tareas, setTareas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [urgenteEnCurso, setUrgenteEnCurso] = useState(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(TAREA_FORM_INICIAL);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const peticiones = [apiFetch(`/api/sub-obras/${subObra.id}/actividades`)];
        if (puedeCrear) {
          peticiones.push(apiFetch("/api/actividades-catalogo"));
        }
        const [tareasRes, catalogoRes] = await Promise.all(peticiones);
        setTareas(tareasRes.actividades);
        if (catalogoRes) {
          setCatalogo(catalogoRes.catalogo);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [subObra.id, puedeCrear]);

  async function toggleUrgente(tarea) {
    setUrgenteEnCurso(tarea.id);
    setError("");
    try {
      const data = await apiFetch(`/api/sub-obras/${subObra.id}/actividades/${tarea.id}`, {
        method: "PATCH",
        body: JSON.stringify({ urgente: !tarea.urgente }),
      });
      setTareas((prev) => prev.map((t) => (t.id === tarea.id ? data.actividad : t)));
    } catch (err) {
      setError(err.message);
    } finally {
      setUrgenteEnCurso(null);
    }
  }

  function handleOpenForm() {
    setForm(TAREA_FORM_INICIAL);
    setFormError("");
    setMostrarForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const body = {
        fechaInicioPlan: form.fechaInicioPlan || undefined,
        fechaFinPlan: form.fechaFinPlan || undefined,
      };
      if (form.actividadCatalogoId === NUEVA) {
        if (!form.actividadCatalogoNombre.trim()) {
          throw new Error("Falta el nombre de la tarea nueva");
        }
        body.actividadCatalogoNombre = form.actividadCatalogoNombre.trim();
      } else if (form.actividadCatalogoId) {
        body.actividadCatalogoId = form.actividadCatalogoId;
      } else {
        throw new Error("Elegi una tarea del catalogo o crea una nueva");
      }

      const data = await apiFetch(`/api/sub-obras/${subObra.id}/actividades`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setTareas((prev) => [data.actividad, ...prev]);
      setMostrarForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Tareas de ${subObra.nombre}`} onClose={onClose}>
      {puedeCrear && (
        <div className="panel-card-header">
          <span className="muted">{tareas.length} tarea(s)</span>
          <button className="btn-small" type="button" onClick={handleOpenForm}>
            + Nueva tarea
          </button>
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <p className="muted">Cargando...</p>
      ) : tareas.length === 0 ? (
        <p className="muted">Todavia no hay tareas.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Plan inicio</th>
                <th>Plan fin</th>
                <th>Estado</th>
                <th>Urgente</th>
              </tr>
            </thead>
            <tbody>
              {tareas.map((tarea) => (
                <tr key={tarea.id}>
                  <td>{tarea.actividadCatalogo?.nombre}</td>
                  <td>{tarea.fechaInicioPlan ? new Date(tarea.fechaInicioPlan).toLocaleDateString() : "-"}</td>
                  <td>{tarea.fechaFinPlan ? new Date(tarea.fechaFinPlan).toLocaleDateString() : "-"}</td>
                  <td>
                    <span className="role-pill">{tarea.estado}</span>
                  </td>
                  <td>
                    {puedeMarcarUrgente ? (
                      <button
                        className={tarea.urgente ? "urgente-pill urgente-pill-clickable" : "btn-link"}
                        type="button"
                        onClick={() => toggleUrgente(tarea)}
                        disabled={urgenteEnCurso === tarea.id}
                      >
                        {tarea.urgente ? "Urgente" : "Marcar urgente"}
                      </button>
                    ) : tarea.urgente ? (
                      <span className="urgente-pill">Urgente</span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarForm && (
        <Modal title="Nueva tarea" onClose={() => setMostrarForm(false)}>
          {formError && <div className="form-error">{formError}</div>}
          <form className="stacked-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="tareaCatalogo">Tarea</label>
              <select
                id="tareaCatalogo"
                value={form.actividadCatalogoId}
                onChange={(e) => setForm({ ...form, actividadCatalogoId: e.target.value })}
                required
              >
                <option value="">Selecciona una tarea</option>
                {catalogo.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
                <option value={NUEVA}>+ Crear tarea nueva</option>
              </select>
            </div>

            {form.actividadCatalogoId === NUEVA && (
              <div className="field">
                <label htmlFor="tareaNueva">Nombre de la tarea nueva</label>
                <input
                  id="tareaNueva"
                  value={form.actividadCatalogoNombre}
                  onChange={(e) => setForm({ ...form, actividadCatalogoNombre: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="tareaInicio">Fecha planificada de inicio</label>
              <input
                id="tareaInicio"
                type="date"
                value={form.fechaInicioPlan}
                onChange={(e) => setForm({ ...form, fechaInicioPlan: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="tareaFin">Fecha planificada de fin</label>
              <input
                id="tareaFin"
                type="date"
                value={form.fechaFinPlan}
                onChange={(e) => setForm({ ...form, fechaFinPlan: e.target.value })}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear tarea"}
            </button>
          </form>
        </Modal>
      )}
    </Modal>
  );
}

export default TareasModal;
