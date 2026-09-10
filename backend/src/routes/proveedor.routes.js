const { Router } = require("express");

const { list, create, update, remove } = require("../controllers/proveedor.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireVista } = require("../middleware/vista.middleware");

const router = Router();

router.use(requireAuth);

// Ver el listado no depende de la vista "proveedores": cualquiera que
// agrupe solicitudes en un Pedido necesita poder elegir un proveedor de
// la lista. Cargar uno nuevo si esta abierto a quien tenga esa vista
// asignada; editar/eliminar sigue acotado a Administrador.
router.get("/", list);
router.post("/", requireVista("proveedores"), create);
router.patch("/:id", requireRole("ADMINISTRADOR"), update);
router.delete("/:id", requireRole("ADMINISTRADOR"), remove);

module.exports = router;
