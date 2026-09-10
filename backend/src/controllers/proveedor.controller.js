const prisma = require("../utils/prisma");

function scopedWhere(req, extra = {}) {
  return { ...extra, empresaId: req.user.empresaId };
}

async function list(req, res) {
  const proveedores = await prisma.proveedor.findMany({
    where: { empresaId: req.user.empresaId },
    orderBy: { nombre: "asc" },
  });

  return res.json({ proveedores });
}

async function create(req, res) {
  const { nombre, telefono, rubro } = req.body;

  if (!nombre || !telefono) {
    return res.status(400).json({ message: "nombre y telefono son obligatorios" });
  }

  const proveedor = await prisma.proveedor.create({
    data: { empresaId: req.user.empresaId, nombre, telefono, rubro: rubro || null },
  });

  return res.status(201).json({ proveedor });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const { nombre, telefono, rubro } = req.body;

  const existente = await prisma.proveedor.findFirst({ where: scopedWhere(req, { id }) });
  if (!existente) {
    return res.status(404).json({ message: "Proveedor no encontrado" });
  }

  const proveedor = await prisma.proveedor.update({
    where: { id },
    data: { nombre, telefono, rubro: rubro !== undefined ? rubro || null : undefined },
  });

  return res.json({ proveedor });
}

async function remove(req, res) {
  const id = Number(req.params.id);

  const existente = await prisma.proveedor.findFirst({ where: scopedWhere(req, { id }) });
  if (!existente) {
    return res.status(404).json({ message: "Proveedor no encontrado" });
  }

  await prisma.proveedor.delete({ where: { id } });

  return res.status(204).send();
}

module.exports = {
  list,
  create,
  update,
  remove,
};
