const prisma = require("../utils/prisma");
const { porcentajeSubObra } = require("../utils/progreso");

// Los inputs datetime-local llegan sin zona horaria ("2026-08-17T08:00").
// Se interpretan como UTC literal (se agrega "Z") para que la hora
// guardada sea exactamente la tipeada, sin importar la zona del servidor.
function parseFechaHora(value) {
  if (!value) return null;
  return new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
}

const PROGRESO_INCLUDE = {
  actividadesProgramadas: {
    select: { avances: { select: { porcentaje: true, fecha: true, createdAt: true } } },
  },
};

function conPorcentaje(subObra) {
  const { actividadesProgramadas, ...resto } = subObra;
  return { ...resto, porcentaje: porcentajeSubObra(subObra) };
}

function scopedWhere(req, extra = {}) {
  return {
    ...extra,
    obra: { localidad: { zona: { empresaId: req.user.empresaId } } },
  };
}

// Administrador y Supervisor gestionan cualquier sub-obra de su empresa;
// Residente/Calidad-Produccion solo la(s) sub-obra(s) donde estan asignados.
function puedeGestionarSubObra(user, subObra) {
  if (user.rol === "ADMINISTRADOR" || user.rol === "SUPERVISOR") {
    return true;
  }
  if (subObra.responsableCalidadId === user.id) {
    return true;
  }
  return subObra.residentes?.some((r) => r.usuarioId === user.id) ?? false;
}

// Aprobar/rechazar/agrupar pedidos: Administrador y Supervisor siempre;
// el "residente de residentes" (residente lider de la obra completa,
// Obra.residenteId) tambien, para las obras que tiene a cargo.
function puedeAprobarObra(user, obra) {
  if (user.rol === "ADMINISTRADOR" || user.rol === "SUPERVISOR") {
    return true;
  }
  return user.rol === "RESIDENTE" && obra?.residenteId === user.id;
}

