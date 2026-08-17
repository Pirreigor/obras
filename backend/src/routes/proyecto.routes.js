const { Router } = require("express");

const {
  list,
  getById,
  create,
  update,
  remove,
  listAvances,
  createAvance,
} = require("../controllers/proyecto.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

router.use(requireAuth);

router.get("/", list);
router.get("/:id", getById);
router.post("/", requireRole("ADMINISTRADOR"), create);
router.patch("/:id", requireRole("ADMINISTRADOR"), update);
router.delete("/:id", requireRole("ADMINISTRADOR"), remove);

router.get("/:id/avances", listAvances);
router.post("/:id/avances", createAvance);

module.exports = router;
