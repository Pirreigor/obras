const prisma = require("../utils/prisma");

async function list(req, res) {
  const catalogo = await prisma.materialCatalogo.findMany({
    where: { empresaId: req.user.empresaId },
    orderBy: { nombre: "asc" },
  });

  return res.json({ catalogo });
}

async function create(req, res) {
  const { nombre, unidadMedida } = req.body;

  if (!nombre || !unidadMedida) {
    return res.status(400).json({ message: "nombre y unidadMedida son obligatorios" });
  }

  const existente = await prisma.materialCatalogo.findFirst({
    where: { empresaId: req.user.empresaId, nombre },
  });
  if (existente) {
    return res.status(409).json({ message: "Ya existe un material de catalogo con ese nombre" });
  }

  const material = await prisma.materialCatalogo.create({
    data: { empresaId: req.user.empresaId, nombre, unidadMedida },
  });

  return res.status(201).json({ material });
}

module.exports = {
  list,
  create,
};
