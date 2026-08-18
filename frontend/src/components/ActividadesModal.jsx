import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";
import NuevaSolicitudModal from "./NuevaSolicitudModal";

const NUEVA = "__nueva__";
const ACTIVIDAD_FORM_INICIAL = {
  actividadCatalogoId: "",
  actividadCatalogoNombre: "",
  fechaInicioPlan: "",
  fechaFinPlan: "",
};

const ESTADOS = ["PENDIENTE", "EN_CURSO", "HECHA"];

// Se formatea a partir del string ISO literal (no via Date) para no
// depender del huso horario del navegador, igual que en CalendarioPanel.
function formatFechaHora(iso) {
  if (!iso) return "-";
  const [fecha, horaCompleta] = iso.split("T");
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes} ${horaCompleta.slice(0, 5)}`;
}

function ActividadesModal({ subObra, puedeCrear, puedeMarcarUrgente, onClose }) {
  const [actividades, setActividades] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [urgenteEnCurso, setUrgenteEnCurso] = useState(null);
  const [estadoEnCurso, setEstadoEnCurso] = useState(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(ACTIVIDAD_FORM_INICIAL);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mostrarPedido, setMostrarPedido] = useState(false);
  const [actividadParaPedido, setActividadParaPedido] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const peticiones = [apiFetch(`/api/sub-obras/${subObra.id}/actividades`)];
        if (puedeCrear) {
          peticiones.push(apiFetch("/api/actividades-catalogo"));
        }
        const [actividadesRes, catalogoRes] = await Promise.all(peticiones);
        setActividades(actividadesRes.actividades);
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

  async function toggleUrgente(actividad) {
    setUrgenteEnCurso(actividad.id);
    setError("");
    try {
      const data = await apiFetch(`/api/sub-obras/${subObra.id}/actividades/${actividad.id}`, {
        method: "PATCH",
        body: JSON.stringify({ urgente: !actividad.urgente }),
      });
      setActividades((prev) => prev.map((a) => (a.id === actividad.id ? data.actividad : a)));
    } catch (err) {
      setError(err.message);
    } finally {
      setUrgenteEnCurso(null);
    }
  }

  async function cambiarEstado(actividad, estado) {
    setEstadoEnCurso(actividad.id);
    setError("");
    try {
      const data = await apiFetch(`/api/sub-obras/${subObra.id}/actividades/${actividad.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setActividades((prev) => prev.map((a) => (a.id === actividad.id ? data.actividad : a)));
    } catch (err) {
      setError(err.message);
    } finally {
      setEstadoEnCurso(null);
    }
  }

  function handleOpenForm() {
    setForm(ACTIVIDAD_FORM_INICIAL);
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
          throw new Error("Falta el nombre de la actividad nueva");
        }
        body.actividadCatalogoNombre = form.actividadCatalogoNombre.trim();
      } else if (form.actividadCatalogoId) {
        body.actividadCatalogoId = form.actividadCatalogoId;
      } else {
        throw new Error("Elegi una actividad del catalogo o crea una nueva");
      }

      const data = await apiFetch(`/api/sub-obras/${subObra.id}/actividades`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setActividades((prev) => [data.actividad, ...prev]);
      setMostrarForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Actividades de ${subObra.nombre}`} onClose={onClose}>
      {puedeCrear && (
        <div className="panel-card-header">
          <span className="muted">{actividades.length} actividad(es)</span>
          <div className="calendar-nav">
            <button
              className="btn-small"
              type="button"
              onClick={() => {
                setActividadParaPedido(null);
                setMostrarPedido(true);
              }}
            >
              + Pedir
            </button>
            <button className="btn-small" type="button" onClick={handleOpenForm}>
              + Nueva actividad
            </button>
          </div>
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <p className="muted">Cargando...</p>
      ) : actividades.length === 0 ? (
        <p className="muted">Todavia no hay actividades.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Plan inicio</th>
                <th>Plan fin</th>
                <th>Estado</th>
                <th>Cierre real</th>
                <th>Urgente</th>
                {puedeCrear && <th>Pedido</th>}
              </tr>
            </thead>
            <tbody>
              {actividades.map((actividad) => (
                <tr key={actividad.id}>
                  <td>{actividad.actividadCatalogo?.nombre}</td>
                  <td>{formatFechaHora(actividad.fechaInicioPlan)}</td>
                  <td>{formatFechaHora(actividad.fechaFinPlan)}</td>
                  <td>
                    {puedeMarcarUrgente ? (
                      <select
                        className="estado-select"
                        value={actividad.estado}
                        onChange={(e) => cambiarEstado(actividad, e.target.value)}
                        disabled={estadoEnCurso === actividad.id}
                      >
                        {ESTADOS.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="role-pill">{actividad.estado}</span>
                    )}
                  </td>
                  <td>{formatFechaHora(actividad.fechaCierreReal)}</td>
                  <td>
                    {puedeMarcarUrgente ? (
                      <button
                        className={actividad.urgente ? "urgente-pill urgente-pill-clickable" : "btn-link"}
                        type="button"
                        onClick={() => toggleUrgente(actividad)}
                        disabled={urgenteEnCurso === actividad.id}
                      >
                        {actividad.urgente ? "Urgente" : "Marcar urgente"}
                      </button>
                    ) : actividad.urgente ? (
                      <span className="urgente-pill">Urgente</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  {puedeCrear && (
                    <td>
                      <button
                        className="btn-link"
                        type="button"
                        onClick={() => {
                          setActividadParaPedido(actividad.id);
                          setMostrarPedido(true);
                        }}
                      >
                        Pedir
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
        <Modal title="Nueva actividad" onClose={() => setMostrarForm(false)}>
          {formError && <div className="form-error">{formError}</div>}
          <form className="stacked-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="actividadCatalogo">Actividad</label>
              <select
                id="actividadCatalogo"
                value={form.actividadCatalogoId}
                onChange={(e) => setForm({ ...form, actividadCatalogoId: e.target.value })}
                required
              >
                <option value="">Selecciona una actividad</option>
                {catalogo.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
                <option value={NUEVA}>+ Crear actividad nueva</option>
              </select>
            </div>

            {form.actividadCatalogoId === NUEVA && (
              <div className="field">
                <label htmlFor="actividadNueva">Nombre de la actividad nueva</label>
                <input
                  id="actividadNueva"
                  value={form.actividadCatalogoNombre}
                  onChange={(e) => setForm({ ...form, actividadCatalogoNombre: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="actividadInicio">Fecha y hora prevista de inicio</label>
              <input
                id="actividadInicio"
                type="datetime-local"
                value={form.fechaInicioPlan}
                onChange={(e) => setForm({ ...form, fechaInicioPlan: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="actividadFin">Fecha y hora prevista de fin</label>
              <input
                id="actividadFin"
                type="datetime-local"
                value={form.fechaFinPlan}
                onChange={(e) => setForm({ ...form, fechaFinPlan: e.target.value })}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear actividad"}
            </button>
          </form>
        </Modal>
      )}

      {mostrarPedido && (
        <NuevaSolicitudModal
          subObras={[subObra]}
          subObraFijaId={subObra.id}
          actividadFijaId={actividadParaPedido}
          onClose={() => setMostrarPedido(false)}
          onCreada={() => setMostrarPedido(false)}
        />
      )}
    </Modal>
  );
}

export default ActividadesModal;
