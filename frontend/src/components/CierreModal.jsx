import { useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";

// Mismo criterio que el backend: cantidad de dias que dura la actividad
// segun su plan (inclusive), 1 dia si falta alguna de las dos fechas.
function contarDiasProgramados(actividad) {
  const inicio = actividad.fechaInicioPlan ? actividad.fechaInicioPlan.slice(0, 10) : null;
  const fin = actividad.fechaFinPlan ? actividad.fechaFinPlan.slice(0, 10) : null;
  if (!inicio || !fin) {
    return 1;
  }
  const dias = Math.round((new Date(`${fin}T00:00:00Z`) - new Date(`${inicio}T00:00:00Z`)) / 86400000) + 1;
  return Math.max(1, dias);
}

function CierreModal({ actividad, fecha, onClose, onCerrado }) {
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [avisoEvidencia, setAvisoEvidencia] = useState("");

  const totalDias = contarDiasProgramados(actividad);
  const diasMarcados = new Set((actividad.avances || []).map((a) => a.fecha.slice(0, 10)));
  diasMarcados.add(fecha);
  const porcentajeResultante = Math.min(100, Math.round((diasMarcados.size / totalDias) * 100));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setAvisoEvidencia("");
    try {
      let imagenUrl;
      if (archivo) {
        try {
          const formData = new FormData();
          formData.append("evidencia", archivo);
          const subida = await apiFetch("/api/uploads", { method: "POST", body: formData });
          imagenUrl = subida.url;
        } catch (err) {
          setAvisoEvidencia("No se pudo subir la evidencia, se cierra igual sin la foto.");
        }
      }

      const data = await apiFetch(
        `/api/sub-obras/${actividad.subObra.id}/actividades/${actividad.id}/cerrar`,
        {
          method: "POST",
          body: JSON.stringify({ fecha, descripcion: descripcion || undefined, imagenUrl }),
        }
      );
      onCerrado(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Marcar ${actividad.actividadCatalogo?.nombre || "actividad"}`} onClose={onClose}>
      <p className="muted">
        {actividad.subObra.nombre} &middot; {fecha}
      </p>
      {totalDias > 1 && (
        <p className="muted">
          Esta actividad dura {totalDias} dias. Con esta marca llega a {porcentajeResultante}%
          {porcentajeResultante >= 100 ? " y se cierra." : "."}
        </p>
      )}
      {error && <div className="form-error">{error}</div>}
      {avisoEvidencia && <div className="form-error">{avisoEvidencia}</div>}
      <form className="stacked-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="cierreComentario">Comentario (opcional)</label>
          <input id="cierreComentario" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cierreEvidencia">Evidencia fotografica (opcional)</label>
          <input
            id="cierreEvidencia"
            type="file"
            accept="image/*"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
          />
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting
            ? "Guardando..."
            : porcentajeResultante >= 100
            ? "Marcar como completada (100%)"
            : `Marcar este dia (${porcentajeResultante}%)`}
        </button>
      </form>
    </Modal>
  );
}

export default CierreModal;
