const prisma = require("../utils/prisma");

async function listMisActividades(req, res) {
  const actividades = await prisma.actividadProgramada.findMany({
    where: {
      subObra: {
        obra: { localidad: { zona: { empresaId: req.user.empresaId } } },
        OR: [{ responsableCalidadId: req.user.id }, { residentes: { some: { usuarioId: req.user.id } } }],
      },
    },
    include: {
      actividadCatalogo: true,
      subObra: { select: { id: true, nombre: true } },
      avances: {
        where: { creadoPorId: req.user.id },
        orderBy: { fecha: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ actividades });
}

module.exports = {
  listMisActividades,
};
