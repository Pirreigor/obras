const { Router } = require("express");

const {
  listMias,
  getById,
  update,
  remove,
  listActividades,
  createActividad,
  listAvances,
  createAvance,
} = require("../controllers/subObra.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

router.use(requireAuth);

router.get("/mias", listMias);

router.get("/:id", getById);
router.patch("/:id", requireRole("ADMINISTRADOR"), update);
router.delete("/:id", requireRole("ADMINISTRADOR"), remove);

router.get("/:id/actividades", listActividades);
router.post("/:id/actividades", requireRole("ADMINISTRADOR"), createActividad);

router.get("/:id/avances", listAvances);
router.post("/:id/avances", requireRole("ADMINISTRADOR", "RESIDENTE", "CALIDAD_PRODUCCION"), createAvance);

module.exports = router;
