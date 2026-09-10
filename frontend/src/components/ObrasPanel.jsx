import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
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

const CONFIRM_TEXTOS = {
  "obra-activa": {
    title: "Desactivar/reactivar obra",
    message: (a) =>
      a.obra.activa
        ? `Esto va a sacar "${a.obra.nombre}" de los listados operativos (calendario, pedidos, etc.) para todos los usuarios. No se borra nada y se puede reactivar despues.`
        : `"${a.obra.nombre}" vuelve a aparecer en los listados operativos para todos los usuarios.`,
    confirmLabel: "Confirmar",
    danger: false,
  },
  "obra-eliminar": {
    title: "Eliminar obra",
    message: (a) =>
      `Esta accion es permanente y no se puede deshacer. Se van a borrar tambien todas sus sub-obras, actividades, avances y pedidos asociados a "${a.obra.nombre}". Si preferis conservar el historial, desactivala en vez de eliminarla.`,
    confirmLabel: "Eliminar definitivamente",
    danger: true,
  },
  "subobra-activa": {
    title: "Desactivar/reactivar sub-obra",
    message: (a) =>
      a.subObra.activa
        ? `Esto va a sacar "${a.subObra.nombre}" de los listados operativos para todos los usuarios. No se borra nada y se puede reactivar despues.`
        : `"${a.subObra.nombre}" vuelve a aparecer en los listados operativos para todos los usuarios.`,
    confirmLabel: "Confirmar",
    danger: false,
  },
  "subobra-eliminar": {
    title: "Eliminar sub-obra",
    message: (a) =>
      `Esta accion es permanente y no se puede deshacer. Se van a borrar tambien sus actividades, avances y pedidos asociados a "${a.subObra.nombre}". Si preferis conservar el historial, desactivala en vez de eliminarla.`,
    confirmLabel: "Eliminar definitivamente",
    danger: true,
  },
};

