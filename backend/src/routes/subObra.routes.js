const { Router } = require("express");

const {
  listMias,
  getById,
  update,
  remove,
  listActividades,
  createActividad,
  updateActividad,
  cerrarActividad,
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
// La autorizacion real (Administrador/Supervisor, o el residente/calidad
// asignado a esta sub-obra puntual) se valida dentro del controller.
router.post("/:id/actividades", createActividad);
router.patch("/:id/actividades/:actividadId", updateActividad);
router.post("/:id/actividades/:actividadId/cerrar", cerrarActividad);

router.get("/:id/avances", listAvances);
router.post("/:id/avances", requireRole("ADMINISTRADOR", "RESIDENTE", "CALIDAD_PRODUCCION"), createAvance);

module.exports = router;
