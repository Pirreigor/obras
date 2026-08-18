const prisma = require("../utils/prisma");

const SOLICITUD_INCLUDE = {
  subObra: { select: { id: true, nombre: true, obra: { select: { id: true, nombre: true } } } },
  materialCatalogo: true,
  actividadProgramada: { include: { actividadCatalogo: true } },
  creadoPor: { select: { id: true, name: true } },
  aprobadoPor: { select: { id: true, name: true } },
};

const PEDIDO_INCLUDE = {
  creadoPor: { select: { id: true, name: true } },
  solicitudes: { include: SOLICITUD_INCLUDE },
};

async function list(req, res) {
  const pedidos = await prisma.pedido.findMany({
    where: { empresaId: req.user.empresaId },
    include: PEDIDO_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return res.json({ pedidos });
}

async function create(req, res) {
  const { solicitudIds, factura, fechaEstimadaLlegada } = req.body;

  if (!Array.isArray(solicitudIds) || solicitudIds.length === 0) {
    return res.status(400).json({ message: "solicitudIds no puede estar vacio" });
  }

  const ids = solicitudIds.map(Number);
  const solicitudes = await prisma.solicitud.findMany({
    where: {
      id: { in: ids },
      estado: "SOLICITADO",
      subObra: { obra: { localidad: { zona: { empresaId: req.user.empresaId } } } },
    },
  });

  if (solicitudes.length !== ids.length) {
    return res.status(400).json({ message: "Alguna solicitud no existe o ya no esta en estado SOLICITADO" });
  }

  const pedido = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.pedido.create({
      data: {
        empresaId: req.user.empresaId,
        factura: factura || null,
        fechaEstimadaLlegada: fechaEstimadaLlegada ? new Date(fechaEstimadaLlegada) : null,
        creadoPorId: req.user.id,
      },
    });

    await tx.solicitud.updateMany({
      where: { id: { in: ids } },
      data: { estado: "APROBADO", pedidoId: nuevo.id, aprobadoPorId: req.user.id },
    });

    return tx.pedido.findUnique({ where: { id: nuevo.id }, include: PEDIDO_INCLUDE });
  });

  return res.status(201).json({ pedido });
}

async function marcarRecibido(req, res) {
  const id = Number(req.params.id);

  const pedido = await prisma.pedido.findFirst({ where: { id, empresaId: req.user.empresaId } });
  if (!pedido) {
    return res.status(404).json({ message: "Pedido no encontrado" });
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    await tx.pedido.update({ where: { id }, data: { fechaLlegadaReal: new Date() } });
    await tx.solicitud.updateMany({
      where: { pedidoId: id, estado: "APROBADO" },
      data: { estado: "RESUELTO" },
    });
    return tx.pedido.findUnique({ where: { id }, include: PEDIDO_INCLUDE });
  });

  return res.json({ pedido: actualizado });
}

module.exports = {
  list,
  create,
  marcarRecibido,
};
