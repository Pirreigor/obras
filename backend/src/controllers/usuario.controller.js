const prisma = require("../utils/prisma");

const ROLES_EMPRESA = ["ADMINISTRADOR", "SUPERVISOR", "RESIDENTE", "CALIDAD_PRODUCCION"];

async function list(req, res) {
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: req.user.empresaId },
    select: { id: true, name: true, email: true, rol: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ usuarios });
}

async function getVistas(req, res) {
  const usuarioId = Number(req.params.id);

  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, empresaId: req.user.empresaId },
  });
  if (!usuario) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const asignadas = await prisma.usuarioVista.findMany({
    where: { usuarioId },
    include: { vista: true },
  });

  return res.json({ vistas: asignadas.map((a) => a.vista) });
}

async function setVistas(req, res) {
  const usuarioId = Number(req.params.id);
  const { vistaIds } = req.body;

  if (!Array.isArray(vistaIds)) {
    return res.status(400).json({ message: "vistaIds debe ser un arreglo" });
  }

  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, empresaId: req.user.empresaId },
  });
  if (!usuario) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const ids = vistaIds.map(Number);

  await prisma.$transaction([
    prisma.usuarioVista.deleteMany({ where: { usuarioId } }),
    prisma.usuarioVista.createMany({
      data: ids.map((vistaId) => ({ usuarioId, vistaId })),
      skipDuplicates: true,
    }),
  ]);

  const asignadas = await prisma.usuarioVista.findMany({
    where: { usuarioId },
    include: { vista: true },
  });

  return res.json({ vistas: asignadas.map((a) => a.vista) });
}

async function updateRol(req, res) {
  const usuarioId = Number(req.params.id);
  const { rol } = req.body;

  if (!ROLES_EMPRESA.includes(rol)) {
    return res.status(400).json({ message: "rol invalido" });
  }

  if (usuarioId === req.user.id) {
    return res.status(400).json({ message: "No podes cambiar tu propio cargo" });
  }

  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, empresaId: req.user.empresaId },
  });
  if (!usuario) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const actualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { rol },
    select: { id: true, name: true, email: true, rol: true, createdAt: true },
  });

  return res.json({ usuario: actualizado });
}

module.exports = {
  list,
  getVistas,
  setVistas,
  updateRol,
};
