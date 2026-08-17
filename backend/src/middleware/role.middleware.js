function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ message: "No tienes permisos" });
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
