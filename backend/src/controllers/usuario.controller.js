const prisma = require("../utils/prisma");

async function list(req, res) {
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: req.user.empresaId },
    select: { id: true, name: true, email: true, rol: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ usuarios });
}

module.exports = {
  list,
};
