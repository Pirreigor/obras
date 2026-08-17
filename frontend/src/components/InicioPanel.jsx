import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import ActividadesModal from "./ActividadesModal";
import ProgressBar from "./ProgressBar";

function InicioPanel({ currentUser }) {
  const esGestor = currentUser?.rol === "ADMINISTRADOR" || currentUser?.rol === "SUPERVISOR";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subObraParaActividades, setSubObraParaActividades] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (esGestor) {
          const data = await apiFetch("/api/obras");
          setItems(data.obras);
        } else {
          const data = await apiFetch("/api/sub-obras/mias");
          setItems(data.subObras);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [esGestor]);

  if (loading) {
    return <p className="muted">Cargando...</p>;
  }

  if (error) {
    return <div className="form-error">{error}</div>;
  }

  return (
    <div>
      <h2 className="section-title">{esGestor ? "Mis obras" : "Mis sub-obras"}</h2>
      {items.length === 0 ? (
        <p className="muted">{esGestor ? "Todavia no hay obras." : "Todavia no tenes sub-obras asignadas."}</p>
      ) : (
        <div className="card-grid">
          {esGestor
            ? items.map((obra) => (
                <div className="info-card" key={obra.id}>
                  <h3>{obra.nombre}</h3>
                  <div className="info-card-meta">
                    <span>
                      <strong>Cliente:</strong> {obra.cliente || "-"}
                    </span>
                    <span>
                      <strong>Localidad:</strong> {obra.localidad?.zona?.nombre} &middot; {obra.localidad?.nombre}
                    </span>
                    <span className="role-pill">{obra.estado}</span>
                  </div>
                  <ProgressBar value={obra.porcentaje} />
                </div>
              ))
            : items.map((subObra) => (
                <div
                  className="info-card info-card-clickable"
                  key={subObra.id}
                  onClick={() => setSubObraParaActividades(subObra)}
                >
                  <h3>{subObra.nombre}</h3>
                  <div className="info-card-meta">
                    <span>
                      <strong>Obra:</strong> {subObra.obra?.nombre}
                    </span>
                    <span>
                      <strong>Calidad/Produccion:</strong> {subObra.responsableCalidad?.name || "-"}
                    </span>
                    <span className="role-pill">{subObra.estado}</span>
                  </div>
                  <ProgressBar value={subObra.porcentaje} />
                </div>
              ))}
        </div>
      )}

      {subObraParaActividades && (
        <ActividadesModal
          subObra={subObraParaActividades}
          puedeCrear
          puedeMarcarUrgente
          onClose={() => setSubObraParaActividades(null)}
        />
      )}
    </div>
  );
}

export default InicioPanel;
