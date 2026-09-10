const prisma = require("../utils/prisma");
const { puedeGestionarSubObra, puedeAprobarObra } = require("./subObra.controller");

const TIPOS_VALIDOS = ["MATERIAL", "MAQUINARIA", "RECURSO", "ESPECIALISTA"];
// APROBADO y RESUELTO solo se llegan a traves de un Pedido (agrupar con
// factura/fecha estimada, y marcarlo recibido); esta ruta solo permite
// rechazar o reabrir una solicitud.
const ESTADOS_VALIDOS_DIRECTOS = ["SOLICITADO", "RECHAZADO"];

const SOLICITUD_INCLUDE = {
  subObra: { select: { id: true, nombre: true, obra: { select: { id: true, nombre: true } } } },
  materialCatalogo: true,
  actividadProgramada: { include: { actividadCatalogo: true } },
  creadoPor: { select: { id: true, name: true } },
  aprobadoPor: { select: { id: true, name: true } },
  pedido: true,
  recepciones: {
    include: { registradoPor: { select: { id: true, name: true } } },
    orderBy: { fecha: "desc" },
  },
};

// Cuanto llego en total (suma de las entregas parciales registradas).
function conCantidadRecibida(solicitud) {
  const cantidadRecibida = (solicitud.recepciones || []).reduce((sum, r) => sum + (r.cantidad || 0), 0);
  return { ...solicitud, cantidadRecibida };
}

// Quien puede registrar que llego una entrega: Administrador/Supervisor,
// el Almacenero, o el mismo usuario que hizo la solicitud (el "ingeniero
// a cargo").
function puedeRegistrarRecepcion(user, solicitud) {
  if (user.rol === "ADMINISTRADOR" || user.rol === "SUPERVISOR" || user.rol === "ALMACENERO") {
    return true;
  }
  return solicitud.creadoPorId === user.id;
}

function scopedWhere(req, extra = {}) {
  return {
    ...extra,
    subObra: { obra: { localidad: { zona: { empresaId: req.user.empresaId } } } },
  };
}

// Administrador y Supervisor ven todas las solicitudes de la empresa.
// El resto solo las suyas: las que creo, las de una sub-obra donde esta
// asignado, o las de una obra que lidera como residente.
function alcancePorRol(user) {
  if (user.rol === "ADMINISTRADOR" || user.rol === "SUPERVISOR") {
    return {};
  }
  return {
    OR: [
      { creadoPorId: user.id },
      { subObra: { responsableCalidadId: user.id } },
      { subObra: { residentes: { some: { usuarioId: user.id } } } },
      { subObra: { obra: { residenteId: user.id } } },
    ],
  };
}

async function list(req, res) {
  const { estado, tipo, subObraId } = req.query;

  const solicitudes = await prisma.solicitud.findMany({
    where: scopedWhere(req, {
      ...alcancePorRol(req.user),
      estado: estado || undefined,
      tipo: tipo || undefined,
      subObraId: subObraId ? Number(subObraId) : undefined,
    }),
    include: SOLICITUD_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return res.json({ solicitudes: solicitudes.map(conCantidadRecibida) });
}

async function create(req, res) {
  const {
    subObraId,
    actividadProgramadaId,
    tipo,
    materialCatalogoId,
    materialCatalogoNombre,
    unidadMedida,
    cantidad,
    descripcion,
    fechaNecesaria,
    urgente,
  } = req.body;

  if (!subObraId || !tipo) {
    return res.status(400).json({ message: "subObraId y tipo son obligatorios" });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ message: "tipo invalido" });
  }

  const subObra = await prisma.subObra.findFirst({
    where: { id: Number(subObraId), obra: { localidad: { zona: { empresaId: req.user.empresaId } } } },
    include: { residentes: true },
  });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  if (!puedeGestionarSubObra(req.user, subObra)) {
    return res.status(403).json({ message: "No tenes permiso para solicitar en esta sub-obra" });
  }

  let actividadId = null;
  if (actividadProgramadaId != null) {
    const actividad = await prisma.actividadProgramada.findFirst({
      where: { id: Number(actividadProgramadaId), subObraId: subObra.id },
    });
    if (!actividad) {
      return res.status(404).json({ message: "Actividad no encontrada en esta sub-obra" });
    }
    actividadId = actividad.id;
  }

  let catalogoId = null;

  if (tipo === "MATERIAL") {
    if (cantidad == null) {
      return res.status(400).json({ message: "cantidad es obligatoria para material" });
    }
    catalogoId = materialCatalogoId != null ? Number(materialCatalogoId) : null;
    if (catalogoId) {
      const catalogo = await prisma.materialCatalogo.findFirst({
        where: { id: catalogoId, empresaId: req.user.empresaId },
      });
      if (!catalogo) {
        return res.status(404).json({ message: "Material de catalogo no encontrado" });
      }
    } else {
      if (!materialCatalogoNombre || !materialCatalogoNombre.trim() || !unidadMedida) {
        return res
          .status(400)
          .json({ message: "Falta materialCatalogoId o materialCatalogoNombre + unidadMedida" });
      }
      const nombre = materialCatalogoNombre.trim();
      const existente = await prisma.materialCatalogo.findFirst({
        where: { empresaId: req.user.empresaId, nombre },
      });
      catalogoId = existente
        ? existente.id
        : (
            await prisma.materialCatalogo.create({
              data: { empresaId: req.user.empresaId, nombre, unidadMedida },
            })
          ).id;
    }
  } else if (!descripcion || !descripcion.trim()) {
    return res.status(400).json({ message: "descripcion es obligatoria" });
  }

  const solicitud = await prisma.solicitud.create({
    data: {
      subObraId: subObra.id,
      actividadProgramadaId: actividadId,
      tipo,
      materialCatalogoId: catalogoId,
      cantidad: tipo === "MATERIAL" ? Number(cantidad) : null,
      descripcion: descripcion || null,
      fechaNecesaria: fechaNecesaria ? new Date(fechaNecesaria) : null,
      urgente: Boolean(urgente),
      creadoPorId: req.user.id,
    },
    include: SOLICITUD_INCLUDE,
  });

  return res.status(201).json({ solicitud: conCantidadRecibida(solicitud) });
}

