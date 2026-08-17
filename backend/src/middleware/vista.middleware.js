const prisma = require("../utils/prisma");

function requireVista(clave) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    // ADMINISTRADOR siempre tiene acceso total dentro de su empresa: si no,
    // nadie podria abrir la pantalla de asignacion de vistas.
    if (req.user.rol === "ADMINISTRADOR") {
      return next();
    }

    const asignada = await prisma.usuarioVista.findFirst({
      where: { usuarioId: req.user.id, vista: { clave } },
    });

    if (!asignada) {
      return res.status(403).json({ message: "No tienes acceso a esta vista" });
    }

    return next();
  };
}

module.exports = {
  requireVista,
};
