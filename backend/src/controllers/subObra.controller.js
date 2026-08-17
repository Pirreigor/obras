const prisma = require("../utils/prisma");

function scopedWhere(req, extra = {}) {
  return {
    ...extra,
    obra: { localidad: { zona: { empresaId: req.user.empresaId } } },
  };
}

async function listMias(req, res) {
  const subObras = await prisma.subObra.findMany({
    where: {
      obra: { localidad: { zona: { empresaId: req.user.empresaId } } },
      OR: [{ responsableCalidadId: req.user.id }, { residentes: { some: { usuarioId: req.user.id } } }],
    },
    include: {
      obra: { select: { id: true, nombre: true } },
      responsableCalidad: { select: { id: true, name: true } },
      residentes: { include: { usuario: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ subObras });
}

async function getById(req, res) {
  const id = Number(req.params.id);

  const subObra = await prisma.subObra.findFirst({
    where: scopedWhere(req, { id }),
    include: {
      obra: { select: { id: true, nombre: true } },
      responsableCalidad: { select: { id: true, name: true } },
      residentes: { include: { usuario: { select: { id: true, name: true } } } },
      actividadesProgramadas: { include: { actividadCatalogo: true }, orderBy: { createdAt: "desc" } },
      avances: { orderBy: { fecha: "desc" } },
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

async function listActividades(req, res) {
  const subObraId = Number(req.params.id);

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  const actividades = await prisma.actividadProgramada.findMany({
    where: { subObraId },
    include: { actividadCatalogo: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ actividades });
}

async function createActividad(req, res) {
  const subObraId = Number(req.params.id);
  const { actividadCatalogoId, actividadCatalogoNombre, fechaInicioPlan, fechaFinPlan } = req.body;

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  let catalogoId = actividadCatalogoId != null ? Number(actividadCatalogoId) : null;

  if (catalogoId) {
    const catalogo = await prisma.actividadCatalogo.findFirst({
      where: { id: catalogoId, empresaId: req.user.empresaId },
    });
    if (!catalogo) {
      return res.status(404).json({ message: "Actividad de catalogo no encontrada" });
    }
  } else {
    if (!actividadCatalogoNombre || !actividadCatalogoNombre.trim()) {
      return res.status(400).json({ message: "Falta actividadCatalogoId o actividadCatalogoNombre" });
    }
    const nombre = actividadCatalogoNombre.trim();
    const existente = await prisma.actividadCatalogo.findFirst({
      where: { empresaId: req.user.empresaId, nombre },
    });
    catalogoId = existente
      ? existente.id
      : (await prisma.actividadCatalogo.create({ data: { empresaId: req.user.empresaId, nombre } })).id;
  }

  const actividad = await prisma.actividadProgramada.create({
    data: {
      subObraId,
      actividadCatalogoId: catalogoId,
      fechaInicioPlan: fechaInicioPlan ? new Date(fechaInicioPlan) : null,
      fechaFinPlan: fechaFinPlan ? new Date(fechaFinPlan) : null,
    },
    include: { actividadCatalogo: true },
  });

  return res.status(201).json({ actividad });
}

async function updateActividad(req, res) {
  const subObraId = Number(req.params.id);
  const actividadId = Number(req.params.actividadId);
  const { urgente } = req.body;

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  const actividad = await prisma.actividadProgramada.findFirst({ where: { id: actividadId, subObraId } });
  if (!actividad) {
    return res.status(404).json({ message: "Tarea no encontrada" });
  }

  const actualizada = await prisma.actividadProgramada.update({
    where: { id: actividadId },
    data: { urgente: typeof urgente === "boolean" ? urgente : undefined },
    include: { actividadCatalogo: true },
  });

  return res.json({ actividad: actualizada });
}

async function listAvances(req, res) {
  const subObraId = Number(req.params.id);

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  const avances = await prisma.avance.findMany({
    where: { subObraId },
    include: { creadoPor: { select: { id: true, name: true } }, actividadProgramada: { include: { actividadCatalogo: true } } },
    orderBy: { fecha: "desc" },
  });

  return res.json({ avances });
}

async function createAvance(req, res) {
  const subObraId = Number(req.params.id);
  const { titulo, descripcion, porcentaje, imagenes, actividadProgramadaId, fecha } = req.body;

  if (!fecha) {
    return res.status(400).json({ message: "fecha es obligatoria" });
  }

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  if (actividadProgramadaId != null) {
    const actividad = await prisma.actividadProgramada.findFirst({
      where: { id: Number(actividadProgramadaId), subObraId },
    });
    if (!actividad) {
      return res.status(404).json({ message: "Actividad programada no encontrada en esta sub-obra" });
    }
  }

  const avance = await prisma.avance.create({
    data: {
      subObraId,
      actividadProgramadaId: actividadProgramadaId != null ? Number(actividadProgramadaId) : null,
      fecha: new Date(fecha),
      titulo: titulo || null,
      descripcion,
      porcentaje: porcentaje != null ? Number(porcentaje) : 0,
      imagenes: Array.isArray(imagenes) ? imagenes : [],
      creadoPorId: req.user.id,
    },
    include: { creadoPor: { select: { id: true, name: true } } },
  });

  return res.status(201).json({ avance });
}

module.exports = {
  listMias,
  getById,
  update,
  remove,
  listActividades,
  createActividad,
  updateActividad,
  listAvances,
  createAvance,
};
