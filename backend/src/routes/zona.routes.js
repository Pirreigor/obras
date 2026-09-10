const { Router } = require("express");

const {
  list,
  create,
  listLocalidades,
  createLocalidad,
} = require("../controllers/zona.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

// La lectura de zonas/localidades es solo referencia geografica (sin
// datos sensibles) y la usan otras pantallas ademas de Obras (ej.
// Obreros), asi que queda abierta a cualquier usuario autenticado.
// Crear zonas/localidades nuevas sigue acotado a Administrador.
router.use(requireAuth);

router.get("/", list);
router.post("/", requireRole("ADMINISTRADOR"), create);

router.get("/:id/localidades", listLocalidades);
router.post("/:id/localidades", requireRole("ADMINISTRADOR"), createLocalidad);

module.exports = router;
