const { Router } = require("express");

const {
  login,
  me,
  crearInvitacion,
  listInvitaciones,
  revocarInvitacion,
  aceptarInvitacion,
} = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

router.post("/login", login);
router.post("/aceptar-invitacion", aceptarInvitacion);
router.get("/me", requireAuth, me);
router.post("/invitaciones", requireAuth, requireRole("ADMINISTRADOR", "SUPERVISOR"), crearInvitacion);
router.get("/invitaciones", requireAuth, requireRole("ADMINISTRADOR", "SUPERVISOR"), listInvitaciones);
router.delete("/invitaciones/:id", requireAuth, requireRole("ADMINISTRADOR", "SUPERVISOR"), revocarInvitacion);

module.exports = router;
