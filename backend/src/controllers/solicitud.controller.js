const prisma = require("../utils/prisma");
const { puedeGestionarSubObra } = require("./subObra.controller");

const TIPOS_VALIDOS = ["MATERIAL", "MAQUINARIA", "RECURSO", "ESPECIALISTA"];
const ESTADOS_VALIDOS = ["SOLICITADO", "APROBADO", "RECHAZADO", "RESUELTO"];

const SOLICITUD_INCLUDE = {
  subObra: { select: { id: true, nombre: true, obra: { select: { id: true, nombre: true } } } },
  materialCatalogo: true,
  creadoPor: { select: { id: true, name: true } },
  aprobadoPor: { select: { id: true, name: true } },
};

function scopedWhere(req, extra = {}) {
  return {
    ...extra,
    subObra: { obra: { localidad: { zona: { empresaId: req.user.empresaId } } } },
  };
}

async function list(req, res) {
  const { estado, tipo, subObraId } = req.query;

  const solicitudes = await prisma.solicitud.findMany({
    where: scopedWhere(req, {
      estado: estado || undefined,
      tipo: tipo || undefined,
      subObraId: subObraId ? Number(subObraId) : undefined,
    }),
    include: SOLICITUD_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return res.json({ solicitudes });
}

async function create(req, res) {
  const {
    subObraId,
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

  return res.status(201).json({ solicitud });
}

async function updateEstado(req, res) {
  const id = Number(req.params.id);
  const { estado } = req.body;

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: "estado invalido" });
  }

  const solicitud = await prisma.solicitud.findFirst({ where: scopedWhere(req, { id }) });
  if (!solicitud) {
    return res.status(404).json({ message: "Solicitud no encontrada" });
  }

  const actualizada = await prisma.solicitud.update({
    where: { id },
    data: { estado, aprobadoPorId: req.user.id },
    include: SOLICITUD_INCLUDE,
  });

  return res.json({ solicitud: actualizada });
}

module.exports = {
  list,
  create,
  updateEstado,
};
