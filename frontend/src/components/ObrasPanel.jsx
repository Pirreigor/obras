import { useEffect, useState } from "react";
import { apiFetch } from "../api";

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
};

const SUB_OBRA_FORM_INICIAL = { nombre: "", descripcion: "", responsableCalidadId: "", residenteIds: [] };

function ObrasPanel() {
  const [obras, setObras] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [localidadesPorZona, setLocalidadesPorZona] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);

  const [obraSeleccionadaId, setObraSeleccionadaId] = useState(null);
  const [subObras, setSubObras] = useState([]);
  const [loadingSubObras, setLoadingSubObras] = useState(false);
  const [subObraError, setSubObraError] = useState("");
  const [subObraForm, setSubObraForm] = useState(SUB_OBRA_FORM_INICIAL);
  const [submittingSubObra, setSubmittingSubObra] = useState(false);

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
        }),
      });

      setForm(FORM_INICIAL);
      setLocalidadesPorZona({});
      await Promise.all([loadObras(), loadZonas()]);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectObra(obra) {
    if (obraSeleccionadaId === obra.id) {
      setObraSeleccionadaId(null);
      return;
    }

    setObraSeleccionadaId(obra.id);
    setSubObraForm(SUB_OBRA_FORM_INICIAL);
    setSubObraError("");
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
      const data = await apiFetch(`/api/obras/${obraSeleccionadaId}/sub-obras`, {
        method: "POST",
        body: JSON.stringify({
          nombre: subObraForm.nombre,
          descripcion: subObraForm.descripcion || undefined,
          responsableCalidadId: subObraForm.responsableCalidadId || undefined,
          residenteIds: subObraForm.residenteIds,
        }),
      });
      setSubObras((prev) => [data.subObra, ...prev]);
      setSubObraForm(SUB_OBRA_FORM_INICIAL);
    } catch (err) {
      setSubObraError(err.message);
    } finally {
      setSubmittingSubObra(false);
    }
  }

  const localidadesDisponibles = form.zonaId && form.zonaId !== NUEVA ? localidadesPorZona[form.zonaId] || [] : [];
  const necesitaLocalidadNueva = form.zonaId === NUEVA || form.localidadId === NUEVA;
  const residentesDisponibles = usuarios.filter((u) => u.rol === "RESIDENTE");
  const calidadDisponibles = usuarios.filter((u) => u.rol === "CALIDAD_PRODUCCION");
  const obraSeleccionada = obras.find((o) => o.id === obraSeleccionadaId);

  return (
    <>
      <div className="panel-grid">
        <section className="panel-card">
          <h2>Obras</h2>
          {listError && <div className="form-error">{listError}</div>}
          {loading ? (
            <p className="muted">Cargando...</p>
          ) : obras.length === 0 ? (
            <p className="muted">Todavia no hay obras.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cliente</th>
                  <th>Localidad</th>
                  <th>Estado</th>
                  <th>Presupuesto</th>
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
                    <td>{obra.presupuesto != null ? Number(obra.presupuesto).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && obras.length > 0 && <p className="muted vista-block">Toca una obra para ver sus sub-obras.</p>}
        </section>

        <section className="panel-card">
          <h2>Nueva obra</h2>
          <p className="muted">
            Si todavia no existe la zona o la localidad, se pueden crear desde aca mismo.
          </p>
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

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear obra"}
            </button>
          </form>
        </section>
      </div>

      {obraSeleccionada && (
        <div className="panel-grid vista-block">
          <section className="panel-card">
            <h2>Sub-obras de {obraSeleccionada.nombre}</h2>
            {loadingSubObras ? (
              <p className="muted">Cargando...</p>
            ) : subObras.length === 0 ? (
              <p className="muted">Todavia no hay sub-obras.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Calidad/Produccion</th>
                    <th>Residentes</th>
                  </tr>
                </thead>
                <tbody>
                  {subObras.map((subObra) => (
                    <tr key={subObra.id}>
                      <td>{subObra.nombre}</td>
                      <td>
                        <span className="role-pill">{subObra.estado}</span>
                      </td>
                      <td>{subObra.responsableCalidad?.name || "-"}</td>
                      <td>
                        {subObra.residentes.length === 0
                          ? "-"
                          : subObra.residentes.map((r) => r.usuario.name).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel-card">
            <h2>Nueva sub-obra</h2>
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
                <label>Residentes asignados</label>
                {residentesDisponibles.length === 0 ? (
                  <p className="muted">No hay usuarios con rol RESIDENTE todavia.</p>
                ) : (
                  <div className="vista-checklist">
                    {residentesDisponibles.map((usuario) => (
                      <label key={usuario.id} className="vista-check">
                        <input
                          type="checkbox"
                          checked={subObraForm.residenteIds.includes(usuario.id)}
                          onChange={() => toggleResidente(usuario.id)}
                        />
                        {usuario.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn-primary" type="submit" disabled={submittingSubObra}>
                {submittingSubObra ? "Creando..." : "Crear sub-obra"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export default ObrasPanel;
