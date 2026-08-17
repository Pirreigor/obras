const { Router } = require("express");

const {
  list,
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

router.use(requireAuth, requireVista("obras"));

router.get("/", list);
router.get("/:id", getById);
router.post("/", requireRole("ADMINISTRADOR"), create);
router.patch("/:id", requireRole("ADMINISTRADOR"), update);
router.delete("/:id", requireRole("ADMINISTRADOR"), remove);

router.get("/:id/sub-obras", listSubObras);
router.post("/:id/sub-obras", requireRole("ADMINISTRADOR"), createSubObra);

module.exports = router;
