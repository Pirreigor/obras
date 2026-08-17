const { Router } = require("express");

const { list, getVistas, setVistas } = require("../controllers/usuario.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireVista } = require("../middleware/vista.middleware");

const router = Router();

router.use(requireAuth);

router.get("/", requireVista("equipo"), list);
router.get("/:id/vistas", requireRole("ADMINISTRADOR"), getVistas);
router.put("/:id/vistas", requireRole("ADMINISTRADOR"), setVistas);

module.exports = router;
