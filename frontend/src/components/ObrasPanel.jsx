import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";
import ActividadesModal from "./ActividadesModal";
import ProgressBar from "./ProgressBar";

const NUEVA = "__nueva__";
const FORM_INICIAL = {
  nombre: "",
  cliente: "",
  direccion: "",
  presupuesto: "",
  fechaInicio: "",
  fechaFinEstimada: "",
  zonaId: "",
  zonaNombreNueva: "",
  localidadId: "",
  localidadNombreNueva: "",
  residenteId: "",
};

const EDITAR_OBRA_FORM_INICIAL = { estado: "", residenteId: "" };
const ESTADOS_OBRA = ["PLANIFICACION", "EN_PROGRESO", "PAUSADO", "FINALIZADO", "CANCELADO"];

const SUB_OBRA_FORM_INICIAL = {
  nombre: "",
  descripcion: "",
  responsableCalidadId: "",
  residenteIds: [],
  numeroPartida: "",
};

function ObrasPanel({ currentUser }) {
  const esAdmin = currentUser?.rol === "ADMINISTRADOR";
  const puedeCrearActividades = currentUser?.rol === "ADMINISTRADOR" || currentUser?.rol === "SUPERVISOR";
  const [obras, setObras] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [localidadesPorZona, setLocalidadesPorZona] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);
  const [mostrarModalObra, setMostrarModalObra] = useState(false);

  const [obraEnEdicion, setObraEnEdicion] = useState(null);
  const [editarObraForm, setEditarObraForm] = useState(EDITAR_OBRA_FORM_INICIAL);
  const [editarObraError, setEditarObraError] = useState("");
  const [guardandoObra, setGuardandoObra] = useState(false);

  const [obraSeleccionadaId, setObraSeleccionadaId] = useState(null);
  const [subObras, setSubObras] = useState([]);
  const [loadingSubObras, setLoadingSubObras] = useState(false);
  const [subObraError, setSubObraError] = useState("");
  const [subObraForm, setSubObraForm] = useState(SUB_OBRA_FORM_INICIAL);
  const [archivoPartida, setArchivoPartida] = useState(null);
  const [submittingSubObra, setSubmittingSubObra] = useState(false);
  const [mostrarModalSubObras, setMostrarModalSubObras] = useState(false);
  const [mostrarModalSubObra, setMostrarModalSubObra] = useState(false);
  const [subObraParaActividades, setSubObraParaActividades] = useState(null);

  async function loadObras() {
    setLoading(true);
    setListError("");
    try {
      const data = await apiFetch("/api/obras");
      setObras(data.obras);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadZonas() {
    try {
      const data = await apiFetch("/api/zonas");
      setZonas(data.zonas);
    } catch (err) {
      setListError(err.message);
    }
  }

  async function loadUsuarios() {
    try {
      const data = await apiFetch("/api/usuarios");
      setUsuarios(data.usuarios);
    } catch (err) {
      setListError(err.message);
    }
  }

  useEffect(() => {
    loadObras();
    loadZonas();
    loadUsuarios();
  }, []);

  function handleOpenModalObra() {
    setForm(FORM_INICIAL);
    setFormError("");
    setMostrarModalObra(true);
  }

  async function handleZonaChange(zonaId) {
    setForm({ ...form, zonaId, localidadId: "", localidadNombreNueva: "" });

    if (zonaId && zonaId !== NUEVA && !localidadesPorZona[zonaId]) {
      try {
        const data = await apiFetch(`/api/zonas/${zonaId}/localidades`);
        setLocalidadesPorZona((prev) => ({ ...prev, [zonaId]: data.localidades }));
      } catch (err) {
        setFormError(err.message);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      let zonaId = form.zonaId;
      if (zonaId === NUEVA) {
        if (!form.zonaNombreNueva.trim()) {
          throw new Error("Falta el nombre de la zona nueva");
        }
        const data = await apiFetch("/api/zonas", {
          method: "POST",
          body: JSON.stringify({ nombre: form.zonaNombreNueva.trim() }),
        });
        zonaId = data.zona.id;
      }

      let localidadId = form.localidadId;
      if (localidadId === NUEVA || form.zonaId === NUEVA) {
        if (!form.localidadNombreNueva.trim()) {
          throw new Error("Falta el nombre de la localidad nueva");
        }
        const data = await apiFetch(`/api/zonas/${zonaId}/localidades`, {
          method: "POST",
          body: JSON.stringify({ nombre: form.localidadNombreNueva.trim() }),
        });
        localidadId = data.localidad.id;
      }

      if (!localidadId) {
        throw new Error("Falta elegir o crear una localidad");
      }

      await apiFetch("/api/obras", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre,
          cliente: form.cliente || undefined,
          direccion: form.direccion || undefined,
          presupuesto: form.presupuesto || undefined,
          fechaInicio: form.fechaInicio || undefined,
          fechaFinEstimada: form.fechaFinEstimada || undefined,
          localidadId,
          residenteId: form.residenteId || undefined,
        }),
      });

      setForm(FORM_INICIAL);
      setLocalidadesPorZona({});
      setMostrarModalObra(false);
      await Promise.all([loadObras(), loadZonas()]);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectObra(obra) {
    setObraSeleccionadaId(obra.id);
    setSubObraError("");
    setMostrarModalSubObras(true);
    setLoadingSubObras(true);
    try {
      const data = await apiFetch(`/api/obras/${obra.id}/sub-obras`);
      setSubObras(data.subObras);
    } catch (err) {
      setSubObraError(err.message);
    } finally {
      setLoadingSubObras(false);
    }
  }

  function handleOpenEditarObra(obra) {
    setObraEnEdicion(obra);
    setEditarObraForm({ estado: obra.estado, residenteId: obra.residenteId ? String(obra.residenteId) : "" });
    setEditarObraError("");
  }

  async function handleGuardarEdicionObra(e) {
    e.preventDefault();
    setEditarObraError("");
    setGuardandoObra(true);
    try {
      const data = await apiFetch(`/api/obras/${obraEnEdicion.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          estado: editarObraForm.estado,
          residenteId: editarObraForm.residenteId || null,
        }),
      });
      setObras((prev) => prev.map((o) => (o.id === data.obra.id ? { ...o, ...data.obra } : o)));
      setObraEnEdicion(null);
    } catch (err) {
      setEditarObraError(err.message);
    } finally {
      setGuardandoObra(false);
    }
  }

  function handleOpenModalSubObra() {
    setSubObraForm(SUB_OBRA_FORM_INICIAL);
    setArchivoPartida(null);
    setSubObraError("");
    setMostrarModalSubObra(true);
  }

  function toggleResidente(usuarioId) {
    setSubObraForm((prev) => ({
      ...prev,
      residenteIds: prev.residenteIds.includes(usuarioId)
        ? prev.residenteIds.filter((id) => id !== usuarioId)
        : [...prev.residenteIds, usuarioId],
    }));
  }

  async function handleSubmitSubObra(e) {
    e.preventDefault();
    setSubObraError("");
    setSubmittingSubObra(true);
    try {
      let archivoPartidaUrl;
      if (archivoPartida) {
        try {
          const formData = new FormData();
          formData.append("evidencia", archivoPartida);
          formData.append("carpeta", "partidas");
          const subida = await apiFetch("/api/uploads", { method: "POST", body: formData });
          archivoPartidaUrl = subida.url;
        } catch (err) {
          throw new Error(`No se pudo subir el archivo de partida: ${err.message}`);
        }
      }

      const data = await apiFetch(`/api/obras/${obraSeleccionadaId}/sub-obras`, {
        method: "POST",
        body: JSON.stringify({
          nombre: subObraForm.nombre,
          descripcion: subObraForm.descripcion || undefined,
          responsableCalidadId: subObraForm.responsableCalidadId || undefined,
          residenteIds: subObraForm.residenteIds,
          numeroPartida: subObraForm.numeroPartida || undefined,
          archivoPartidaUrl,
        }),
      });
      setSubObras((prev) => [data.subObra, ...prev]);
      setSubObraForm(SUB_OBRA_FORM_INICIAL);
      setArchivoPartida(null);
      setMostrarModalSubObra(false);
    } catch (err) {
      setSubObraError(err.message);
    } finally {
      setSubmittingSubObra(false);
    }
  }

  const localidadesDisponibles = form.zonaId && form.zonaId !== NUEVA ? localidadesPorZona[form.zonaId] || [] : [];
  const necesitaLocalidadNueva = form.zonaId === NUEVA || form.localidadId === NUEVA;
  // No se limita por rol: la misma persona puede ser residente lider de
  // una obra y responsable de calidad/produccion de otra al mismo
  // tiempo, asi que cualquier usuario de la empresa puede ocupar
  // cualquiera de estos lugares.
  const equipoDisponible = usuarios;
  const calidadDisponibles = usuarios;
  const obraSeleccionada = obras.find((o) => o.id === obraSeleccionadaId);

  return (
    <>
      <section className="panel-card">
        <div className="panel-card-header">
          <h2>Obras</h2>
          <button className="btn-small" type="button" onClick={handleOpenModalObra}>
            + Nueva obra
          </button>
        </div>
        {listError && <div className="form-error">{listError}</div>}
        {loading ? (
          <p className="muted">Cargando...</p>
        ) : obras.length === 0 ? (
          <p className="muted">Todavia no hay obras.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cliente</th>
                  <th>Localidad</th>
                  <th>Estado</th>
                  <th>Residente lider</th>
                  <th>Presupuesto</th>
                  <th>Avance</th>
                  {esAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {obras.map((obra) => (
                  <tr
                    key={obra.id}
                    className={obra.id === obraSeleccionadaId ? "row-selected" : "row-clickable"}
                    onClick={() => handleSelectObra(obra)}
                  >
                    <td>{obra.nombre}</td>
                    <td>{obra.cliente || "-"}</td>
                    <td>
                      {obra.localidad?.zona?.nombre} &middot; {obra.localidad?.nombre}
                    </td>
                    <td>
                      <span className="role-pill">{obra.estado}</span>
                    </td>
                    <td>{obra.residente?.name || "-"}</td>
                    <td>{obra.presupuesto != null ? Number(obra.presupuesto).toLocaleString() : "-"}</td>
                    <td>
                      <ProgressBar value={obra.porcentaje} />
                    </td>
                    {esAdmin && (
                      <td>
                        <button
                          className="btn-link"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditarObra(obra);
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && obras.length > 0 && <p className="muted vista-block">Toca una obra para ver sus sub-obras.</p>}
      </section>

      {mostrarModalSubObras && obraSeleccionada && (
        <Modal title={`Sub-obras de ${obraSeleccionada.nombre}`} onClose={() => setMostrarModalSubObras(false)}>
          <div className="panel-card-header">
            <span className="muted">{subObras.length} sub-obra(s)</span>
            <button className="btn-small" type="button" onClick={handleOpenModalSubObra}>
              + Nueva sub-obra
            </button>
          </div>
          {subObraError && <div className="form-error">{subObraError}</div>}
          {loadingSubObras ? (
            <p className="muted">Cargando...</p>
          ) : subObras.length === 0 ? (
            <p className="muted">Todavia no hay sub-obras.</p>
          ) : (
            <>
              <p className="muted">Toca una sub-obra para ver sus actividades.</p>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Estado</th>
                      <th>Calidad/Produccion</th>
                      <th>Equipo</th>
                      <th>Partida</th>
                      <th>Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subObras.map((subObra) => (
                      <tr key={subObra.id} className="row-clickable" onClick={() => setSubObraParaActividades(subObra)}>
                        <td>{subObra.nombre}</td>
                        <td>
                          <span className="role-pill">{subObra.estado}</span>
                        </td>
                        <td>{subObra.responsableCalidad?.name || "-"}</td>
                        <td>
                          {subObra.residentes.length === 0 ? "-" : subObra.residentes.map((r) => r.usuario.name).join(", ")}
                        </td>
                        <td>
                          {subObra.numeroPartida || "-"}
                          {subObra.archivoPartidaUrl && (
                            <>
                              {" "}
                              <a
                                href={subObra.archivoPartidaUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver archivo
                              </a>
                            </>
                          )}
                        </td>
                        <td>
                          <ProgressBar value={subObra.porcentaje} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal>
      )}

      {mostrarModalObra && (
        <Modal title="Nueva obra" onClose={() => setMostrarModalObra(false)}>
          <p className="muted">Si todavia no existe la zona o la localidad, se pueden crear desde aca mismo.</p>
          {formError && <div className="form-error">{formError}</div>}
          <form className="stacked-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="obraNombre">Nombre</label>
              <input
                id="obraNombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="obraCliente">Cliente</label>
              <input
                id="obraCliente"
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="obraDireccion">Direccion</label>
              <input
                id="obraDireccion"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="obraZona">Zona</label>
              <select id="obraZona" value={form.zonaId} onChange={(e) => handleZonaChange(e.target.value)} required>
                <option value="">Selecciona una zona</option>
                {zonas.map((zona) => (
                  <option key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </option>
                ))}
                <option value={NUEVA}>+ Crear zona nueva</option>
              </select>
            </div>

            {form.zonaId === NUEVA && (
              <div className="field">
                <label htmlFor="zonaNueva">Nombre de la zona nueva</label>
                <input
                  id="zonaNueva"
                  value={form.zonaNombreNueva}
                  onChange={(e) => setForm({ ...form, zonaNombreNueva: e.target.value })}
                  required
                />
              </div>
            )}

            {form.zonaId && form.zonaId !== NUEVA && (
              <div className="field">
                <label htmlFor="obraLocalidad">Localidad</label>
                <select
                  id="obraLocalidad"
                  value={form.localidadId}
                  onChange={(e) => setForm({ ...form, localidadId: e.target.value })}
                  required
                >
                  <option value="">Selecciona una localidad</option>
                  {localidadesDisponibles.map((localidad) => (
                    <option key={localidad.id} value={localidad.id}>
                      {localidad.nombre}
                    </option>
                  ))}
                  <option value={NUEVA}>+ Crear localidad nueva</option>
                </select>
              </div>
            )}

            {necesitaLocalidadNueva && (
              <div className="field">
                <label htmlFor="localidadNueva">Nombre de la localidad nueva</label>
                <input
                  id="localidadNueva"
                  value={form.localidadNombreNueva}
                  onChange={(e) => setForm({ ...form, localidadNombreNueva: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="obraPresupuesto">Presupuesto</label>
              <input
                id="obraPresupuesto"
                type="number"
                min="0"
                step="0.01"
                value={form.presupuesto}
                onChange={(e) => setForm({ ...form, presupuesto: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="obraFechaInicio">Fecha de inicio</label>
              <input
                id="obraFechaInicio"
                type="date"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="obraFechaFin">Fecha fin estimada</label>
              <input
                id="obraFechaFin"
                type="date"
                value={form.fechaFinEstimada}
                onChange={(e) => setForm({ ...form, fechaFinEstimada: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="obraResidente">Residente lider (opcional)</label>
              <select
                id="obraResidente"
                value={form.residenteId}
                onChange={(e) => setForm({ ...form, residenteId: e.target.value })}
              >
                <option value="">Sin asignar</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.name} ({usuario.rol})
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear obra"}
            </button>
          </form>
        </Modal>
      )}

      {mostrarModalSubObra && obraSeleccionada && (
        <Modal title={`Nueva sub-obra en ${obraSeleccionada.nombre}`} onClose={() => setMostrarModalSubObra(false)}>
          {subObraError && <div className="form-error">{subObraError}</div>}
          <form className="stacked-form" onSubmit={handleSubmitSubObra}>
            <div className="field">
              <label htmlFor="subObraNombre">Nombre</label>
              <input
                id="subObraNombre"
                value={subObraForm.nombre}
                onChange={(e) => setSubObraForm({ ...subObraForm, nombre: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="subObraDescripcion">Descripcion</label>
              <input
                id="subObraDescripcion"
                value={subObraForm.descripcion}
                onChange={(e) => setSubObraForm({ ...subObraForm, descripcion: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="subObraResponsable">Responsable de calidad/produccion</label>
              <select
                id="subObraResponsable"
                value={subObraForm.responsableCalidadId}
                onChange={(e) => setSubObraForm({ ...subObraForm, responsableCalidadId: e.target.value })}
              >
                <option value="">Sin asignar</option>
                {calidadDisponibles.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="subObraNumeroPartida">Numero de partida (opcional)</label>
              <input
                id="subObraNumeroPartida"
                value={subObraForm.numeroPartida}
                onChange={(e) => setSubObraForm({ ...subObraForm, numeroPartida: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="subObraArchivoPartida">Archivo de partida (opcional)</label>
              <input
                id="subObraArchivoPartida"
                type="file"
                onChange={(e) => setArchivoPartida(e.target.files?.[0] || null)}
              />
            </div>

            <div className="field">
              <label>Equipo asignado (opcional)</label>
              {equipoDisponible.length === 0 ? (
                <p className="muted">Todavia no hay usuarios en el equipo.</p>
              ) : (
                <div className="vista-checklist">
                  {equipoDisponible.map((usuario) => (
                    <label key={usuario.id} className="vista-check">
                      <input
                        type="checkbox"
                        checked={subObraForm.residenteIds.includes(usuario.id)}
                        onChange={() => toggleResidente(usuario.id)}
                      />
                      {usuario.name} <span className="muted">({usuario.rol})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button className="btn-primary" type="submit" disabled={submittingSubObra}>
              {submittingSubObra ? "Creando..." : "Crear sub-obra"}
            </button>
          </form>
        </Modal>
      )}

      {subObraParaActividades && (
        <ActividadesModal
          subObra={subObraParaActividades}
          puedeCrear={puedeCrearActividades}
          puedeMarcarUrgente
          onClose={() => setSubObraParaActividades(null)}
        />
      )}

      {obraEnEdicion && (
        <Modal title={`Editar ${obraEnEdicion.nombre}`} onClose={() => setObraEnEdicion(null)}>
          {editarObraError && <div className="form-error">{editarObraError}</div>}
          <form className="stacked-form" onSubmit={handleGuardarEdicionObra}>
            <div className="field">
              <label htmlFor="editarObraEstado">Estado</label>
              <select
                id="editarObraEstado"
                value={editarObraForm.estado}
                onChange={(e) => setEditarObraForm({ ...editarObraForm, estado: e.target.value })}
              >
                {ESTADOS_OBRA.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="editarObraResidente">Residente lider</label>
              <select
                id="editarObraResidente"
                value={editarObraForm.residenteId}
                onChange={(e) => setEditarObraForm({ ...editarObraForm, residenteId: e.target.value })}
              >
                <option value="">Sin asignar</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.name} ({usuario.rol})
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={guardandoObra}>
              {guardandoObra ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default ObrasPanel;