async function updateEstado(req, res) {
  const id = Number(req.params.id);
  const { estado } = req.body;

  if (!ESTADOS_VALIDOS_DIRECTOS.includes(estado)) {
    return res.status(400).json({ message: "estado invalido" });
  }

  const solicitud = await prisma.solicitud.findFirst({
    where: scopedWhere(req, { id }),
    include: { subObra: { include: { obra: true } } },
  });
  if (!solicitud) {
    return res.status(404).json({ message: "Solicitud no encontrada" });
  }

  if (!puedeAprobarObra(req.user, solicitud.subObra.obra)) {
    return res.status(403).json({ message: "No tenes permiso para cambiar el estado de esta solicitud" });
  }

  const actualizada = await prisma.solicitud.update({
    where: { id },
    data: { estado, aprobadoPorId: req.user.id },
    include: SOLICITUD_INCLUDE,
  });

  return res.json({ solicitud: conCantidadRecibida(actualizada) });
}

// Registra una entrega parcial de una solicitud ya aprobada (agrupada
// en un Pedido). Si es MATERIAL y la suma de lo recibido llega a la
// cantidad pedida, la solicitud pasa sola a RESUELTO.
async function crearRecepcion(req, res) {
  const id = Number(req.params.id);
  const { cantidad, comentario } = req.body;

  const solicitud = await prisma.solicitud.findFirst({ where: scopedWhere(req, { id }) });
  if (!solicitud) {
    return res.status(404).json({ message: "Solicitud no encontrada" });
  }

  if (solicitud.estado !== "APROBADO") {
    return res.status(400).json({ message: "Solo se puede registrar la llegada de solicitudes APROBADAS" });
  }

  if (!puedeRegistrarRecepcion(req.user, solicitud)) {
    return res.status(403).json({ message: "No tenes permiso para registrar la llegada de esta solicitud" });
  }

  const [, solicitudActualizada] = await prisma.$transaction(async (tx) => {
    const recepcion = await tx.recepcionMaterial.create({
      data: {
        solicitudId: id,
        cantidad: cantidad != null && cantidad !== "" ? Number(cantidad) : null,
        comentario: comentario || null,
        registradoPorId: req.user.id,
      },
    });

    if (solicitud.tipo === "MATERIAL" && solicitud.cantidad != null) {
      const previas = await tx.recepcionMaterial.findMany({ where: { solicitudId: id }, select: { cantidad: true } });
      const totalRecibido = previas.reduce((sum, r) => sum + (r.cantidad || 0), 0);
      if (totalRecibido >= solicitud.cantidad) {
        await tx.solicitud.update({ where: { id }, data: { estado: "RESUELTO" } });
      }
    }

    const actualizada = await tx.solicitud.findUnique({ where: { id }, include: SOLICITUD_INCLUDE });
    return [recepcion, actualizada];
  });

  return res.status(201).json({ solicitud: conCantidadRecibida(solicitudActualizada) });
}

module.exports = {
  list,
  create,
  updateEstado,
  crearRecepcion,
  conCantidadRecibida,
  SOLICITUD_INCLUDE,
};
