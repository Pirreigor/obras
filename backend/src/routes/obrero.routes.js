const { Router } = require("express");

const { list, create, update, remove, exportarObreros } = require("../controllers/obrero.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireVista } = require("../middleware/vista.middleware");

const router = Router();

router.use(requireAuth, requireVista("obreros"));

router.get("/", list);
router.get("/exportar", exportarObreros);
// Registrar un obrero nuevo esta abierto a cualquiera con la vista
// "obreros" asignada; editar/eliminar sigue acotado a Administrador.
router.post("/", create);
router.patch("/:id", requireRole("ADMINISTRADOR"), update);
router.delete("/:id", requireRole("ADMINISTRADOR"), remove);

module.exports = router;
