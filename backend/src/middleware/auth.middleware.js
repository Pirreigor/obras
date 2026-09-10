const { verifyAccessToken } = require("../utils/jwt");
const prisma = require("../utils/prisma");

// El token dura 7 dias y solo identifica al usuario (id); el rol y la
// empresa se leen siempre de la base en cada request, para que un
// cambio de cargo hecho en Equipo tenga efecto inmediato y no recien
// cuando esa persona vuelva a iniciar sesion.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "No autorizado" });
  }

  try {
    const payload = verifyAccessToken(token);
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { id: true, rol: true, empresaId: true, email: true },
    });
    if (!usuario) {
      return res.status(401).json({ message: "Token invalido o expirado" });
    }
    req.user = usuario;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalido o expirado" });
  }
}

module.exports = {
  requireAuth,
};
