import { useState } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";

function CierreModal({ actividad, fecha, onClose, onCerrado }) {
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [avisoEvidencia, setAvisoEvidencia] = useState("");

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
    <Modal title={`Cerrar ${actividad.actividadCatalogo?.nombre || "actividad"}`} onClose={onClose}>
      <p className="muted">
        {actividad.subObra.nombre} &middot; {fecha}
      </p>
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
          {submitting ? "Cerrando..." : "Marcar como completada (100%)"}
        </button>
      </form>
    </Modal>
  );
}

export default CierreModal;
