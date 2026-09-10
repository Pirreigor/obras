const prisma = require("../utils/prisma");
const { porcentajeSubObra, porcentajeObra } = require("../utils/progreso");
const { puedeAprobarObra } = require("./subObra.controller");

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

// Ver el detalle de una obra puntual (o sus sub-obras) no depende solo
// del rol: Administrador/Supervisor siempre, quien tenga la vista
// "obras" asignada tambien, y el residente lider de esa obra puntual
// aunque no tenga la vista (para poder gestionar sus propias sub-obras).
async function puedeVerObra(user, obra) {
  if (user.rol === "ADMINISTRADOR" || user.rol === "SUPERVISOR") {
    return true;
  }
  if (obra?.residenteId === user.id) {
    return true;
  }
  const asignada = await prisma.usuarioVista.findFirst({
    where: { usuarioId: user.id, vista: { clave: "obras" } },
  });
  return Boolean(asignada);
}

// Las obras que este usuario lidera (Obra.residenteId), sin necesitar
// la vista "obras": le alcanza para crear/gestionar sus sub-obras.
async function listMias(req, res) {
  const obras = await prisma.obra.findMany({
    where: scopedWhere(req, { residenteId: req.user.id, activa: true }),
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

// Listado liviano (solo id/nombre/rol) para los selectores de residente
// lider, responsable de calidad y equipo asignado. No exige la vista
// "equipo": un residente lider sin esa vista igual necesita elegir a
// quien asignar en sus propias sub-obras.
async function listUsuariosDisponibles(req, res) {
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: req.user.empresaId },
    select: { id: true, name: true, rol: true },
    orderBy: { name: "asc" },
  });
  return res.json({ usuarios });
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

  if (!obra || !(await puedeVerObra(req.user, obra))) {
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
  const {
    nombre,
    descripcion,
    cliente,
    direccion,
    estado,
    activa,
    presupuesto,
    fechaInicio,
    fechaFinEstimada,
    localidadId,
    residenteId,
  } = req.body;

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

  if (residenteId) {
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
      activa: typeof activa === "boolean" ? activa : undefined,
      presupuesto: presupuesto != null ? Number(presupuesto) : undefined,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada) : undefined,
      localidadId: localidadId != null ? Number(localidadId) : undefined,
      // undefined = no tocar el campo (no vino en el body); null o "" =
      // sacar el residente lider asignado; un id = asignarlo.
      residenteId: residenteId !== undefined ? (residenteId ? Number(residenteId) : null) : undefined,
    },
  });

  return res.json({ obra });
}

// Eliminar borra en cascada sus sub-obras, actividades, avances,
// solicitudes y pedidos asociados (definido asi en el schema). No se
// bloquea aunque tenga progreso: el frontend ya avisa con un modal de
// advertencia antes de llamar a este endpoint; si se quiere conservar
// el historial, la alternativa es desactivarla en vez de eliminarla.
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
  if (!obra || !(await puedeVerObra(req.user, obra))) {
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
  const { nombre, descripcion, responsableCalidadId, residenteIds, numeroPartida, archivoPartidaUrl } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: "nombre es obligatorio" });
  }

  const obra = await prisma.obra.findFirst({ where: scopedWhere(req, { id: obraId }) });
  if (!obra) {
    return res.status(404).json({ message: "Obra no encontrada" });
  }

  // Ademas de Administrador/Supervisor, el residente lider de esta obra
  // puntual tambien puede crear sub-obras dentro de ella.
  if (!puedeAprobarObra(req.user, obra)) {
    return res.status(403).json({ message: "No tenes permiso para crear sub-obras en esta obra" });
  }

  if (responsableCalidadId != null) {
    const responsable = await prisma.usuario.findFirst({
      where: { id: Number(responsableCalidadId), empresaId: req.user.empresaId },
    });
    if (!responsable) {
      return res.status(404).json({ message: "Responsable de calidad no encontrado" });
    }
  }

  // No se restringe por rol: ademas de Residentes, un Supervisor o
  // Calidad/Produccion tambien puede formar parte del equipo asignado
  // a una sub-obra puntual.
  let residentes = [];
  if (Array.isArray(residenteIds) && residenteIds.length > 0) {
    const ids = residenteIds.map(Number);
    residentes = await prisma.usuario.findMany({
      where: { id: { in: ids }, empresaId: req.user.empresaId },
    });
    if (residentes.length !== new Set(ids).size) {
      return res.status(404).json({ message: "Alguno de los usuarios indicados no existe" });
    }
  }

  const subObra = await prisma.$transaction(async (tx) => {
    const nueva = await tx.subObra.create({
      data: {
        obraId,
        nombre,
        descripcion,
        responsableCalidadId: responsableCalidadId != null ? Number(responsableCalidadId) : null,
        numeroPartida: numeroPartida || null,
        archivoPartidaUrl: archivoPartidaUrl || null,
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
  listMias,
  listUsuariosDisponibles,
  getById,
  create,
  update,
  remove,
  listSubObras,
  createSubObra,
};
