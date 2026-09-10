const { Router } = require("express");

const {
  list,
  listMias,
  listUsuariosDisponibles,
  getById,
  create,
  update,
  remove,
  listSubObras,
  createSubObra,
} = require("../controllers/obra.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireVista } = require("../middleware/vista.middleware");

const router = Router();

router.use(requireAuth);

// Las obras que el usuario lidera (Obra.residenteId): no necesita la
// vista "obras", le alcanza para crear/gestionar sus propias sub-obras.
router.get("/mias", listMias);
router.get("/usuarios-disponibles", listUsuariosDisponibles);

router.get("/", requireVista("obras"), list);
router.post("/", requireVista("obras"), requireRole("ADMINISTRADOR"), create);
router.patch("/:id", requireRole("ADMINISTRADOR"), update);
router.delete("/:id", requireRole("ADMINISTRADOR"), remove);

// Ver el detalle/sub-obras de UNA obra puntual y crear sub-obras en
// ella no exige la vista "obras": el controller valida ahi mismo si el
// usuario es Administrador/Supervisor, tiene la vista, o es el
// residente lider de esa obra especifica.
router.get("/:id", getById);
router.get("/:id/sub-obras", listSubObras);
router.post("/:id/sub-obras", createSubObra);

module.exports = router;
