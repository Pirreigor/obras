const prisma = require("../utils/prisma");

async function list(req, res) {
  const vistas = await prisma.vista.findMany({ orderBy: { nombre: "asc" } });

  return res.json({ vistas });
}

module.exports = {
  list,
};
