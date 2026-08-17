// El % de una actividad es el ultimo avance cargado (por fecha, y por
// creadoAt como desempate). El % de una sub-obra es el promedio de sus
// actividades, y el de una obra el promedio de sus sub-obras.

function porcentajeActividad(actividad) {
  const avances = actividad.avances || [];
  if (avances.length === 0) {
    return 0;
  }
  const ultimo = avances.reduce((a, b) => {
    if (a.fecha > b.fecha) return a;
    if (a.fecha < b.fecha) return b;
    return a.createdAt >= b.createdAt ? a : b;
  });
  return ultimo.porcentaje;
}

function porcentajeSubObra(subObra) {
  const actividades = subObra.actividadesProgramadas || [];
  if (actividades.length === 0) {
    return 0;
  }
  const total = actividades.reduce((sum, actividad) => sum + porcentajeActividad(actividad), 0);
  return Math.round(total / actividades.length);
}

function porcentajeObra(obra) {
  const subObras = obra.subObras || [];
  if (subObras.length === 0) {
    return 0;
  }
  const total = subObras.reduce((sum, subObra) => sum + porcentajeSubObra(subObra), 0);
  return Math.round(total / subObras.length);
}

module.exports = { porcentajeActividad, porcentajeSubObra, porcentajeObra };
