const crypto = require("crypto");

const prisma = require("../utils/prisma");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signAccessToken } = require("../utils/jwt");

const INVITACION_VIGENCIA_DIAS = 7;
const ROLES_INVITABLES = ["ADMINISTRADOR", "SUPERVISOR", "RESIDENTE", "CALIDAD_PRODUCCION"];

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email y password son obligatorios" });
  }

  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Credenciales invalidas" });
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Credenciales invalidas" });
  }

  const token = signAccessToken({ id: user.id, rol: user.rol, empresaId: user.empresaId, email: user.email });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      rol: user.rol,
      empresaId: user.empresaId,
    },
    token,
  });
}

async function me(req, res) {
  const user = await prisma.usuario.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      rol: true,
      empresaId: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  return res.json({ user });
}

async function crearInvitacion(req, res) {
  const { email, rol } = req.body;

  if (!email || !rol) {
    return res.status(400).json({ message: "email y rol son obligatorios" });
  }

  if (!ROLES_INVITABLES.includes(rol)) {
    return res.status(400).json({ message: `rol debe ser uno de: ${ROLES_INVITABLES.join(", ")}` });
  }

  const existingUser = await prisma.usuario.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ message: "El email ya esta en uso" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITACION_VIGENCIA_DIAS * 24 * 60 * 60 * 1000);

  const invitacion = await prisma.invitacion.create({
    data: {
      empresaId: req.user.empresaId,
      email,
      rol,
      token,
      expiresAt,
      invitadoPorId: req.user.id,
    },
  });

  // TODO: enviar el correo de invitacion una vez que se elija un proveedor de email.
  // Por ahora se devuelve el token para poder probar el flujo manualmente.
  return res.status(201).json({ invitacion });
}

async function listInvitaciones(req, res) {
  const invitaciones = await prisma.invitacion.findMany({
    where: { empresaId: req.user.empresaId },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ invitaciones });
}

async function revocarInvitacion(req, res) {
  const id = Number(req.params.id);

  const invitacion = await prisma.invitacion.findFirst({
    where: { id, empresaId: req.user.empresaId },
  });
  if (!invitacion) {
    return res.status(404).json({ message: "Invitacion no encontrada" });
  }

  if (invitacion.estado !== "PENDIENTE") {
    return res.status(400).json({ message: "Solo se puede revocar una invitacion pendiente" });
  }

  await prisma.invitacion.update({ where: { id }, data: { estado: "REVOCADA" } });

  return res.status(204).send();
}

async function aceptarInvitacion(req, res) {
  const { token, name, password } = req.body;

  if (!token || !name || !password) {
    return res.status(400).json({ message: "token, name y password son obligatorios" });
  }

  const invitacion = await prisma.invitacion.findUnique({ where: { token } });

  if (!invitacion || invitacion.estado !== "PENDIENTE") {
    return res.status(400).json({ message: "Invitacion invalida" });
  }

  if (invitacion.expiresAt < new Date()) {
    await prisma.invitacion.update({ where: { id: invitacion.id }, data: { estado: "EXPIRADA" } });
    return res.status(400).json({ message: "Invitacion expirada" });
  }

  const existingUser = await prisma.usuario.findUnique({ where: { email: invitacion.email } });
  if (existingUser) {
    return res.status(409).json({ message: "El email ya esta en uso" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const nuevoUsuario = await tx.usuario.create({
      data: {
        empresaId: invitacion.empresaId,
        name,
        email: invitacion.email,
        passwordHash,
        rol: invitacion.rol,
      },
    });

    await tx.invitacion.update({ where: { id: invitacion.id }, data: { estado: "ACEPTADA" } });

    return nuevoUsuario;
  });

  const accessToken = signAccessToken({ id: user.id, rol: user.rol, empresaId: user.empresaId, email: user.email });

  return res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      rol: user.rol,
      empresaId: user.empresaId,
    },
    token: accessToken,
  });
}

module.exports = {
  login,
  me,
  crearInvitacion,
  listInvitaciones,
  revocarInvitacion,
  aceptarInvitacion,
};
