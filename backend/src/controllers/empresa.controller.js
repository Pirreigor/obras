const prisma = require("../utils/prisma");
const { hashPassword } = require("../utils/hash");

async function list(req, res) {
  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: "desc" },
  });

  return res.json({ empresas });
}

async function create(req, res) {
  const { nombre, adminName, adminEmail, adminPassword } = req.body;

  if (!nombre || !adminName || !adminEmail || !adminPassword) {
    return res
      .status(400)
      .json({ message: "nombre, adminName, adminEmail y adminPassword son obligatorios" });
  }

  const existingUser = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (existingUser) {
    return res.status(409).json({ message: "El email ya esta en uso" });
  }

  const adminPasswordHash = await hashPassword(adminPassword);

  const empresa = await prisma.$transaction(async (tx) => {
    const nuevaEmpresa = await tx.empresa.create({ data: { nombre } });

    await tx.usuario.create({
      data: {
        empresaId: nuevaEmpresa.id,
        name: adminName,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        rol: "ADMINISTRADOR",
      },
    });

    return nuevaEmpresa;
  });

  return res.status(201).json({ empresa });
}

module.exports = {
  list,
  create,
};
