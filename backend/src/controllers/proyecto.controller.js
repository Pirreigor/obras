const prisma = require("../utils/prisma");

async function list(req, res) {
  const proyectos = await prisma.proyecto.findMany({
    include: { responsable: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ proyectos });
}

async function getById(req, res) {
  const id = Number(req.params.id);

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      responsable: { select: { id: true, name: true } },
      avances: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!proyecto) {
    return res.status(404).json({ message: "Proyecto no encontrado" });
  }

  return res.json({ proyecto });
}

async function create(req, res) {
  const { nombre, descripcion, cliente, ubicacion, presupuesto, fechaInicio, fechaFinEstimada, responsableId } =
    req.body;

  if (!nombre) {
    return res.status(400).json({ message: "nombre es obligatorio" });
  }

  const proyecto = await prisma.proyecto.create({
    data: {
      nombre,
      descripcion,
      cliente,
      ubicacion,
      presupuesto: presupuesto != null ? Number(presupuesto) : null,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada) : null,
      responsableId: responsableId != null ? Number(responsableId) : null,
    },
  });

  return res.status(201).json({ proyecto });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const { nombre, descripcion, cliente, ubicacion, estado, presupuesto, fechaInicio, fechaFinEstimada, responsableId } =
    req.body;

  const existing = await prisma.proyecto.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Proyecto no encontrado" });
  }

  const proyecto = await prisma.proyecto.update({
    where: { id },
    data: {
      nombre,
      descripcion,
      cliente,
      ubicacion,
      estado,
      presupuesto: presupuesto != null ? Number(presupuesto) : undefined,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada) : undefined,
      responsableId: responsableId != null ? Number(responsableId) : undefined,
    },
  });

  return res.json({ proyecto });
}

async function remove(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.proyecto.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Proyecto no encontrado" });
  }

  await prisma.proyecto.delete({ where: { id } });

  return res.status(204).send();
}

async function listAvances(req, res) {
  const proyectoId = Number(req.params.id);

  const avances = await prisma.avance.findMany({
    where: { proyectoId },
    include: { creadoPor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ avances });
}

async function createAvance(req, res) {
  const proyectoId = Number(req.params.id);
  const { titulo, descripcion, porcentaje, imagenes } = req.body;

  if (!titulo) {
    return res.status(400).json({ message: "titulo es obligatorio" });
  }

  const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId } });
  if (!proyecto) {
    return res.status(404).json({ message: "Proyecto no encontrado" });
  }

  const avance = await prisma.avance.create({
    data: {
      proyectoId,
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
  list,
  getById,
  create,
  update,
  remove,
  listAvances,
  createAvance,
};
