const prisma = require("../utils/prisma");

function scopedWhere(req, extra = {}) {
  return {
    ...extra,
    obra: { localidad: { zona: { empresaId: req.user.empresaId } } },
  };
}

async function getById(req, res) {
  const id = Number(req.params.id);

  const subObra = await prisma.subObra.findFirst({
    where: scopedWhere(req, { id }),
    include: {
      obra: { select: { id: true, nombre: true } },
      responsableCalidad: { select: { id: true, name: true } },
      avances: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  return res.json({ subObra });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const { nombre, descripcion, estado, responsableCalidadId } = req.body;

  const existing = await prisma.subObra.findFirst({ where: scopedWhere(req, { id }) });
  if (!existing) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  if (responsableCalidadId != null) {
    const responsable = await prisma.usuario.findFirst({
      where: { id: Number(responsableCalidadId), empresaId: req.user.empresaId },
    });
    if (!responsable) {
      return res.status(404).json({ message: "Responsable de calidad no encontrado" });
    }
  }

  const subObra = await prisma.subObra.update({
    where: { id },
    data: {
      nombre,
      descripcion,
      estado,
      responsableCalidadId: responsableCalidadId != null ? Number(responsableCalidadId) : undefined,
    },
  });

  return res.json({ subObra });
}

async function remove(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.subObra.findFirst({ where: scopedWhere(req, { id }) });
  if (!existing) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  await prisma.subObra.delete({ where: { id } });

  return res.status(204).send();
}

async function listAvances(req, res) {
  const subObraId = Number(req.params.id);

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  const avances = await prisma.avance.findMany({
    where: { subObraId },
    include: { creadoPor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ avances });
}

async function createAvance(req, res) {
  const subObraId = Number(req.params.id);
  const { titulo, descripcion, porcentaje, imagenes, actividadProgramadaId } = req.body;

  if (!titulo) {
    return res.status(400).json({ message: "titulo es obligatorio" });
  }

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  const avance = await prisma.avance.create({
    data: {
      subObraId,
      actividadProgramadaId: actividadProgramadaId != null ? Number(actividadProgramadaId) : null,
      titulo,
      descripcion,
      porcentaje: porcentaje != null ? Number(porcentaje) : 0,
      imagenes: Array.isArray(imagenes) ? imagenes : [],
      creadoPorId: req.user.id,
    },
  });

  return res.status(201).json({ avance });
}

module.exports = {
  getById,
  update,
  remove,
  listAvances,
  createAvance,
};
