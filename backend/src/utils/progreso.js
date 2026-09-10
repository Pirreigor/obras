// El % de una actividad es el ultimo avance cargado (por fecha, y por
// creadoAt como desempate). El % de una sub-obra es el promedio de sus
// actividades, y el de una obra el promedio de sus sub-obras.

function ultimoAvance(avances) {
  if (!avances || avances.length === 0) {
    return null;
  }
  return avances.reduce((a, b) => {
    if (a.fecha > b.fecha) return a;
    if (a.fecha < b.fecha) return b;
    return a.createdAt >= b.createdAt ? a : b;
  });
}

function porcentajeActividad(actividad) {
  const ultimo = ultimoAvance(actividad.avances);
  return ultimo ? ultimo.porcentaje : 0;
}

// Cantidad acumulada del ultimo avance (solo tiene sentido cuando la
// actividad tiene metrado cargado); null si nunca se cargo nada.
function cantidadActividad(actividad) {
  const ultimo = ultimoAvance(actividad.avances);
  return ultimo ? ultimo.cantidad : null;
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

module.exports = { porcentajeActividad, porcentajeSubObra, porcentajeObra, cantidadActividad };
