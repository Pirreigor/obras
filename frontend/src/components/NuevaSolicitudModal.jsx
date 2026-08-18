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

// Modal para pedir material/maquinaria/recurso/especialista.
// - Si se pasa `obras`, muestra un selector Obra -> Sub-obra en cascada
//   (uso desde la pantalla central de Pedidos, para Administrador/Supervisor).
// - Si se pasa `subObras` directamente, se elige sub-obra de esa lista
//   (uso desde el calendario o el modal de Actividades de una sub-obra).
// - `subObraFijaId`/`actividadFijaId` bloquean esos campos cuando ya se
//   conoce el contexto (ej. se pide desde una actividad puntual).
function NuevaSolicitudModal({ obras, subObras, subObraFijaId, actividadFijaId, onClose, onCreada }) {
  const [catalogo, setCatalogo] = useState([]);
  const [obraId, setObraId] = useState("");
  const [subObrasCascada, setSubObrasCascada] = useState([]);
  const [subObraId, setSubObraId] = useState(subObraFijaId ? String(subObraFijaId) : "");
  const [actividadesDisponibles, setActividadesDisponibles] = useState([]);
  const [actividadProgramadaId, setActividadProgramadaId] = useState(
    actividadFijaId ? String(actividadFijaId) : ""
  );
  const [tipo, setTipo] = useState("MATERIAL");
  const [materialCatalogoId, setMaterialCatalogoId] = useState("");
  const [materialCatalogoNombre, setMaterialCatalogoNombre] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaNecesaria, setFechaNecesaria] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch("/api/materiales-catalogo")
      .then((data) => setCatalogo(data.catalogo))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!subObraId || actividadFijaId) {
      setActividadesDisponibles([]);
      return;
    }
    apiFetch(`/api/sub-obras/${subObraId}/actividades`)
      .then((data) => setActividadesDisponibles(data.actividades))
      .catch((err) => setError(err.message));
  }, [subObraId, actividadFijaId]);

  async function handleObraChange(nuevoObraId) {
    setObraId(nuevoObraId);
    setSubObraId("");
    setActividadProgramadaId("");
    setSubObrasCascada([]);
    if (nuevoObraId) {
      try {
        const data = await apiFetch(`/api/obras/${nuevoObraId}/sub-obras`);
        setSubObrasCascada(data.subObras);
      } catch (err) {
        setError(err.message);
      }
    }
  }

  const opcionesSubObra = obras ? subObrasCascada : subObras || [];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!subObraId) {
      setError("Elegi la sub-obra");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        subObraId,
        actividadProgramadaId: actividadProgramadaId || undefined,
        tipo,
        fechaNecesaria: fechaNecesaria || undefined,
        urgente,
      };
      if (tipo === "MATERIAL") {
        if (materialCatalogoId === NUEVA) {
          if (!materialCatalogoNombre.trim() || !unidadMedida.trim()) {
            throw new Error("Falta el nombre y la unidad del material nuevo");
          }
          body.materialCatalogoNombre = materialCatalogoNombre.trim();
          body.unidadMedida = unidadMedida.trim();
        } else if (materialCatalogoId) {
          body.materialCatalogoId = materialCatalogoId;
        } else {
          throw new Error("Elegi un material del catalogo o crea uno nuevo");
        }
        if (!cantidad) {
          throw new Error("Falta la cantidad");
        }
        body.cantidad = cantidad;
      } else {
        if (!descripcion.trim()) {
          throw new Error("Falta la descripcion");
        }
        body.descripcion = descripcion.trim();
      }

      const data = await apiFetch("/api/solicitudes", { method: "POST", body: JSON.stringify(body) });
      onCreada(data.solicitud);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Nueva solicitud" onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      <form className="stacked-form" onSubmit={handleSubmit}>
        {obras && (
          <div className="field">
            <label htmlFor="solObra">Obra</label>
            <select id="solObra" value={obraId} onChange={(e) => handleObraChange(e.target.value)} required>
              <option value="">Selecciona una obra</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {!subObraFijaId && (
          <div className="field">
            <label htmlFor="solSubObra">Sub-obra</label>
            <select
              id="solSubObra"
              value={subObraId}
              onChange={(e) => {
                setSubObraId(e.target.value);
                setActividadProgramadaId("");
              }}
              required
            >
              <option value="">Selecciona una sub-obra</option>
              {opcionesSubObra.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {!actividadFijaId && actividadesDisponibles.length > 0 && (
          <div className="field">
            <label htmlFor="solActividad">Actividad relacionada (opcional)</label>
            <select
              id="solActividad"
              value={actividadProgramadaId}
              onChange={(e) => setActividadProgramadaId(e.target.value)}
            >
              <option value="">Sin actividad especifica</option>
              {actividadesDisponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.actividadCatalogo?.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="solTipo">Tipo</label>
          <select id="solTipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {tipo === "MATERIAL" ? (
          <>
            <div className="field">
              <label htmlFor="solMaterial">Material</label>
              <select
                id="solMaterial"
                value={materialCatalogoId}
                onChange={(e) => setMaterialCatalogoId(e.target.value)}
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

            {materialCatalogoId === NUEVA && (
              <>
                <div className="field">
                  <label htmlFor="solMaterialNombre">Nombre del material nuevo</label>
                  <input
                    id="solMaterialNombre"
                    value={materialCatalogoNombre}
                    onChange={(e) => setMaterialCatalogoNombre(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="solUnidad">Unidad de medida</label>
                  <input
                    id="solUnidad"
                    placeholder="ej. bolsas, m3, unidades"
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="solCantidad">Cantidad</label>
              <input
                id="solCantidad"
                type="number"
                min="0"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>
          </>
        ) : (
          <div className="field">
            <label htmlFor="solDescripcion">Descripcion</label>
            <input
              id="solDescripcion"
              placeholder={
                tipo === "MAQUINARIA"
                  ? "ej. retroexcavadora, 2 dias"
                  : tipo === "ESPECIALISTA"
                  ? "ej. electricista certificado"
                  : "Detalle del recurso"
              }
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="solFecha">Fecha en que se necesita</label>
          <input
            id="solFecha"
            type="date"
            value={fechaNecesaria}
            onChange={(e) => setFechaNecesaria(e.target.value)}
          />
        </div>

        <label className="vista-check">
          <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />
          Urgente
        </label>

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>
    </Modal>
  );
}

export default NuevaSolicitudModal;
