const prisma = require("../utils/prisma");
const { porcentajeActividad, cantidadActividad } = require("../utils/progreso");

async function listMisActividades(req, res) {
  const actividades = await prisma.actividadProgramada.findMany({
    where: {
      subObra: {
        activa: true,
        obra: { activa: true, localidad: { zona: { empresaId: req.user.empresaId } } },
        OR: [{ responsableCalidadId: req.user.id }, { residentes: { some: { usuarioId: req.user.id } } }],
      },
    },
    include: {
      actividadCatalogo: true,
      subObra: { select: { id: true, nombre: true } },
      // avances propios: se usan para marcar que dias registro ESTE
      // usuario en el calendario (checkmarks personales).
      avances: {
        where: { creadoPorId: req.user.id },
        orderBy: { fecha: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // % y cantidad acumulada reales: de TODOS los que cargaron avance en
  // la actividad, no solo el usuario actual (si no, dos personas
  // trabajando la misma partida no verian el avance real del equipo).
  const todosAvances = await prisma.avance.findMany({
    where: { actividadProgramadaId: { in: actividades.map((a) => a.id) } },
    select: { actividadProgramadaId: true, cantidad: true, porcentaje: true, fecha: true, createdAt: true },
  });
  const avancesPorActividad = {};
  for (const avance of todosAvances) {
    (avancesPorActividad[avance.actividadProgramadaId] ||= []).push(avance);
  }

  return res.json({
    actividades: actividades.map((actividad) => ({
      ...actividad,
      porcentajeActual: porcentajeActividad({ avances: avancesPorActividad[actividad.id] || [] }),
      cantidadActual: cantidadActividad({ avances: avancesPorActividad[actividad.id] || [] }),
    })),
  });
}

module.exports = {
  listMisActividades,
};
