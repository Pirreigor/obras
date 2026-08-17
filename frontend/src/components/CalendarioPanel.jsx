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

// Las fechas de Avance llegan como fecha-hora UTC de un dia sin hora
// (ej. "2026-08-20T00:00:00.000Z"); tomar los primeros 10 caracteres
// evita que el desfasaje horario del navegador corra el dia.
function keyFromIso(iso) {
  return iso.slice(0, 10);
}

function buildGrid(year, month) {
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
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
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

  const dias = useMemo(() => buildGrid(mesActual.getFullYear(), mesActual.getMonth()), [mesActual]);

  function cambiarMes(delta) {
    setMesActual((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
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

  return (
    <div>
      <div className="panel-card-header">
        <h2 className="section-title">
          {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
        </h2>
        <div className="calendar-nav">
          <button className="btn-small" type="button" onClick={() => cambiarMes(-1)}>
            &larr;
          </button>
          <button className="btn-small" type="button" onClick={() => cambiarMes(1)}>
            &rarr;
          </button>
        </div>
      </div>

      {subObras.length === 0 ? (
        <p className="muted">Todavia no tenes sub-obras asignadas.</p>
      ) : (
        <div className="calendar-grid">
          {DIAS_SEMANA.map((dia, i) => (
            <div className="calendar-weekday" key={i}>
              {dia}
            </div>
          ))}
          {dias.map((dia) => {
            const key = toKey(dia);
            const esDelMes = dia.getMonth() === mesActual.getMonth();
            const tieneAvance = Boolean(avancesPorDia[key]?.length);
            return (
              <button
                key={key}
                type="button"
                className={`calendar-day${esDelMes ? "" : " calendar-day-out"}${
                  tieneAvance ? " calendar-day-marcado" : ""
                }`}
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

      {diaSeleccionado && (
        <Modal
          title={`Avance del ${diaSeleccionado.getDate()} de ${MESES[diaSeleccionado.getMonth()]}`}
          onClose={() => setDiaSeleccionado(null)}
        >
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
