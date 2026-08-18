import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";

const NUEVA = "__nueva__";
const TIPOS = [
  { value: "MATERIAL", label: "Material" },
  { value: "MAQUINARIA", label: "Maquinaria" },
  { value: "RECURSO", label: "Recurso" },
  { value: "ESPECIALISTA", label: "Especialista" },
];
const ESTADOS = ["SOLICITADO", "APROBADO", "RECHAZADO", "RESUELTO"];

const FORM_INICIAL = {
  subObraId: "",
  tipo: "MATERIAL",
  materialCatalogoId: "",
  materialCatalogoNombre: "",
  unidadMedida: "",
  cantidad: "",
  descripcion: "",
  fechaNecesaria: "",
  urgente: false,
};

function detalleSolicitud(s) {
  if (s.tipo === "MATERIAL") {
    return `${s.cantidad} ${s.materialCatalogo?.unidadMedida || ""} de ${s.materialCatalogo?.nombre || "material"}`;
  }
  return s.descripcion || "-";
}

function PedidosPanel({ currentUser }) {
  const esGestor = currentUser?.rol === "ADMINISTRADOR" || currentUser?.rol === "SUPERVISOR";

  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  const [obras, setObras] = useState([]);
  const [subObrasPorObra, setSubObrasPorObra] = useState({});
  const [subObrasMias, setSubObrasMias] = useState([]);
  const [catalogo, setCatalogo] = useState([]);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [obraFormId, setObraFormId] = useState("");
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadSolicitudes() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroTipo) params.set("tipo", filtroTipo);
      const query = params.toString();
      const data = await apiFetch(`/api/solicitudes${query ? `?${query}` : ""}`);
      setSolicitudes(data.solicitudes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroTipo]);

  useEffect(() => {
    apiFetch("/api/materiales-catalogo")
      .then((data) => setCatalogo(data.catalogo))
      .catch((err) => setError(err.message));
    if (esGestor) {
      apiFetch("/api/obras")
        .then((data) => setObras(data.obras))
        .catch((err) => setError(err.message));
    } else {
      apiFetch("/api/sub-obras/mias")
        .then((data) => setSubObrasMias(data.subObras))
        .catch((err) => setError(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleObraFormChange(obraId) {
    setObraFormId(obraId);
    setForm((prev) => ({ ...prev, subObraId: "" }));
    if (obraId && !subObrasPorObra[obraId]) {
      try {
        const data = await apiFetch(`/api/obras/${obraId}/sub-obras`);
        setSubObrasPorObra((prev) => ({ ...prev, [obraId]: data.subObras }));
      } catch (err) {
        setFormError(err.message);
      }
    }
  }

  function handleOpenForm() {
    setForm(FORM_INICIAL);
    setObraFormId("");
    setFormError("");
    setMostrarForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.subObraId) {
      setFormError("Elegi la sub-obra");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        subObraId: form.subObraId,
        tipo: form.tipo,
        fechaNecesaria: form.fechaNecesaria || undefined,
        urgente: form.urgente,
      };
      if (form.tipo === "MATERIAL") {
        if (form.materialCatalogoId === NUEVA) {
          if (!form.materialCatalogoNombre.trim() || !form.unidadMedida.trim()) {
            throw new Error("Falta el nombre y la unidad del material nuevo");
          }
          body.materialCatalogoNombre = form.materialCatalogoNombre.trim();
          body.unidadMedida = form.unidadMedida.trim();
        } else if (form.materialCatalogoId) {
          body.materialCatalogoId = form.materialCatalogoId;
        } else {
          throw new Error("Elegi un material del catalogo o crea uno nuevo");
        }
        if (!form.cantidad) {
          throw new Error("Falta la cantidad");
        }
        body.cantidad = form.cantidad;
      } else {
        if (!form.descripcion.trim()) {
          throw new Error("Falta la descripcion");
        }
        body.descripcion = form.descripcion.trim();
      }

      const data = await apiFetch("/api/solicitudes", { method: "POST", body: JSON.stringify(body) });
      setSolicitudes((prev) => [data.solicitud, ...prev]);
      setMostrarForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function cambiarEstado(solicitud, estado) {
    setCambiandoEstadoId(solicitud.id);
    setError("");
    try {
      const data = await apiFetch(`/api/solicitudes/${solicitud.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setSolicitudes((prev) => prev.map((s) => (s.id === solicitud.id ? data.solicitud : s)));
    } catch (err) {
      setError(err.message);
    } finally {
      setCambiandoEstadoId(null);
    }
  }

  const subObrasDisponibles = esGestor ? subObrasPorObra[obraFormId] || [] : subObrasMias;

  return (
    <section className="panel-card">
      <div className="panel-card-header">
        <h2>Pedidos</h2>
        <button className="btn-small" type="button" onClick={handleOpenForm}>
          + Nueva solicitud
        </button>
      </div>

      <div className="field-row">
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <p className="muted">Cargando...</p>
      ) : solicitudes.length === 0 ? (
        <p className="muted">Todavia no hay solicitudes.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sub-obra</th>
                <th>Tipo</th>
                <th>Detalle</th>
                <th>Necesaria para</th>
                <th>Urgente</th>
                <th>Estado</th>
                <th>Pedido por</th>
                {esGestor && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.subObra.obra?.nombre} &middot; {s.subObra.nombre}
                  </td>
                  <td>{TIPOS.find((t) => t.value === s.tipo)?.label || s.tipo}</td>
                  <td>{detalleSolicitud(s)}</td>
                  <td>{s.fechaNecesaria ? s.fechaNecesaria.slice(0, 10) : "-"}</td>
                  <td>{s.urgente ? <span className="urgente-pill">Urgente</span> : "-"}</td>
                  <td>
                    <span className="role-pill">{s.estado}</span>
                  </td>
                  <td>{s.creadoPor?.name || "-"}</td>
                  {esGestor && (
                    <td>
                      {s.estado === "SOLICITADO" && (
                        <>
                          <button
                            className="btn-link"
                            type="button"
                            disabled={cambiandoEstadoId === s.id}
                            onClick={() => cambiarEstado(s, "APROBADO")}
                          >
                            Aprobar
                          </button>{" "}
                          <button
                            className="btn-link"
                            type="button"
                            disabled={cambiandoEstadoId === s.id}
                            onClick={() => cambiarEstado(s, "RECHAZADO")}
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      {s.estado === "APROBADO" && (
                        <button
                          className="btn-link"
                          type="button"
                          disabled={cambiandoEstadoId === s.id}
                          onClick={() => cambiarEstado(s, "RESUELTO")}
                        >
                          Marcar resuelto
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarForm && (
        <Modal title="Nueva solicitud" onClose={() => setMostrarForm(false)}>
          {formError && <div className="form-error">{formError}</div>}
          <form className="stacked-form" onSubmit={handleSubmit}>
            {esGestor && (
              <div className="field">
                <label htmlFor="pedidoObra">Obra</label>
                <select id="pedidoObra" value={obraFormId} onChange={(e) => handleObraFormChange(e.target.value)} required>
                  <option value="">Selecciona una obra</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label htmlFor="pedidoSubObra">Sub-obra</label>
              <select
                id="pedidoSubObra"
                value={form.subObraId}
                onChange={(e) => setForm({ ...form, subObraId: e.target.value })}
                required
              >
                <option value="">Selecciona una sub-obra</option>
                {subObrasDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="pedidoTipo">Tipo</label>
              <select id="pedidoTipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {form.tipo === "MATERIAL" ? (
              <>
                <div className="field">
                  <label htmlFor="pedidoMaterial">Material</label>
                  <select
                    id="pedidoMaterial"
                    value={form.materialCatalogoId}
                    onChange={(e) => setForm({ ...form, materialCatalogoId: e.target.value })}
                    required
                  >
                    <option value="">Selecciona un material</option>
                    {catalogo.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.unidadMedida})
                      </option>
                    ))}
                    <option value={NUEVA}>+ Crear material nuevo</option>
                  </select>
                </div>

                {form.materialCatalogoId === NUEVA && (
                  <>
                    <div className="field">
                      <label htmlFor="pedidoMaterialNombre">Nombre del material nuevo</label>
                      <input
                        id="pedidoMaterialNombre"
                        value={form.materialCatalogoNombre}
                        onChange={(e) => setForm({ ...form, materialCatalogoNombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="pedidoUnidad">Unidad de medida</label>
                      <input
                        id="pedidoUnidad"
                        placeholder="ej. bolsas, m3, unidades"
                        value={form.unidadMedida}
                        onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="field">
                  <label htmlFor="pedidoCantidad">Cantidad</label>
                  <input
                    id="pedidoCantidad"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cantidad}
                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="field">
                <label htmlFor="pedidoDescripcion">Descripcion</label>
                <input
                  id="pedidoDescripcion"
                  placeholder={
                    form.tipo === "MAQUINARIA"
                      ? "ej. retroexcavadora, 2 dias"
                      : form.tipo === "ESPECIALISTA"
                      ? "ej. electricista certificado"
                      : "Detalle del recurso"
                  }
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="pedidoFecha">Fecha en que se necesita</label>
              <input
                id="pedidoFecha"
                type="date"
                value={form.fechaNecesaria}
                onChange={(e) => setForm({ ...form, fechaNecesaria: e.target.value })}
              />
            </div>

            <label className="vista-check">
              <input
                type="checkbox"
                checked={form.urgente}
                onChange={(e) => setForm({ ...form, urgente: e.target.checked })}
              />
              Urgente
            </label>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar solicitud"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default PedidosPanel;
