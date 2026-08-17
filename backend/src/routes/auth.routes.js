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
const { requireVista } = require("../middleware/vista.middleware");

const router = Router();

router.post("/login", login);
router.post("/aceptar-invitacion", aceptarInvitacion);
router.get("/me", requireAuth, me);
router.post("/invitaciones", requireAuth, requireVista("equipo"), crearInvitacion);
router.get("/invitaciones", requireAuth, requireVista("equipo"), listInvitaciones);
router.delete("/invitaciones/:id", requireAuth, requireVista("equipo"), revocarInvitacion);

module.exports = router;
