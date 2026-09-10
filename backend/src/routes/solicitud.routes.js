const { Router } = require("express");

const { list, create, updateEstado, crearRecepcion } = require("../controllers/solicitud.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = Router();

router.use(requireAuth);

// No hay gate por rol/vista a nivel de ruta: el alcance de "list" y la
// autorizacion real de "create"/"updateEstado"/"recepciones"
// (Administrador/Supervisor, el residente/calidad asignado a esa
// sub-obra, el residente lider de la obra, o el Almacenero para las
// recepciones) se resuelven dentro del controller.
router.get("/", list);
router.post("/", create);
router.patch("/:id", updateEstado);
router.post("/:id/recepciones", crearRecepcion);

module.exports = router;
