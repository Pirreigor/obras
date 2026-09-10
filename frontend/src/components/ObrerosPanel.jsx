import { useEffect, useState } from "react";
import { apiFetch, apiDownload } from "../api";
import Modal from "./Modal";

const FORM_INICIAL = {
  nombre: "",
  apellido: "",
  especialidad: "",
  sueldoSemanal: "",
  zonaId: "",
  localidadId: "",
};

function ObrerosPanel({ currentUser }) {
  const esAdmin = currentUser?.rol === "ADMINISTRADOR";

  const [obreros, setObreros] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [localidadesPorZona, setLocalidadesPorZona] = useState({});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [obreroEnEdicion, setObreroEnEdicion] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [archivoDni, setArchivoDni] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [exportando, setExportando] = useState(false);

  async function handleExportar() {
    setExportando(true);
    setListError("");
    try {
      await apiDownload("/api/obreros/exportar", "obreros.xlsx");
    } catch (err) {
      setListError(err.message);
    } finally {
      setExportando(false);
    }
  }

  async function loadObreros() {
    setLoading(true);
    setListError("");
    try {
      const data = await apiFetch("/api/obreros");
      setObreros(data.obreros);
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

  useEffect(() => {
    loadObreros();
    loadZonas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleZonaChange(zonaId) {
    setForm((prev) => ({ ...prev, zonaId, localidadId: "" }));
    if (zonaId && !localidadesPorZona[zonaId]) {
      try {
        const data = await apiFetch(`/api/zonas/${zonaId}/localidades`);
        setLocalidadesPorZona((prev) => ({ ...prev, [zonaId]: data.localidades }));
      } catch (err) {
        setFormError(err.message);
      }
    }
  }

  function handleOpenForm(obrero) {
    setObreroEnEdicion(obrero || null);
    setArchivoDni(null);
    setFormError("");
    if (obrero) {
      const zonaId = String(obrero.localidad?.zona?.id || "");
      setForm({
        nombre: obrero.nombre,
        apellido: obrero.apellido,
        especialidad: obrero.especialidad,
        sueldoSemanal: String(obrero.sueldoSemanal),
        zonaId,
        localidadId: String(obrero.localidadId),
      });
      if (zonaId && !localidadesPorZona[zonaId]) {
        apiFetch(`/api/zonas/${zonaId}/localidades`)
          .then((data) => setLocalidadesPorZona((prev) => ({ ...prev, [zonaId]: data.localidades })))
          .catch((err) => setFormError(err.message));
      }
    } else {
      setForm(FORM_INICIAL);
    }
    setMostrarForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.localidadId) {
      setFormError("Elegi la localidad");
      return;
    }
    setSubmitting(true);
    try {
      let dniUrl;
      if (archivoDni) {
        try {
          const formData = new FormData();
          formData.append("evidencia", archivoDni);
          formData.append("carpeta", "obreros");
          const subida = await apiFetch("/api/uploads", { method: "POST", body: formData });
          dniUrl = subida.url;
        } catch (err) {
          throw new Error(`No se pudo subir el DNI: ${err.message}`);
        }
      }

      const body = {
        nombre: form.nombre,
        apellido: form.apellido,
        especialidad: form.especialidad,
        sueldoSemanal: form.sueldoSemanal,
        localidadId: form.localidadId,
        dniUrl,
      };

      if (obreroEnEdicion) {
        const data = await apiFetch(`/api/obreros/${obreroEnEdicion.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setObreros((prev) => prev.map((o) => (o.id === data.obrero.id ? data.obrero : o)));
      } else {
        const data = await apiFetch("/api/obreros", { method: "POST", body: JSON.stringify(body) });
        setObreros((prev) => [data.obrero, ...prev]);
      }
      setMostrarForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEliminar(obrero) {
    setEliminandoId(obrero.id);
    setListError("");
    try {
      await apiFetch(`/api/obreros/${obrero.id}`, { method: "DELETE" });
      setObreros((prev) => prev.filter((o) => o.id !== obrero.id));
    } catch (err) {
      setListError(err.message);
    } finally {
      setEliminandoId(null);
    }
  }

  const localidadesDisponibles = form.zonaId ? localidadesPorZona[form.zonaId] || [] : [];

  return (
    <section className="panel-card">
      <div className="panel-card-header">
        <h2>Obreros</h2>
        <div className="calendar-nav">
          <button className="btn-small" type="button" onClick={handleExportar} disabled={exportando}>
            {exportando ? "Exportando..." : "Exportar Excel"}
          </button>
          <button className="btn-small" type="button" onClick={() => handleOpenForm(null)}>
            + Registrar obrero
          </button>
        </div>
      </div>

      {listError && <div className="form-error">{listError}</div>}
      {loading ? (
        <p className="muted">Cargando...</p>
      ) : obreros.length === 0 ? (
        <p className="muted">Todavia no hay obreros registrados.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Especialidad</th>
                <th>Sueldo semanal</th>
                <th>Localidad</th>
                <th>DNI</th>
                {esAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {obreros.map((obrero) => (
                <tr key={obrero.id}>
                  <td>{obrero.nombre}</td>
                  <td>{obrero.apellido}</td>
                  <td>{obrero.especialidad}</td>
                  <td>{Number(obrero.sueldoSemanal).toLocaleString()}</td>
                  <td>
                    {obrero.localidad?.zona?.nombre} &middot; {obrero.localidad?.nombre}
                  </td>
                  <td>
                    {obrero.dniUrl ? (
                      <a href={obrero.dniUrl} target="_blank" rel="noreferrer">
                        Ver DNI
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  {esAdmin && (
                    <td>
                      <button className="btn-link" type="button" onClick={() => handleOpenForm(obrero)}>
                        Editar
                      </button>{" "}
                      <button
                        className="btn-link"
                        type="button"
                        disabled={eliminandoId === obrero.id}
                        onClick={() => handleEliminar(obrero)}
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
        <Modal title={obreroEnEdicion ? "Editar obrero" : "Nuevo obrero"} onClose={() => setMostrarForm(false)}>
          {formError && <div className="form-error">{formError}</div>}
          <form className="stacked-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="obreroNombre">Nombre</label>
              <input
                id="obreroNombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="obreroApellido">Apellido</label>
              <input
                id="obreroApellido"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="obreroEspecialidad">Especialidad</label>
              <input
                id="obreroEspecialidad"
                placeholder="ej. Albañil, Electricista, Soldador"
                value={form.especialidad}
                onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="obreroSueldo">Sueldo semanal</label>
              <input
                id="obreroSueldo"
                type="number"
                min="0"
                step="0.01"
                value={form.sueldoSemanal}
                onChange={(e) => setForm({ ...form, sueldoSemanal: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="obreroZona">Zona</label>
              <select id="obreroZona" value={form.zonaId} onChange={(e) => handleZonaChange(e.target.value)} required>
                <option value="">Selecciona una zona</option>
                {zonas.map((zona) => (
                  <option key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </option>
                ))}
              </select>
            </div>

            {form.zonaId && (
              <div className="field">
                <label htmlFor="obreroLocalidad">Localidad</label>
                <select
                  id="obreroLocalidad"
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
                </select>
              </div>
            )}

            <div className="field">
              <label htmlFor="obreroDni">DNI (opcional)</label>
              <input
                id="obreroDni"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setArchivoDni(e.target.files?.[0] || null)}
              />
              {obreroEnEdicion?.dniUrl && !archivoDni && (
                <p className="muted">
                  Ya tiene uno cargado:{" "}
                  <a href={obreroEnEdicion.dniUrl} target="_blank" rel="noreferrer">
                    ver DNI actual
                  </a>
                  . Subi uno nuevo solo si lo queres reemplazar.
                </p>
              )}
            </div>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : obreroEnEdicion ? "Guardar cambios" : "Crear obrero"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default ObrerosPanel;
