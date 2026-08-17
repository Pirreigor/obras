const prisma = require("../utils/prisma");

function scopedWhere(req, extra = {}) {
  return {
    ...extra,
    localidad: { zona: { empresaId: req.user.empresaId } },
  };
}

async function list(req, res) {
  const obras = await prisma.obra.findMany({
    where: scopedWhere(req),
    include: {
      localidad: { include: { zona: true } },
      residente: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ obras });
}

async function getById(req, res) {
  const id = Number(req.params.id);

  const obra = await prisma.obra.findFirst({
    where: scopedWhere(req, { id }),
    include: {
      localidad: { include: { zona: true } },
      residente: { select: { id: true, name: true } },
      subObras: {
        include: { responsableCalidad: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!obra) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  return res.json({ obra });
}

async function create(req, res) {
  const { nombre, descripcion, cliente, direccion, presupuesto, fechaInicio, fechaFinEstimada, localidadId, residenteId } =
    req.body;

  if (!nombre || !localidadId) {
    return res.status(400).json({ message: "nombre y localidadId son obligatorios" });
  }

  const localidad = await prisma.localidad.findFirst({
    where: { id: Number(localidadId), zona: { empresaId: req.user.empresaId } },
  });
  if (!localidad) {
    return res.status(404).json({ message: "Localidad no encontrada" });
  }

  if (residenteId != null) {
    const residente = await prisma.usuario.findFirst({
      where: { id: Number(residenteId), empresaId: req.user.empresaId },
    });
    if (!residente) {
      return res.status(404).json({ message: "Residente no encontrado" });
    }
  }

  const obra = await prisma.obra.create({
    data: {
      nombre,
      descripcion,
      cliente,
      direccion,
      presupuesto: presupuesto != null ? Number(presupuesto) : null,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada) : null,
      localidadId: localidad.id,
      residenteId: residenteId != null ? Number(residenteId) : null,
    },
  });

  return res.status(201).json({ obra });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const { nombre, descripcion, cliente, direccion, estado, presupuesto, fechaInicio, fechaFinEstimada, localidadId, residenteId } =
    req.body;

  const existing = await prisma.obra.findFirst({ where: scopedWhere(req, { id }) });
  if (!existing) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  if (localidadId != null) {
    const localidad = await prisma.localidad.findFirst({
      where: { id: Number(localidadId), zona: { empresaId: req.user.empresaId } },
    });
    if (!localidad) {
      return res.status(404).json({ message: "Localidad no encontrada" });
    }
  }

  if (residenteId != null) {
    const residente = await prisma.usuario.findFirst({
      where: { id: Number(residenteId), empresaId: req.user.empresaId },
    });
    if (!residente) {
      return res.status(404).json({ message: "Residente no encontrado" });
    }
  }

  const obra = await prisma.obra.update({
    where: { id },
    data: {
      nombre,
      descripcion,
      cliente,
      direccion,
      estado,
      presupuesto: presupuesto != null ? Number(presupuesto) : undefined,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada) : undefined,
      localidadId: localidadId != null ? Number(localidadId) : undefined,
      residenteId: residenteId != null ? Number(residenteId) : undefined,
    },
  });

  return res.json({ obra });
}

async function remove(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.obra.findFirst({ where: scopedWhere(req, { id }) });
  if (!existing) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  await prisma.obra.delete({ where: { id } });

  return res.status(204).send();
}

async function listSubObras(req, res) {
  const obraId = Number(req.params.id);

  const obra = await prisma.obra.findFirst({ where: scopedWhere(req, { id: obraId }) });
  if (!obra) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  const subObras = await prisma.subObra.findMany({
    where: { obraId },
    include: { responsableCalidad: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ subObras });
}

async function createSubObra(req, res) {
  const obraId = Number(req.params.id);
  const { nombre, descripcion, responsableCalidadId } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: "nombre es obligatorio" });
  }

  const obra = await prisma.obra.findFirst({ where: scopedWhere(req, { id: obraId }) });
  if (!obra) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  if (responsableCalidadId != null) {
    const responsable = await prisma.usuario.findFirst({
      where: { id: Number(responsableCalidadId), empresaId: req.user.empresaId },
    });
    if (!responsable) {
      return res.status(404).json({ message: "Responsable de calidad no encontrado" });
    }
  }

  const subObra = await prisma.subObra.create({
    data: {
      obraId,
      nombre,
      descripcion,
      responsableCalidadId: responsableCalidadId != null ? Number(responsableCalidadId) : null,
    },
  });

  return res.status(201).json({ subObra });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  listSubObras,
  createSubObra,
};
