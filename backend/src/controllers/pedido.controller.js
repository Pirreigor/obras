const prisma = require("../utils/prisma");
const { puedeAprobarObra } = require("./subObra.controller");

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

// Igual criterio que en las solicitudes: Administrador/Supervisor
// aprueban cualquier cosa; un residente solo si es el residente lider
// (Obra.residenteId) de TODAS las obras involucradas en el lote.
async function puedeAprobarTodas(user, solicitudes) {
  if (user.rol === "ADMINISTRADOR" || user.rol === "SUPERVISOR") {
    return true;
  }
  const subObraIds = [...new Set(solicitudes.map((s) => s.subObraId))];
  const subObras = await prisma.subObra.findMany({
    where: { id: { in: subObraIds } },
    include: { obra: true },
  });
  return subObras.every((subObra) => puedeAprobarObra(user, subObra.obra));
}

// Administrador y Supervisor ven todos los pedidos de la empresa. El
// resto solo los que contienen alguna solicitud propia (creada por el,
// de una sub-obra suya, o de una obra que lidera).
function alcancePorRol(user) {
  if (user.rol === "ADMINISTRADOR" || user.rol === "SUPERVISOR") {
    return { empresaId: user.empresaId };
  }
  return {
    empresaId: user.empresaId,
    solicitudes: {
      some: {
        OR: [
          { creadoPorId: user.id },
          { subObra: { responsableCalidadId: user.id } },
          { subObra: { residentes: { some: { usuarioId: user.id } } } },
          { subObra: { obra: { residenteId: user.id } } },
        ],
      },
    },
  };
}

async function list(req, res) {
  const pedidos = await prisma.pedido.findMany({
    where: alcancePorRol(req.user),
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

  if (!(await puedeAprobarTodas(req.user, solicitudes))) {
    return res.status(403).json({ message: "No tenes permiso para aprobar alguna de estas solicitudes" });
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

  const pedido = await prisma.pedido.findFirst({
    where: { id, empresaId: req.user.empresaId },
    include: { solicitudes: true },
  });
  if (!pedido) {
    return res.status(404).json({ message: "Pedido no encontrado" });
  }

  if (!(await puedeAprobarTodas(req.user, pedido.solicitudes))) {
    return res.status(403).json({ message: "No tenes permiso para marcar este pedido como recibido" });
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
