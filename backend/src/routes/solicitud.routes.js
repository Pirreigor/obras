const { Router } = require("express");

const { list, create, updateEstado } = require("../controllers/solicitud.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = Router();

router.use(requireAuth);

// No hay gate por rol/vista a nivel de ruta: el alcance de "list" y la
// autorizacion real de "create"/"updateEstado" (Administrador/Supervisor,
// el residente/calidad asignado a esa sub-obra, o el residente lider de
// la obra) se resuelven dentro del controller.
router.get("/", list);
router.post("/", create);
router.patch("/:id", updateEstado);

module.exports = router;
