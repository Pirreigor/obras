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
  exportarAvances,
  createAvance,
} = require("../controllers/subObra.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

router.use(requireAuth);

router.get("/mias", listMias);

router.get("/:id", getById);
// La autorizacion (Administrador/Supervisor o el residente lider de la
// obra duena de esta sub-obra) se valida dentro del controller.
router.patch("/:id", update);
router.delete("/:id", remove);

router.get("/:id/actividades", listActividades);
// La autorizacion real (Administrador/Supervisor, o el residente/calidad
// asignado a esta sub-obra puntual) se valida dentro del controller.
router.post("/:id/actividades", createActividad);
router.patch("/:id/actividades/:actividadId", updateActividad);
router.post("/:id/actividades/:actividadId/cerrar", cerrarActividad);

router.get("/:id/avances", listAvances);
router.get("/:id/avances/exportar", exportarAvances);
router.post("/:id/avances", requireRole("ADMINISTRADOR", "RESIDENTE", "CALIDAD_PRODUCCION"), createAvance);

module.exports = router;
