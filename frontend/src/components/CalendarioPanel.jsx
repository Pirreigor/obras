import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";
import CierreModal from "./CierreModal";

const NUEVA = "__nueva__";
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const DIAS_SEMANA_LARGO = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
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

// Convierte el value ("YYYY-MM-DD") de un <input type="date"> a un Date
// local, igual convencion que toKey, para no correrse de dia.
function fechaDesdeInput(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
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

const HORA_INICIO = 6;
const HORA_FIN = 20;
const ALTO_HORA = 46;

// Igual que keyFromIso: se lee la hora literal del string ISO (posiciones
// 11-16, "HH:mm") en vez de pasar por Date, para no depender del huso
// horario del navegador.
function horaDecimalDeIso(iso) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h + m / 60;
}

function formatHoraDecimal(valor) {
  const h = Math.floor(valor);
  const m = Math.round((valor - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Recorta el rango previsto de cada actividad a la franja horaria de este
// dia puntual: si la actividad viene de un dia anterior o sigue en uno
// posterior, se estira hasta el borde del rango visible.
function bloquesDelDia(actividades, diaKey) {
  return actividades
    .filter((a) => estaProgramadaEseDia(a, diaKey))
    .map((a) => {
      const inicioKey = a.fechaInicioPlan ? keyFromIso(a.fechaInicioPlan) : null;
      const finKey = a.fechaFinPlan ? keyFromIso(a.fechaFinPlan) : inicioKey;
      const cierreKey = a.fechaCierreReal ? keyFromIso(a.fechaCierreReal) : null;

      let horaInicio = inicioKey === diaKey ? horaDecimalDeIso(a.fechaInicioPlan) : HORA_INICIO;
      let horaFin = finKey === diaKey ? horaDecimalDeIso(a.fechaFinPlan) : HORA_FIN;
      horaInicio = Math.max(HORA_INICIO, Math.min(horaInicio, HORA_FIN));
      horaFin = Math.max(horaInicio + 0.5, Math.min(horaFin, HORA_FIN));

      return {
        actividad: a,
        horaInicio,
        horaFin,
        cierreRealHoy: cierreKey === diaKey ? horaDecimalDeIso(a.fechaCierreReal) : null,
      };
    });
}

// Reparte los bloques que se superponen en columnas lado a lado, como
// una mini agenda, para que no queden unos encima de otros.
function asignarColumnas(bloques) {
  const ordenados = [...bloques].sort((a, b) => a.horaInicio - b.horaInicio);
  const finColumnas = [];
  const conColumna = ordenados.map((bloque) => {
    let columna = finColumnas.findIndex((fin) => fin <= bloque.horaInicio);
    if (columna === -1) {
      columna = finColumnas.length;
      finColumnas.push(bloque.horaFin);
    } else {
      finColumnas[columna] = bloque.horaFin;
    }
    return { ...bloque, columna };
  });
  return { bloques: conColumna, totalColumnas: finColumnas.length || 1 };
}

function TimelineDia({ fecha, actividades, onCerrarClick }) {
  const { bloques, totalColumnas } = useMemo(
    () => asignarColumnas(bloquesDelDia(actividades, fecha)),
    [actividades, fecha]
  );

  const horas = [];
  for (let h = HORA_INICIO; h <= HORA_FIN; h++) {
    horas.push(h);
  }
  const alturaTotal = (HORA_FIN - HORA_INICIO) * ALTO_HORA;

  return (
    <div className="timeline-dia">
      <div className="timeline-horas">
        {horas.map((h) => (
          <div className="timeline-hora-label" key={h} style={{ height: ALTO_HORA }}>
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>
      <div className="timeline-track" style={{ height: alturaTotal }}>
        {horas.map((h) => (
          <div className="timeline-linea" key={h} style={{ top: (h - HORA_INICIO) * ALTO_HORA }} />
        ))}
        {bloques.length === 0 && <p className="muted timeline-vacio">Sin actividades programadas para este dia.</p>}
        {bloques.map(({ actividad, horaInicio, horaFin, cierreRealHoy, columna }) => {
          const hecha = actividad.estado === "HECHA";
          return (
            <div
              key={actividad.id}
              role={hecha ? undefined : "button"}
              tabIndex={hecha ? undefined : 0}
              className={`timeline-bloque${actividad.urgente ? " timeline-bloque-urgente" : ""}${
                hecha ? " timeline-bloque-hecha" : ""
              }${hecha ? "" : " timeline-bloque-clicable"}`}
              style={{
                top: (horaInicio - HORA_INICIO) * ALTO_HORA,
                height: (horaFin - horaInicio) * ALTO_HORA,
                left: `${(columna / totalColumnas) * 100}%`,
                width: `calc(${100 / totalColumnas}% - 6px)`,
              }}
              onClick={hecha ? undefined : () => onCerrarClick(actividad, fecha)}
              title={hecha ? "Actividad completada" : "Click para marcar como completada"}
            >
              <strong>{actividad.subObra.nombre}</strong>
              <span>{actividad.actividadCatalogo?.nombre}</span>
              <span className="timeline-bloque-horas">
                {formatHoraDecimal(horaInicio)}&ndash;{formatHoraDecimal(horaFin)}
                {cierreRealHoy != null ? ` · cierre real ${formatHoraDecimal(cierreRealHoy)}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Tabla tipo Gantt: filas = actividades de la semana, columnas = dias.
// Click en una celda activa abre el modal de cierre para esa actividad
// ese dia puntual.
function TablaSemanal({ actividades, dias, onCerrarClick }) {
  const filas = actividades.filter((a) => dias.some((d) => estaProgramadaEseDia(a, toKey(d))));

  return (
    <div className="table-scroll">
      <table className="data-table tabla-semanal">
        <thead>
          <tr>
            <th>Actividad</th>
            {dias.map((d) => (
              <th key={toKey(d)}>
                {DIAS_SEMANA_LARGO[(d.getDay() + 6) % 7]}
                <br />
                {String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={dias.length + 1} className="muted">
                Sin actividades programadas esta semana.
              </td>
            </tr>
          )}
          {filas.map((a) => (
            <tr key={a.id}>
              <td>
                {a.subObra.nombre} &middot; {a.actividadCatalogo?.nombre}
              </td>
              {dias.map((d) => {
                const key = toKey(d);
                const programada = estaProgramadaEseDia(a, key);
                const hecha = a.estado === "HECHA";
                const cerradaEseDia = hecha && a.fechaCierreReal && keyFromIso(a.fechaCierreReal) === key;
                return (
                  <td key={key} className="tabla-semanal-celda">
                    {programada &&
                      (hecha ? (
                        <span
                          className="tabla-semanal-marca tabla-semanal-marca-hecha"
                          title={cerradaEseDia ? "Completada este dia" : "Completada"}
                        >
                          &#10003;
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="tabla-semanal-marca tabla-semanal-marca-pendiente"
                          onClick={() => onCerrarClick(a, key)}
                          title="Marcar como completada este dia"
                        >
                          X
                        </button>
                      ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetalleDia({
  fecha,
  programadas,
  avances,
  subObras,
  actividades,
  onSaved,
  formError,
  setFormError,
  timeline,
  onCerrarClick,
}) {
  return (
    <>
      {timeline ? (
        <div className="vista-block">
          <TimelineDia fecha={fecha} actividades={actividades} onCerrarClick={onCerrarClick} />
          <p className="muted timeline-leyenda">
            <span className="timeline-leyenda-swatch timeline-leyenda-urgente" /> Urgente &nbsp;
            <span className="timeline-leyenda-swatch timeline-leyenda-hecha" /> Completada
          </p>
        </div>
      ) : (
        programadas.length > 0 && (
          <div className="vista-block">
            <h3>Actividades programadas este dia</h3>
            <div className="vista-checklist">
              {programadas.map((a) => (
                <div key={a.id} className="muted">
                  {a.subObra.nombre} &middot; {a.actividadCatalogo?.nombre}
                </div>
              ))}
            </div>
          </div>
        )
      )}
      {avances.length > 0 && (
        <div className="vista-block">
          <h3>Ya registrado ese dia</h3>
          <div className="vista-checklist">
            {avances.map((a) => (
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
          fecha={fecha}
          actividades={actividades}
          subObras={subObras}
          onSaved={onSaved}
          onError={setFormError}
        />
      </div>
    </>
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
  const [cierreObjetivo, setCierreObjetivo] = useState(null);

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
    if (vista === "mes") {
      return buildMesGrid(fechaReferencia.getFullYear(), fechaReferencia.getMonth());
    }
    if (vista === "semana") {
      return buildSemanaGrid(fechaReferencia);
    }
    return [fechaReferencia];
  }, [vista, fechaReferencia]);

  function moverPeriodo(delta) {
    setFechaReferencia((prev) => {
      if (vista === "mes") {
        return new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      }
      if (vista === "semana") {
        const siguiente = new Date(prev);
        siguiente.setDate(prev.getDate() + delta * 7);
        return siguiente;
      }
      const siguiente = new Date(prev);
      siguiente.setDate(prev.getDate() + delta);
      return siguiente;
    });
  }

  function handleAvanceGuardado() {
    setFormError("");
    load();
  }

  function handleCerrarClick(actividad, fechaKey) {
    setCierreObjetivo({ actividad, fecha: fechaKey });
  }

  function handleCerrado() {
    setCierreObjetivo(null);
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

  const diaActualKey = toKey(fechaReferencia);
  const avancesDiaActual = avancesPorDia[diaActualKey] || [];
  const programadasDiaActual = actividades.filter((a) => estaProgramadaEseDia(a, diaActualKey));

  const etiquetaPeriodo =
    vista === "mes"
      ? `${MESES[fechaReferencia.getMonth()]} ${fechaReferencia.getFullYear()}`
      : vista === "semana"
      ? (() => {
          const semana = buildSemanaGrid(fechaReferencia);
          const primero = semana[0];
          const ultimo = semana[6];
          const mismomes = primero.getMonth() === ultimo.getMonth();
          return mismomes
            ? `${primero.getDate()} - ${ultimo.getDate()} de ${MESES[primero.getMonth()]} ${primero.getFullYear()}`
            : `${primero.getDate()} de ${MESES[primero.getMonth()]} - ${ultimo.getDate()} de ${MESES[ultimo.getMonth()]}`;
        })()
      : `${fechaReferencia.getDate()} de ${MESES[fechaReferencia.getMonth()]} ${fechaReferencia.getFullYear()}`;

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
            <button
              className={vista === "dia" ? "active" : ""}
              type="button"
              onClick={() => setVista("dia")}
            >
              Dia
            </button>
          </div>
          <input
            className="calendar-date-picker"
            type="date"
            value={toKey(fechaReferencia)}
            onChange={(e) => e.target.value && setFechaReferencia(fechaDesdeInput(e.target.value))}
          />
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
      ) : vista === "dia" ? (
        <div className="calendar-dia-detalle">
          <DetalleDia
            fecha={diaActualKey}
            programadas={programadasDiaActual}
            avances={avancesDiaActual}
            subObras={subObras}
            actividades={actividades}
            onSaved={handleAvanceGuardado}
            formError={formError}
            setFormError={setFormError}
            timeline
            onCerrarClick={handleCerrarClick}
          />
        </div>
      ) : vista === "semana" ? (
        <TablaSemanal actividades={actividades} dias={dias} onCerrarClick={handleCerrarClick} />
      ) : (
        <div className="calendar-grid">
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

      {vista === "mes" && (
        <div className="calendar-legend">
          <span>
            <span className="calendar-legend-swatch calendar-legend-programado" /> Actividad programada
          </span>
          <span>
            <span className="calendar-legend-swatch calendar-legend-marcado" /> Avance registrado
          </span>
        </div>
      )}

      {diaSeleccionado && (
        <Modal
          title={`Avance del ${diaSeleccionado.getDate()} de ${MESES[diaSeleccionado.getMonth()]}`}
          onClose={() => setDiaSeleccionado(null)}
        >
          <DetalleDia
            fecha={toKey(diaSeleccionado)}
            programadas={programadasDelDia}
            avances={avancesDelDia}
            subObras={subObras}
            actividades={actividades}
            onSaved={handleAvanceGuardado}
            formError={formError}
            setFormError={setFormError}
          />
        </Modal>
      )}

      {cierreObjetivo && (
        <CierreModal
          actividad={cierreObjetivo.actividad}
          fecha={cierreObjetivo.fecha}
          onClose={() => setCierreObjetivo(null)}
          onCerrado={handleCerrado}
        />
      )}
    </div>
  );
}

export default CalendarioPanel;
