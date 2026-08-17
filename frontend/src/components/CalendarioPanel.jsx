import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";

const NUEVA = "__nueva__";
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Las fechas de Avance/plan llegan como fecha-hora UTC de un dia sin hora
// (ej. "2026-08-20T00:00:00.000Z"); tomar los primeros 10 caracteres
// evita que el desfasaje horario del navegador corra el dia.
function keyFromIso(iso) {
  return iso.slice(0, 10);
}

function buildMesGrid(year, month) {
  const primerDia = new Date(year, month, 1);
  const offset = (primerDia.getDay() + 6) % 7; // semana arranca en lunes
  const inicio = new Date(year, month, 1 - offset);

  const dias = [];
  for (let i = 0; i < 42; i++) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    dias.push(dia);
  }
  return dias;
}

function buildSemanaGrid(referencia) {
  const offset = (referencia.getDay() + 6) % 7;
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() - offset);

  const dias = [];
  for (let i = 0; i < 7; i++) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    dias.push(dia);
  }
  return dias;
}

// Una actividad se considera "programada" ese dia si cae dentro de
// [fechaInicioPlan, fechaFinPlan]. Si solo tiene una de las dos fechas,
// se toma como un plan de un solo dia.
function estaProgramadaEseDia(actividad, diaKey) {
  const inicio = actividad.fechaInicioPlan ? keyFromIso(actividad.fechaInicioPlan) : null;
  const fin = actividad.fechaFinPlan ? keyFromIso(actividad.fechaFinPlan) : null;
  if (!inicio && !fin) {
    return false;
  }
  if (inicio && fin) {
    return diaKey >= inicio && diaKey <= fin;
  }
  return diaKey === (inicio || fin);
}

