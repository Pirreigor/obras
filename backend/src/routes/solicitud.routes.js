const { Router } = require("express");

const { list, create, updateEstado } = require("../controllers/solicitud.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireVista } = require("../middleware/vista.middleware");

const router = Router();

router.use(requireAuth, requireVista("pedidos"));

router.get("/", list);
// La autorizacion real (Administrador/Supervisor, o el residente/calidad
// asignado a esa sub-obra puntual) se valida dentro del controller.
router.post("/", create);
router.patch("/:id", requireRole("ADMINISTRADOR", "SUPERVISOR"), updateEstado);

module.exports = router;
