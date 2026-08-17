const prisma = require("../utils/prisma");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signAccessToken } = require("../utils/jwt");

async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email y password son obligatorios" });
  }

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "El email ya esta en uso" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.usuario.create({
    data: {
      name,
      email,
      passwordHash,
      rol: "SUPERVISOR",
    },
    select: {
      id: true,
      name: true,
      email: true,
      rol: true,
    },
  });

  const token = signAccessToken({ id: user.id, rol: user.rol, email: user.email });

  return res.status(201).json({ user, token });
}

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

  const token = signAccessToken({ id: user.id, rol: user.rol, email: user.email });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      rol: user.rol,
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
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  return res.json({ user });
}

module.exports = {
  register,
  login,
  me,
};
