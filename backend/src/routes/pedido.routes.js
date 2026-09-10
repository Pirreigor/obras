const { Router } = require("express");

const { list, create, update, marcarRecibido } = require("../controllers/pedido.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = Router();

router.use(requireAuth);

// El alcance de "list" y la autorizacion real de "create"/"update"/
// "recibido" (Administrador/Supervisor, o el residente lider de las
// obras involucradas) se resuelven dentro del controller.
router.get("/", list);
router.post("/", create);
router.patch("/:id", update);
router.patch("/:id/recibido", marcarRecibido);

module.exports = router;
