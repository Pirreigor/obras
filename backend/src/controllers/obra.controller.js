const prisma = require("../utils/prisma");
const { porcentajeSubObra, porcentajeObra } = require("../utils/progreso");

const SUB_OBRA_INCLUDE = {
  responsableCalidad: { select: { id: true, name: true } },
  residentes: { include: { usuario: { select: { id: true, name: true } } } },
};

const ACTIVIDADES_PROGRESO_INCLUDE = {
  actividadesProgramadas: {
    select: { avances: { select: { porcentaje: true, fecha: true, createdAt: true } } },
  },
};

function conPorcentajeSubObra(subObra) {
  const { actividadesProgramadas, ...resto } = subObra;
  return { ...resto, porcentaje: porcentajeSubObra(subObra) };
}

function conPorcentajeObra(obra) {
  const { subObras, ...resto } = obra;
  const porcentaje = porcentajeObra({ subObras });
  if (!subObras) {
    return { ...resto, porcentaje };
  }
  return { ...resto, porcentaje, subObras: subObras.map(conPorcentajeSubObra) };
}

function scopedWhere(req, extra = {}) {
  return {
    ...extra,
    localidad: { zona: { empresaId: req.user.empresaId } },
  };
}

async function list(req, res) {
  const obras = await prisma.obra.findMany({
    where: scopedWhere(req),
    include: {
      localidad: { include: { zona: true } },
      residente: { select: { id: true, name: true } },
      subObras: { select: ACTIVIDADES_PROGRESO_INCLUDE },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    obras: obras.map(({ subObras, ...obra }) => ({ ...obra, porcentaje: porcentajeObra({ subObras }) })),
  });
}

async function getById(req, res) {
  const id = Number(req.params.id);

  const obra = await prisma.obra.findFirst({
    where: scopedWhere(req, { id }),
    include: {
      localidad: { include: { zona: true } },
      residente: { select: { id: true, name: true } },
      subObras: {
        include: { ...SUB_OBRA_INCLUDE, ...ACTIVIDADES_PROGRESO_INCLUDE },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!obra) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  return res.json({ obra: conPorcentajeObra(obra) });
}

async function create(req, res) {
  const { nombre, descripcion, cliente, direccion, presupuesto, fechaInicio, fechaFinEstimada, localidadId, residenteId } =
    req.body;

  if (!nombre || !localidadId) {
    return res.status(400).json({ message: "nombre y localidadId son obligatorios" });
  }

  const localidad = await prisma.localidad.findFirst({
    where: { id: Number(localidadId), zona: { empresaId: req.user.empresaId } },
  });
  if (!localidad) {
    return res.status(404).json({ message: "Localidad no encontrada" });
  }

  if (residenteId != null) {
    const residente = await prisma.usuario.findFirst({
      where: { id: Number(residenteId), empresaId: req.user.empresaId },
    });
    if (!residente) {
      return res.status(404).json({ message: "Residente no encontrado" });
    }
  }

  const obra = await prisma.obra.create({
    data: {
      nombre,
      descripcion,
      cliente,
      direccion,
      presupuesto: presupuesto != null ? Number(presupuesto) : null,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada) : null,
      localidadId: localidad.id,
      residenteId: residenteId != null ? Number(residenteId) : null,
    },
  });

  return res.status(201).json({ obra });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const { nombre, descripcion, cliente, direccion, estado, presupuesto, fechaInicio, fechaFinEstimada, localidadId, residenteId } =
    req.body;

  const existing = await prisma.obra.findFirst({ where: scopedWhere(req, { id }) });
  if (!existing) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  if (localidadId != null) {
    const localidad = await prisma.localidad.findFirst({
      where: { id: Number(localidadId), zona: { empresaId: req.user.empresaId } },
    });
    if (!localidad) {
      return res.status(404).json({ message: "Localidad no encontrada" });
    }
  }

  if (residenteId != null) {
    const residente = await prisma.usuario.findFirst({
      where: { id: Number(residenteId), empresaId: req.user.empresaId },
    });
    if (!residente) {
      return res.status(404).json({ message: "Residente no encontrado" });
    }
  }

  const obra = await prisma.obra.update({
    where: { id },
    data: {
      nombre,
      descripcion,
      cliente,
      direccion,
      estado,
      presupuesto: presupuesto != null ? Number(presupuesto) : undefined,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada) : undefined,
      localidadId: localidadId != null ? Number(localidadId) : undefined,
      residenteId: residenteId != null ? Number(residenteId) : undefined,
    },
  });

  return res.json({ obra });
}

async function remove(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.obra.findFirst({ where: scopedWhere(req, { id }) });
  if (!existing) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  await prisma.obra.delete({ where: { id } });

  return res.status(204).send();
}

async function listSubObras(req, res) {
  const obraId = Number(req.params.id);

  const obra = await prisma.obra.findFirst({ where: scopedWhere(req, { id: obraId }) });
  if (!obra) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  const subObras = await prisma.subObra.findMany({
    where: { obraId },
    include: { ...SUB_OBRA_INCLUDE, ...ACTIVIDADES_PROGRESO_INCLUDE },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ subObras: subObras.map(conPorcentajeSubObra) });
}

async function createSubObra(req, res) {
  const obraId = Number(req.params.id);
  const { nombre, descripcion, responsableCalidadId, residenteIds } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: "nombre es obligatorio" });
  }

  const obra = await prisma.obra.findFirst({ where: scopedWhere(req, { id: obraId }) });
  if (!obra) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  if (responsableCalidadId != null) {
    const responsable = await prisma.usuario.findFirst({
      where: { id: Number(responsableCalidadId), empresaId: req.user.empresaId },
    });
    if (!responsable) {
      return res.status(404).json({ message: "Responsable de calidad no encontrado" });
    }
  }

  let residentes = [];
  if (Array.isArray(residenteIds) && residenteIds.length > 0) {
    const ids = residenteIds.map(Number);
    residentes = await prisma.usuario.findMany({
      where: { id: { in: ids }, empresaId: req.user.empresaId, rol: "RESIDENTE" },
    });
    if (residentes.length !== new Set(ids).size) {
      return res
        .status(404)
        .json({ message: "Alguno de los residentes indicados no existe o no tiene rol RESIDENTE" });
    }
  }

  const subObra = await prisma.$transaction(async (tx) => {
    const nueva = await tx.subObra.create({
      data: {
        obraId,
        nombre,
        descripcion,
        responsableCalidadId: responsableCalidadId != null ? Number(responsableCalidadId) : null,
      },
    });

    if (residentes.length > 0) {
      await tx.subObraResidente.createMany({
        data: residentes.map((residente) => ({ subObraId: nueva.id, usuarioId: residente.id })),
      });
    }

    return tx.subObra.findUnique({ where: { id: nueva.id }, include: SUB_OBRA_INCLUDE });
  });

  return res.status(201).json({ subObra: { ...subObra, porcentaje: 0 } });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  listSubObras,
  createSubObra,
};
