const { Router } = require("express");

const {
  list,
  create,
  listLocalidades,
  createLocalidad,
} = require("../controllers/zona.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireVista } = require("../middleware/vista.middleware");

const router = Router();

router.use(requireAuth, requireVista("obras"));

router.get("/", list);
router.post("/", requireRole("ADMINISTRADOR"), create);

router.get("/:id/localidades", listLocalidades);
router.post("/:id/localidades", requireRole("ADMINISTRADOR"), createLocalidad);

module.exports = router;