function AvanceForm({ fecha, actividades, subObras, onSaved, onError }) {
  const [actividadProgramadaId, setActividadProgramadaId] = useState("");
  const [nuevaSubObraId, setNuevaSubObraId] = useState("");
  const [nuevaActividadNombre, setNuevaActividadNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let subObraId;
      let actividadId = actividadProgramadaId;

      if (actividadProgramadaId === NUEVA) {
        if (!nuevaSubObraId) {
          throw new Error("Elegi en que sub-obra va la actividad nueva");
        }
        if (!nuevaActividadNombre.trim()) {
          throw new Error("Falta el nombre de la actividad nueva");
        }
        const creada = await apiFetch(`/api/sub-obras/${nuevaSubObraId}/actividades`, {
          method: "POST",
          body: JSON.stringify({ actividadCatalogoNombre: nuevaActividadNombre.trim() }),
        });
        actividadId = creada.actividad.id;
        subObraId = nuevaSubObraId;
      } else if (actividadProgramadaId) {
        const actividad = actividades.find((a) => String(a.id) === String(actividadProgramadaId));
        subObraId = actividad.subObra.id;
      } else {
        throw new Error("Elegi una actividad");
      }

      const data = await apiFetch(`/api/sub-obras/${subObraId}/avances`, {
        method: "POST",
        body: JSON.stringify({
          actividadProgramadaId: actividadId,
          fecha,
          porcentaje: porcentaje || 0,
          descripcion: descripcion || undefined,
        }),
      });
      setPorcentaje("");
      setDescripcion("");
      setActividadProgramadaId("");
      setNuevaSubObraId("");
      setNuevaActividadNombre("");
      onSaved(data.avance);
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="avanceActividad">Actividad</label>
        <select
          id="avanceActividad"
          value={actividadProgramadaId}
          onChange={(e) => setActividadProgramadaId(e.target.value)}
          required
        >
          <option value="">Selecciona una actividad</option>
          {actividades.map((a) => (
            <option key={a.id} value={a.id}>
              {a.subObra.nombre} &middot; {a.actividadCatalogo?.nombre}
            </option>
          ))}
          <option value={NUEVA}>+ Crear actividad nueva</option>
        </select>
      </div>

      {actividadProgramadaId === NUEVA && (
        <>
          <div className="field">
            <label htmlFor="avanceSubObra">Sub-obra</label>
            <select
              id="avanceSubObra"
              value={nuevaSubObraId}
              onChange={(e) => setNuevaSubObraId(e.target.value)}
              required
            >
              <option value="">Selecciona una sub-obra</option>
              {subObras.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="avanceActividadNueva">Nombre de la actividad nueva</label>
            <input
              id="avanceActividadNueva"
              value={nuevaActividadNombre}
              onChange={(e) => setNuevaActividadNombre(e.target.value)}
              required
            />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="avancePorcentaje">Porcentaje completado</label>
        <input
          id="avancePorcentaje"
          type="number"
          min="0"
          max="100"
          value={porcentaje}
          onChange={(e) => setPorcentaje(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="avanceDescripcion">Comentario</label>
        <input id="avanceDescripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <p className="muted">Las fotos todavia no se pueden adjuntar; se agregan en un paso siguiente.</p>
      <button className="btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Guardando..." : "Guardar avance"}
      </button>
    </form>
  );
}

function CalendarioPanel() {
  const [actividades, setActividades] = useState([]);
  const [subObras, setSubObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("mes");
  const [fechaReferencia, setFechaReferencia] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [actividadesRes, subObrasRes] = await Promise.all([
        apiFetch("/api/calendario/mias"),
        apiFetch("/api/sub-obras/mias"),
      ]);
      setActividades(actividadesRes.actividades);
      setSubObras(subObrasRes.subObras);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const avancesPorDia = useMemo(() => {
    const map = {};
    for (const actividad of actividades) {
      for (const avance of actividad.avances) {
        const key = keyFromIso(avance.fecha);
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push({ ...avance, actividad });
      }
    }
    return map;
  }, [actividades]);

  const dias = useMemo(() => {
    return vista === "mes"
      ? buildMesGrid(fechaReferencia.getFullYear(), fechaReferencia.getMonth())
      : buildSemanaGrid(fechaReferencia);
  }, [vista, fechaReferencia]);

  function moverPeriodo(delta) {
    setFechaReferencia((prev) => {
      if (vista === "mes") {
        return new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      }
      const siguiente = new Date(prev);
      siguiente.setDate(prev.getDate() + delta * 7);
      return siguiente;
    });
  }

  function handleAvanceGuardado() {
    setFormError("");
    load();
  }

  if (loading) {
    return <p className="muted">Cargando...</p>;
  }

  if (error) {
    return <div className="form-error">{error}</div>;
  }

  const diaKey = diaSeleccionado ? toKey(diaSeleccionado) : null;
  const avancesDelDia = diaKey ? avancesPorDia[diaKey] || [] : [];
  const programadasDelDia = diaKey ? actividades.filter((a) => estaProgramadaEseDia(a, diaKey)) : [];

  const etiquetaPeriodo =
    vista === "mes"
      ? `${MESES[fechaReferencia.getMonth()]} ${fechaReferencia.getFullYear()}`
      : (() => {
          const semana = buildSemanaGrid(fechaReferencia);
          const primero = semana[0];
          const ultimo = semana[6];
          const mismomes = primero.getMonth() === ultimo.getMonth();
          return mismomes
            ? `${primero.getDate()} - ${ultimo.getDate()} de ${MESES[primero.getMonth()]} ${primero.getFullYear()}`
            : `${primero.getDate()} de ${MESES[primero.getMonth()]} - ${ultimo.getDate()} de ${MESES[ultimo.getMonth()]}`;
        })();

  return (
    <div>
      <div className="panel-card-header">
        <h2 className="section-title">{etiquetaPeriodo}</h2>
        <div className="calendar-nav">
          <div className="calendar-view-toggle">
            <button
              className={vista === "mes" ? "active" : ""}
              type="button"
              onClick={() => setVista("mes")}
            >
              Mes
            </button>
            <button
              className={vista === "semana" ? "active" : ""}
              type="button"
              onClick={() => setVista("semana")}
            >
              Semana
            </button>
          </div>
          <button className="btn-small" type="button" onClick={() => moverPeriodo(-1)}>
            &larr;
          </button>
          <button className="btn-small" type="button" onClick={() => moverPeriodo(1)}>
            &rarr;
          </button>
        </div>
      </div>

      {subObras.length === 0 ? (
        <p className="muted">Todavia no tenes sub-obras asignadas.</p>
      ) : (
        <div className={vista === "mes" ? "calendar-grid" : "calendar-grid calendar-grid-semana"}>
          {DIAS_SEMANA.map((dia, i) => (
            <div className="calendar-weekday" key={i}>
              {dia}
            </div>
          ))}
          {dias.map((dia) => {
            const key = toKey(dia);
            const esDelMes = vista === "mes" ? dia.getMonth() === fechaReferencia.getMonth() : true;
            const tieneAvance = Boolean(avancesPorDia[key]?.length);
            const tieneProgramada = actividades.some((a) => estaProgramadaEseDia(a, key));
            return (
              <button
                key={key}
                type="button"
                className={`calendar-day${esDelMes ? "" : " calendar-day-out"}${
                  tieneAvance ? " calendar-day-marcado" : ""
                }${tieneProgramada ? " calendar-day-programado" : ""}`}
                onClick={() => {
                  setDiaSeleccionado(dia);
                  setFormError("");
                }}
              >
                <span>{dia.getDate()}</span>
                {tieneAvance && <span className="calendar-dot" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="calendar-legend">
        <span>
          <span className="calendar-legend-swatch calendar-legend-programado" /> Actividad programada
        </span>
        <span>
          <span className="calendar-legend-swatch calendar-legend-marcado" /> Avance registrado
        </span>
      </div>

      {diaSeleccionado && (
        <Modal
          title={`Avance del ${diaSeleccionado.getDate()} de ${MESES[diaSeleccionado.getMonth()]}`}
          onClose={() => setDiaSeleccionado(null)}
        >
          {programadasDelDia.length > 0 && (
            <div className="vista-block">
              <h3>Actividades programadas este dia</h3>
              <div className="vista-checklist">
                {programadasDelDia.map((a) => (
                  <div key={a.id} className="muted">
                    {a.subObra.nombre} &middot; {a.actividadCatalogo?.nombre}
                  </div>
                ))}
              </div>
            </div>
          )}
          {avancesDelDia.length > 0 && (
            <div className="vista-block">
              <h3>Ya registrado ese dia</h3>
              <div className="vista-checklist">
                {avancesDelDia.map((a) => (
                  <div key={a.id} className="muted">
                    {a.actividad.subObra.nombre} &middot; {a.actividad.actividadCatalogo?.nombre} &mdash; {a.porcentaje}%
                    {a.descripcion ? `: ${a.descripcion}` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}
          {formError && <div className="form-error">{formError}</div>}
          <div className="vista-block">
            <AvanceForm
              fecha={toKey(diaSeleccionado)}
              actividades={actividades}
              subObras={subObras}
              onSaved={handleAvanceGuardado}
              onError={setFormError}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CalendarioPanel;
