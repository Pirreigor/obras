const prisma = require("../utils/prisma");

async function list(req, res) {
  const zonas = await prisma.zona.findMany({
    where: { empresaId: req.user.empresaId },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ zonas });
}

async function create(req, res) {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: "nombre es obligatorio" });
  }

  const zona = await prisma.zona.create({
    data: { nombre, empresaId: req.user.empresaId },
  });

  return res.status(201).json({ zona });
}

async function listLocalidades(req, res) {
  const zonaId = Number(req.params.id);

  const zona = await prisma.zona.findFirst({
    where: { id: zonaId, empresaId: req.user.empresaId },
  });
  if (!zona) {
    return res.status(404).json({ message: "Zona no encontrada" });
  }

  const localidades = await prisma.localidad.findMany({
    where: { zonaId },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ localidades });
}

async function createLocalidad(req, res) {
  const zonaId = Number(req.params.id);
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: "nombre es obligatorio" });
  }

  const zona = await prisma.zona.findFirst({
    where: { id: zonaId, empresaId: req.user.empresaId },
  });
  if (!zona) {
    return res.status(404).json({ message: "Zona no encontrada" });
  }

  const localidad = await prisma.localidad.create({
    data: { nombre, zonaId },
  });

  return res.status(201).json({ localidad });
}

module.exports = {
  list,
  create,
  listLocalidades,
  createLocalidad,
};