async function listMias(req, res) {
  const subObras = await prisma.subObra.findMany({
    where: {
      obra: { localidad: { zona: { empresaId: req.user.empresaId } } },
      OR: [{ responsableCalidadId: req.user.id }, { residentes: { some: { usuarioId: req.user.id } } }],
    },
    include: {
      obra: { select: { id: true, nombre: true } },
      responsableCalidad: { select: { id: true, name: true } },
      residentes: { include: { usuario: { select: { id: true, name: true } } } },
      ...PROGRESO_INCLUDE,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ subObras: subObras.map(conPorcentaje) });
}

async function getById(req, res) {
  const id = Number(req.params.id);

  const subObra = await prisma.subObra.findFirst({
    where: scopedWhere(req, { id }),
    include: {
      obra: { select: { id: true, nombre: true } },
      responsableCalidad: { select: { id: true, name: true } },
      residentes: { include: { usuario: { select: { id: true, name: true } } } },
      actividadesProgramadas: {
        include: { actividadCatalogo: true, avances: { select: { porcentaje: true, fecha: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      },
      avances: { orderBy: { fecha: "desc" } },
    },
  });

  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  return res.json({ subObra: conPorcentaje(subObra) });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const { nombre, descripcion, estado, responsableCalidadId } = req.body;

  const existing = await prisma.subObra.findFirst({ where: scopedWhere(req, { id }) });
  if (!existing) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  if (responsableCalidadId != null) {
    const responsable = await prisma.usuario.findFirst({
      where: { id: Number(responsableCalidadId), empresaId: req.user.empresaId },
    });
    if (!responsable) {
      return res.status(404).json({ message: "Responsable de calidad no encontrado" });
    }
  }

  const subObra = await prisma.subObra.update({
    where: { id },
    data: {
      nombre,
      descripcion,
      estado,
      responsableCalidadId: responsableCalidadId != null ? Number(responsableCalidadId) : undefined,
    },
  });

  return res.json({ subObra });
}

async function remove(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.subObra.findFirst({ where: scopedWhere(req, { id }) });
  if (!existing) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  await prisma.subObra.delete({ where: { id } });

  return res.status(204).send();
}

async function listActividades(req, res) {
  const subObraId = Number(req.params.id);

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  const actividades = await prisma.actividadProgramada.findMany({
    where: { subObraId },
    include: { actividadCatalogo: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ actividades });
}

async function createActividad(req, res) {
  const subObraId = Number(req.params.id);
  const { actividadCatalogoId, actividadCatalogoNombre, fechaInicioPlan, fechaFinPlan } = req.body;

  const subObra = await prisma.subObra.findFirst({
    where: scopedWhere(req, { id: subObraId }),
    include: { residentes: true },
  });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  if (!puedeGestionarSubObra(req.user, subObra)) {
    return res.status(403).json({ message: "No tenes permiso para agregar actividades en esta sub-obra" });
  }

  let catalogoId = actividadCatalogoId != null ? Number(actividadCatalogoId) : null;

  if (catalogoId) {
    const catalogo = await prisma.actividadCatalogo.findFirst({
      where: { id: catalogoId, empresaId: req.user.empresaId },
    });
    if (!catalogo) {
      return res.status(404).json({ message: "Actividad de catalogo no encontrada" });
    }
  } else {
    if (!actividadCatalogoNombre || !actividadCatalogoNombre.trim()) {
      return res.status(400).json({ message: "Falta actividadCatalogoId o actividadCatalogoNombre" });
    }
    const nombre = actividadCatalogoNombre.trim();
    const existente = await prisma.actividadCatalogo.findFirst({
      where: { empresaId: req.user.empresaId, nombre },
    });
    catalogoId = existente
      ? existente.id
      : (await prisma.actividadCatalogo.create({ data: { empresaId: req.user.empresaId, nombre } })).id;
  }

  const actividad = await prisma.actividadProgramada.create({
    data: {
      subObraId,
      actividadCatalogoId: catalogoId,
      fechaInicioPlan: parseFechaHora(fechaInicioPlan),
      fechaFinPlan: parseFechaHora(fechaFinPlan),
    },
    include: { actividadCatalogo: true },
  });

  return res.status(201).json({ actividad });
}

const ESTADOS_VALIDOS = ["PENDIENTE", "EN_CURSO", "HECHA"];

async function updateActividad(req, res) {
  const subObraId = Number(req.params.id);
  const actividadId = Number(req.params.actividadId);
  const { urgente, estado, fechaInicioPlan, fechaFinPlan } = req.body;

  const subObra = await prisma.subObra.findFirst({
    where: scopedWhere(req, { id: subObraId }),
    include: { residentes: true },
  });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  if (!puedeGestionarSubObra(req.user, subObra)) {
    return res.status(403).json({ message: "No tenes permiso para modificar esta actividad" });
  }

  const actividad = await prisma.actividadProgramada.findFirst({ where: { id: actividadId, subObraId } });
  if (!actividad) {
    return res.status(404).json({ message: "Actividad no encontrada" });
  }

  if (estado != null && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: "Estado invalido" });
  }

  const data = {
    urgente: typeof urgente === "boolean" ? urgente : undefined,
    fechaInicioPlan: fechaInicioPlan ? parseFechaHora(fechaInicioPlan) : undefined,
    fechaFinPlan: fechaFinPlan ? parseFechaHora(fechaFinPlan) : undefined,
  };

  if (estado != null) {
    data.estado = estado;
    // La hora de cierre real queda registrada la primera vez que la
    // actividad pasa a HECHA; si se reabre, se limpia.
    data.fechaCierreReal = estado === "HECHA" ? actividad.fechaCierreReal || new Date() : null;
  }

  const actualizada = await prisma.actividadProgramada.update({
    where: { id: actividadId },
    data,
    include: { actividadCatalogo: true },
  });

  return res.json({ actividad: actualizada });
}

// Cantidad de dias que dura la actividad segun su plan (inclusive). Si
// solo tiene una de las dos fechas, o ninguna, se toma como 1 dia.
function contarDiasProgramados(actividad) {
  const inicio = actividad.fechaInicioPlan ? actividad.fechaInicioPlan.toISOString().slice(0, 10) : null;
  const fin = actividad.fechaFinPlan ? actividad.fechaFinPlan.toISOString().slice(0, 10) : null;
  if (!inicio || !fin) {
    return 1;
  }
  const dias = Math.round((new Date(`${fin}T00:00:00Z`) - new Date(`${inicio}T00:00:00Z`)) / 86400000) + 1;
  return Math.max(1, dias);
}

// Marcar un dia de la actividad como hecho: registra el avance de ese
// dia puntual (con evidencia opcional) repartiendo el 100% entre la
// cantidad de dias que dura la actividad. Cuando ya se marcaron todos
// sus dias, la actividad completa pasa a HECHA con la hora real de
// cierre de ese ultimo dia.
async function cerrarActividad(req, res) {
  const subObraId = Number(req.params.id);
  const actividadId = Number(req.params.actividadId);
  const { fecha, descripcion, imagenUrl } = req.body;

  if (!fecha) {
    return res.status(400).json({ message: "fecha es obligatoria" });
  }

  const subObra = await prisma.subObra.findFirst({
    where: scopedWhere(req, { id: subObraId }),
    include: { residentes: true },
  });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  if (!puedeGestionarSubObra(req.user, subObra)) {
    return res.status(403).json({ message: "No tenes permiso para cerrar esta actividad" });
  }

  const actividad = await prisma.actividadProgramada.findFirst({
    where: { id: actividadId, subObraId },
    include: { avances: { select: { fecha: true } } },
  });
  if (!actividad) {
    return res.status(404).json({ message: "Actividad no encontrada" });
  }

  const totalDias = contarDiasProgramados(actividad);
  const diasMarcados = new Set(actividad.avances.map((a) => a.fecha.toISOString().slice(0, 10)));
  diasMarcados.add(fecha);
  const completa = diasMarcados.size >= totalDias;
  const porcentaje = Math.min(100, Math.round((diasMarcados.size / totalDias) * 100));
  const fechaCierre = completa ? new Date(`${fecha}T${new Date().toISOString().slice(11, 19)}Z`) : null;

  const [avance, actividadActualizada] = await prisma.$transaction([
    prisma.avance.create({
      data: {
        subObraId,
        actividadProgramadaId: actividadId,
        fecha: new Date(fecha),
        porcentaje,
        descripcion: descripcion || null,
        imagenes: imagenUrl ? [imagenUrl] : [],
        creadoPorId: req.user.id,
      },
      include: { creadoPor: { select: { id: true, name: true } } },
    }),
    prisma.actividadProgramada.update({
      where: { id: actividadId },
      data: completa ? { estado: "HECHA", fechaCierreReal: fechaCierre } : { estado: "EN_CURSO" },
      include: { actividadCatalogo: true },
    }),
  ]);

  return res.status(201).json({ avance, actividad: actividadActualizada });
}

async function listAvances(req, res) {
  const subObraId = Number(req.params.id);

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  const avances = await prisma.avance.findMany({
    where: { subObraId },
    include: { creadoPor: { select: { id: true, name: true } }, actividadProgramada: { include: { actividadCatalogo: true } } },
    orderBy: { fecha: "desc" },
  });

  return res.json({ avances });
}

async function createAvance(req, res) {
  const subObraId = Number(req.params.id);
  const { titulo, descripcion, porcentaje, imagenes, actividadProgramadaId, fecha } = req.body;

  if (!fecha) {
    return res.status(400).json({ message: "fecha es obligatoria" });
  }

  const subObra = await prisma.subObra.findFirst({ where: scopedWhere(req, { id: subObraId }) });
  if (!subObra) {
    return res.status(404).json({ message: "Sub-obra no encontrada" });
  }

  if (actividadProgramadaId != null) {
    const actividad = await prisma.actividadProgramada.findFirst({
      where: { id: Number(actividadProgramadaId), subObraId },
    });
    if (!actividad) {
      return res.status(404).json({ message: "Actividad programada no encontrada en esta sub-obra" });
    }
  }

  const avance = await prisma.avance.create({
    data: {
      subObraId,
      actividadProgramadaId: actividadProgramadaId != null ? Number(actividadProgramadaId) : null,
      fecha: new Date(fecha),
      titulo: titulo || null,
      descripcion,
      porcentaje: porcentaje != null ? Number(porcentaje) : 0,
      imagenes: Array.isArray(imagenes) ? imagenes : [],
      creadoPorId: req.user.id,
    },
    include: { creadoPor: { select: { id: true, name: true } } },
  });

  return res.status(201).json({ avance });
}

module.exports = {
  listMias,
  getById,
  update,
  remove,
  listActividades,
  createActividad,
  updateActividad,
  cerrarActividad,
  listAvances,
  createAvance,
  puedeGestionarSubObra,
  puedeAprobarObra,
};
