const prisma = require("../utils/prisma");

async function list(req, res) {
  const catalogo = await prisma.actividadCatalogo.findMany({
    where: { empresaId: req.user.empresaId },
    orderBy: { nombre: "asc" },
  });

  return res.json({ catalogo });
}

async function create(req, res) {
  const { nombre, unidad } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: "nombre es obligatorio" });
  }

  const existente = await prisma.actividadCatalogo.findFirst({
    where: { empresaId: req.user.empresaId, nombre },
  });
  if (existente) {
    return res.status(409).json({ message: "Ya existe una actividad de catalogo con ese nombre" });
  }

  const actividad = await prisma.actividadCatalogo.create({
    data: { empresaId: req.user.empresaId, nombre, unidad: unidad || null },
  });

  return res.status(201).json({ actividad });
}

module.exports = {
  list,
  create,
};
