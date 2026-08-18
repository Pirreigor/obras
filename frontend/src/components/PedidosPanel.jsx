import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";
import NuevaSolicitudModal from "./NuevaSolicitudModal";

const TIPOS = [
  { value: "MATERIAL", label: "Material" },
  { value: "MAQUINARIA", label: "Maquinaria" },
  { value: "RECURSO", label: "Recurso" },
  { value: "ESPECIALISTA", label: "Especialista" },
];
const ESTADOS = ["SOLICITADO", "APROBADO", "RECHAZADO", "RESUELTO"];

function detalleSolicitud(s) {
  if (s.tipo === "MATERIAL") {
    return `${s.cantidad} ${s.materialCatalogo?.unidadMedida || ""} de ${s.materialCatalogo?.nombre || "material"}`;
  }
  return s.descripcion || "-";
}

function AgruparPedidoModal({ cantidad, onClose, onConfirmar }) {
  const [factura, setFactura] = useState("");
  const [fechaEstimadaLlegada, setFechaEstimadaLlegada] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onConfirmar({ factura: factura || undefined, fechaEstimadaLlegada: fechaEstimadaLlegada || undefined });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Agrupar en un pedido" onClose={onClose}>
      <p className="muted">
        Se van a aprobar {cantidad} solicitud(es) juntas, como una sola compra/gestion.
      </p>
      {error && <div className="form-error">{error}</div>}
      <form className="stacked-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="pedidoFactura">Factura / numero de compra (opcional)</label>
          <input id="pedidoFactura" value={factura} onChange={(e) => setFactura(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pedidoFechaEstimada">Fecha estimada de llegada</label>
          <input
            id="pedidoFechaEstimada"
            type="date"
            value={fechaEstimadaLlegada}
            onChange={(e) => setFechaEstimadaLlegada(e.target.value)}
          />
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Aprobando..." : "Aprobar y agrupar"}
        </button>
      </form>
    </Modal>
  );
}

function PedidosPanel({ currentUser }) {
  const esGestor = currentUser?.rol === "ADMINISTRADOR" || currentUser?.rol === "SUPERVISOR";

  const [solicitudes, setSolicitudes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);
  const [recibiendoId, setRecibiendoId] = useState(null);

  const [obras, setObras] = useState([]);
  const [subObrasMias, setSubObrasMias] = useState([]);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [mostrarAgrupar, setMostrarAgrupar] = useState(false);

  async function loadSolicitudes() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroTipo) params.set("tipo", filtroTipo);
      const query = params.toString();
      const [solicitudesData, pedidosData] = await Promise.all([
        apiFetch(`/api/solicitudes${query ? `?${query}` : ""}`),
        apiFetch("/api/pedidos"),
      ]);
      setSolicitudes(solicitudesData.solicitudes);
      setPedidos(pedidosData.pedidos);
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

  function toggleSeleccionada(id) {
    setSeleccionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleAgrupar({ factura, fechaEstimadaLlegada }) {
    await apiFetch("/api/pedidos", {
      method: "POST",
      body: JSON.stringify({ solicitudIds: seleccionadas, factura, fechaEstimadaLlegada }),
    });
    setSeleccionadas([]);
    setMostrarAgrupar(false);
    loadSolicitudes();
  }

  async function marcarRecibido(pedido) {
    setRecibiendoId(pedido.id);
    setError("");
    try {
      await apiFetch(`/api/pedidos/${pedido.id}/recibido`, { method: "PATCH" });
      loadSolicitudes();
    } catch (err) {
      setError(err.message);
    } finally {
      setRecibiendoId(null);
    }
  }

  return (
    <section className="panel-card">
      <div className="panel-card-header">
        <h2>Pedidos</h2>
        <button className="btn-small" type="button" onClick={() => setMostrarForm(true)}>
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
        {esGestor && seleccionadas.length > 0 && (
          <button className="btn-primary" type="button" onClick={() => setMostrarAgrupar(true)}>
            Agrupar {seleccionadas.length} en un pedido
          </button>
        )}
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
                {esGestor && <th></th>}
                <th>Sub-obra</th>
                <th>Actividad</th>
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
                  {esGestor && (
                    <td>
                      {s.estado === "SOLICITADO" && (
                        <input
                          type="checkbox"
                          checked={seleccionadas.includes(s.id)}
                          onChange={() => toggleSeleccionada(s.id)}
                        />
                      )}
                    </td>
                  )}
                  <td>
                    {s.subObra.obra?.nombre} &middot; {s.subObra.nombre}
                  </td>
                  <td>{s.actividadProgramada?.actividadCatalogo?.nombre || "-"}</td>
                  <td>{TIPOS.find((t) => t.value === s.tipo)?.label || s.tipo}</td>
                  <td>{detalleSolicitud(s)}</td>
                  <td>{s.fechaNecesaria ? s.fechaNecesaria.slice(0, 10) : "-"}</td>
                  <td>{s.urgente ? <span className="urgente-pill">Urgente</span> : "-"}</td>
                  <td>
                    <span className="role-pill">{s.estado}</span>
                    {s.estado === "APROBADO" && s.pedido && (
                      <div className="muted">
                        {s.pedido.factura ? `Factura ${s.pedido.factura}` : "Sin factura"}
                        {s.pedido.fechaEstimadaLlegada
                          ? ` · llega ${s.pedido.fechaEstimadaLlegada.slice(0, 10)}`
                          : ""}
                      </div>
                    )}
                  </td>
                  <td>{s.creadoPor?.name || "-"}</td>
                  {esGestor && (
                    <td>
                      {s.estado === "SOLICITADO" && (
                        <button
                          className="btn-link"
                          type="button"
                          disabled={cambiandoEstadoId === s.id}
                          onClick={() => cambiarEstado(s, "RECHAZADO")}
                        >
                          Rechazar
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

      <h3 className="vista-block">Pedidos agrupados</h3>
      {pedidos.length === 0 ? (
        <p className="muted">Todavia no se agrupo ninguna solicitud en un pedido.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Contiene</th>
                <th>Fecha estimada</th>
                <th>Fecha real de llegada</th>
                <th>Creado por</th>
                {esGestor && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>{p.factura || "-"}</td>
                  <td>{p.solicitudes.length} solicitud(es)</td>
                  <td>{p.fechaEstimadaLlegada ? p.fechaEstimadaLlegada.slice(0, 10) : "-"}</td>
                  <td>{p.fechaLlegadaReal ? p.fechaLlegadaReal.slice(0, 10) : "-"}</td>
                  <td>{p.creadoPor?.name || "-"}</td>
                  {esGestor && (
                    <td>
                      {!p.fechaLlegadaReal && (
                        <button
                          className="btn-link"
                          type="button"
                          disabled={recibiendoId === p.id}
                          onClick={() => marcarRecibido(p)}
                        >
                          Marcar recibido
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
        <NuevaSolicitudModal
          obras={esGestor ? obras : undefined}
          subObras={esGestor ? undefined : subObrasMias}
          onClose={() => setMostrarForm(false)}
          onCreada={() => {
            setMostrarForm(false);
            loadSolicitudes();
          }}
        />
      )}

      {mostrarAgrupar && (
        <AgruparPedidoModal
          cantidad={seleccionadas.length}
          onClose={() => setMostrarAgrupar(false)}
          onConfirmar={handleAgrupar}
        />
      )}
    </section>
  );
}

export default PedidosPanel;
