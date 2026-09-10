const ExcelJS = require("exceljs");
const prisma = require("../utils/prisma");

const OBRERO_INCLUDE = {
  localidad: { include: { zona: true } },
};

function scopedWhere(req, extra = {}) {
  return {
    ...extra,
    localidad: { zona: { empresaId: req.user.empresaId } },
  };
}

async function list(req, res) {
  const obreros = await prisma.obrero.findMany({
    where: { localidad: { zona: { empresaId: req.user.empresaId } } },
    include: OBRERO_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return res.json({ obreros });
}

async function exportarObreros(req, res) {
  const obreros = await prisma.obrero.findMany({
    where: { localidad: { zona: { empresaId: req.user.empresaId } } },
    include: OBRERO_INCLUDE,
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Obreros");
  sheet.columns = [
    { header: "Nombre", key: "nombre", width: 20 },
    { header: "Apellido", key: "apellido", width: 20 },
    { header: "Especialidad", key: "especialidad", width: 22 },
    { header: "Sueldo semanal", key: "sueldoSemanal", width: 16 },
    { header: "Zona", key: "zona", width: 16 },
    { header: "Localidad", key: "localidad", width: 18 },
    { header: "DNI", key: "dni", width: 45 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const obrero of obreros) {
    sheet.addRow({
      nombre: obrero.nombre,
      apellido: obrero.apellido,
      especialidad: obrero.especialidad,
      sueldoSemanal: obrero.sueldoSemanal,
      zona: obrero.localidad?.zona?.nombre || "",
      localidad: obrero.localidad?.nombre || "",
      dni: obrero.dniUrl || "",
    });
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="obreros.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
}

async function create(req, res) {
  const { nombre, apellido, especialidad, sueldoSemanal, localidadId, dniUrl } = req.body;

  if (!nombre || !apellido || !especialidad || sueldoSemanal == null || !localidadId) {
    return res
      .status(400)
      .json({ message: "nombre, apellido, especialidad, sueldoSemanal y localidadId son obligatorios" });
  }

  const localidad = await prisma.localidad.findFirst({
    where: { id: Number(localidadId), zona: { empresaId: req.user.empresaId } },
  });
  if (!localidad) {
    return res.status(404).json({ message: "Localidad no encontrada" });
  }

  const obrero = await prisma.obrero.create({
    data: {
      empresaId: req.user.empresaId,
      nombre,
      apellido,
      especialidad,
      sueldoSemanal: Number(sueldoSemanal),
      localidadId: localidad.id,
      dniUrl: dniUrl || null,
    },
    include: OBRERO_INCLUDE,
  });

  return res.status(201).json({ obrero });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const { nombre, apellido, especialidad, sueldoSemanal, localidadId, dniUrl } = req.body;

  const existente = await prisma.obrero.findFirst({ where: scopedWhere(req, { id }) });
  if (!existente) {
    return res.status(404).json({ message: "Obrero no encontrado" });
  }

  if (localidadId != null) {
    const localidad = await prisma.localidad.findFirst({
      where: { id: Number(localidadId), zona: { empresaId: req.user.empresaId } },
    });
    if (!localidad) {
      return res.status(404).json({ message: "Localidad no encontrada" });
    }
  }

  const obrero = await prisma.obrero.update({
    where: { id },
    data: {
      nombre,
      apellido,
      especialidad,
      sueldoSemanal: sueldoSemanal != null ? Number(sueldoSemanal) : undefined,
      localidadId: localidadId != null ? Number(localidadId) : undefined,
      dniUrl: dniUrl !== undefined ? dniUrl || null : undefined,
    },
    include: OBRERO_INCLUDE,
  });

  return res.json({ obrero });
}

async function remove(req, res) {
  const id = Number(req.params.id);

  const existente = await prisma.obrero.findFirst({ where: scopedWhere(req, { id }) });
  if (!existente) {
    return res.status(404).json({ message: "Obrero no encontrado" });
  }

  await prisma.obrero.delete({ where: { id } });

  return res.status(204).send();
}

module.exports = {
  list,
  exportarObreros,
  create,
  update,
  remove,
};
