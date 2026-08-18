const { Router } = require("express");

const { list, create, marcarRecibido } = require("../controllers/pedido.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireVista } = require("../middleware/vista.middleware");

const router = Router();

router.use(requireAuth, requireVista("pedidos"));

router.get("/", list);
router.post("/", requireRole("ADMINISTRADOR", "SUPERVISOR"), create);
router.patch("/:id/recibido", requireRole("ADMINISTRADOR", "SUPERVISOR"), marcarRecibido);

module.exports = router;