function ObrasPanel({ currentUser }) {
  const esAdmin = currentUser?.rol === "ADMINISTRADOR";
  const esSupervisor = currentUser?.rol === "SUPERVISOR";
  const puedeCrearActividades = esAdmin || esSupervisor;
  // Con la vista "obras" (o Admin/Supervisor) se ve el listado completo
  // de la empresa; sin ella, solo las obras que el usuario lidera
  // (Obra.residenteId), para poder gestionar sus propias sub-obras.
  const vistaCompleta = esAdmin || esSupervisor || Boolean(currentUser?.vistas?.includes("obras"));

  function puedeGestionarObra(obra) {
    return esAdmin || esSupervisor || obra?.residenteId === currentUser?.id;
  }

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

  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmError, setConfirmError] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function loadObras() {
    setLoading(true);
    setListError("");
    try {
      const data = await apiFetch(vistaCompleta ? "/api/obras" : "/api/obras/mias");
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
      const data = await apiFetch("/api/obras/usuarios-disponibles");
      setUsuarios(data.usuarios);
    } catch (err) {
      setListError(err.message);
    }
  }

  useEffect(() => {
    loadObras();
    loadUsuarios();
    if (esAdmin) {
      loadZonas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function pedirConfirmacion(action) {
    setConfirmError("");
    setConfirmAction(action);
  }

  async function handleConfirmar() {
    if (!confirmAction) return;
    setConfirmError("");
    setConfirmLoading(true);
    try {
      if (confirmAction.tipo === "obra-activa") {
        const data = await apiFetch(`/api/obras/${confirmAction.obra.id}`, {
          method: "PATCH",
          body: JSON.stringify({ activa: !confirmAction.obra.activa }),
        });
        setObras((prev) => prev.map((o) => (o.id === data.obra.id ? { ...o, ...data.obra } : o)));
      } else if (confirmAction.tipo === "obra-eliminar") {
        await apiFetch(`/api/obras/${confirmAction.obra.id}`, { method: "DELETE" });
        setObras((prev) => prev.filter((o) => o.id !== confirmAction.obra.id));
        if (obraSeleccionadaId === confirmAction.obra.id) {
          setMostrarModalSubObras(false);
        }
      } else if (confirmAction.tipo === "subobra-activa") {
        const data = await apiFetch(`/api/sub-obras/${confirmAction.subObra.id}`, {
          method: "PATCH",
          body: JSON.stringify({ activa: !confirmAction.subObra.activa }),
        });
        setSubObras((prev) => prev.map((s) => (s.id === data.subObra.id ? { ...s, ...data.subObra } : s)));
      } else if (confirmAction.tipo === "subobra-eliminar") {
        await apiFetch(`/api/sub-obras/${confirmAction.subObra.id}`, { method: "DELETE" });
        setSubObras((prev) => prev.filter((s) => s.id !== confirmAction.subObra.id));
      }
      setConfirmAction(null);
    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setConfirmLoading(false);
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
          {esAdmin && (
            <button className="btn-small" type="button" onClick={handleOpenModalObra}>
              + Nueva obra
            </button>
          )}
        </div>
        {listError && <div className="form-error">{listError}</div>}
        {!vistaCompleta && (
          <p className="muted vista-block">Mostrando solo las obras que lideras.</p>
        )}
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
                  <th>Activa</th>
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
                    <td>
                      <span className={obra.activa ? "role-pill" : "role-pill role-pill-muted"}>
                        {obra.activa ? "Si" : "No"}
                      </span>
                    </td>
                    {esAdmin && (
                      <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-link" type="button" onClick={() => handleOpenEditarObra(obra)}>
                          Editar
                        </button>
                        <button
                          className="btn-link"
                          type="button"
                          onClick={() => pedirConfirmacion({ tipo: "obra-activa", obra })}
                        >
                          {obra.activa ? "Desactivar" : "Reactivar"}
                        </button>
                        <button
                          className="btn-link btn-link-danger"
                          type="button"
                          onClick={() => pedirConfirmacion({ tipo: "obra-eliminar", obra })}
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
        {!loading && obras.length > 0 && <p className="muted vista-block">Toca una obra para ver sus sub-obras.</p>}
      </section>

      {mostrarModalSubObras && obraSeleccionada && (
        <Modal title={`Sub-obras de ${obraSeleccionada.nombre}`} onClose={() => setMostrarModalSubObras(false)}>
          <div className="panel-card-header">
            <span className="muted">{subObras.length} sub-obra(s)</span>
            {puedeGestionarObra(obraSeleccionada) && (
              <button className="btn-small" type="button" onClick={handleOpenModalSubObra}>
                + Nueva sub-obra
              </button>
            )}
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
                      <th>Activa</th>
                      {puedeGestionarObra(obraSeleccionada) && <th></th>}
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
                        <td>
                          <span className={subObra.activa ? "role-pill" : "role-pill role-pill-muted"}>
                            {subObra.activa ? "Si" : "No"}
                          </span>
                        </td>
                        {puedeGestionarObra(obraSeleccionada) && (
                          <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn-link"
                              type="button"
                              onClick={() => pedirConfirmacion({ tipo: "subobra-activa", subObra })}
                            >
                              {subObra.activa ? "Desactivar" : "Reactivar"}
                            </button>
                            <button
                              className="btn-link btn-link-danger"
                              type="button"
                              onClick={() => pedirConfirmacion({ tipo: "subobra-eliminar", subObra })}
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

      {confirmAction && (
        <ConfirmModal
          title={CONFIRM_TEXTOS[confirmAction.tipo].title}
          message={
            <>
              {CONFIRM_TEXTOS[confirmAction.tipo].message(confirmAction)}
              {confirmError && <div className="form-error" style={{ marginTop: 12 }}>{confirmError}</div>}
            </>
          }
          confirmLabel={confirmLoading ? "Procesando..." : CONFIRM_TEXTOS[confirmAction.tipo].confirmLabel}
          danger={CONFIRM_TEXTOS[confirmAction.tipo].danger}
          loading={confirmLoading}
          onConfirm={handleConfirmar}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

export default ObrasPanel;
